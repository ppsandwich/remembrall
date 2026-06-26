import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const QUOTA_BYTES = 2 * 1024 * 1024 * 1024; // 2 GB

const ALLOWED_MIME_PREFIXES = [
  "image/",
  "application/pdf",
  "text/",
  "audio/",
  "video/",
  "application/zip",
  "application/json",
  "application/msword",
  "application/vnd.openxmlformats-officedocument",
  "application/vnd.ms-excel",
  "application/vnd.ms-powerpoint",
];

function corsHeaders(req: Request) {
  const origin = req.headers.get("Origin") || "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Max-Age": "86400",
  };
}

function jsonResp(
  req: Request,
  body: Record<string, unknown>,
  status = 200
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), "Content-Type": "application/json" },
  });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function base64Encode(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function base64url(buf: ArrayBuffer | Uint8Array): string {
  return base64Encode(buf).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function importPrivateKey(pem: string): Promise<CryptoKey> {
  const raw = pem
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s+/g, "");
  const binary = Uint8Array.from(atob(raw), (c) => c.charCodeAt(0));
  return crypto.subtle.importKey(
    "pkcs8",
    binary,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );
}

async function signData(privateKey: CryptoKey, data: string): Promise<string> {
  const sig = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    privateKey,
    new TextEncoder().encode(data)
  );
  return base64Encode(sig);
}

// ---------------------------------------------------------------------------
// Service account OAuth2 access token (for GCS JSON API calls like delete)
// ---------------------------------------------------------------------------

async function getServiceAccountAccessToken(saKeyJson: Record<string, string>): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(new TextEncoder().encode(JSON.stringify({ alg: "RS256", typ: "JWT" })));
  const claims = base64url(
    new TextEncoder().encode(
      JSON.stringify({
        iss: saKeyJson.client_email,
        scope: "https://www.googleapis.com/auth/devstorage.full_control",
        aud: "https://oauth2.googleapis.com/token",
        iat: now,
        exp: now + 3600,
      })
    )
  );
  const signingInput = `${header}.${claims}`;
  const key = await importPrivateKey(saKeyJson.private_key);
  const sig = await signData(key, signingInput);
  const jwt = `${signingInput}.${sig.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")}`;

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  if (!tokenRes.ok) {
    throw new Error(`Failed to get access token: ${tokenRes.status}`);
  }

  const { access_token } = await tokenRes.json();
  return access_token;
}

// ---------------------------------------------------------------------------
// POST policy for direct browser upload to GCS
// ---------------------------------------------------------------------------

async function generatePostPolicy(opts: {
  bucket: string;
  object: string;
  contentType: string;
  saKeyJson: Record<string, string>;
  expiresIn?: number;
}) {
  const { bucket, object, contentType, saKeyJson, expiresIn = 900 } = opts;
  const expiration = new Date(Date.now() + expiresIn * 1000).toISOString();

  const conditions = [
    ["starts-with", "$key", ""],
    ["eq", "$Content-Type", contentType],
    ["content-length-range", 1, MAX_FILE_SIZE],
  ];

  const policy = {
    expiration,
    conditions,
  };

  const policyBase64 = btoa(JSON.stringify(policy));

  const key = await importPrivateKey(saKeyJson.private_key);
  const signature = await signData(key, policyBase64);

  return {
    url: `https://storage.googleapis.com/${bucket}`,
    fields: {
      key: object,
      "Content-Type": contentType,
      GoogleAccessId: saKeyJson.client_email,
      policy: policyBase64,
      signature,
    },
  };
}

// ---------------------------------------------------------------------------

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(req) });
  }

  try {
    // --- Auth ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResp(req, { error: "Missing authorization" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return jsonResp(req, { error: "Not authenticated" }, 401);
    }

    // --- Parse body ---
    const { action, filename, contentType, noteId, gcsObjectPath } =
      await req.json();

    if (!action) return jsonResp(req, { error: "Missing action" }, 400);

    const bucket = Deno.env.get("GCS_BUCKET_NAME")!;
    const saKeyJson = JSON.parse(Deno.env.get("GCS_SERVICE_ACCOUNT_KEY")!);

    // --- Upload (POST policy) ---
    if (action === "upload") {
      if (!filename || !contentType || !noteId) {
        return jsonResp(req, { error: "Missing filename, contentType, or noteId" }, 400);
      }

      const allowed = ALLOWED_MIME_PREFIXES.some((p) => contentType.startsWith(p));
      if (!allowed) {
        return jsonResp(req, { error: `File type not allowed: ${contentType}` }, 400);
      }

      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );

      const { data: usage } = await supabaseAdmin
        .from("user_storage_usage")
        .select("total_bytes")
        .eq("user_id", user.id)
        .maybeSingle();

      const currentBytes = usage?.total_bytes ?? 0;
      if (currentBytes >= QUOTA_BYTES) {
        return jsonResp(req, { error: "Storage quota exceeded (2 GB limit)" }, 403);
      }

      const sanitized = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
      const attachmentId = crypto.randomUUID();
      const objectPath = `${user.id}/${noteId}/${attachmentId}/${sanitized}`;

      const policy = await generatePostPolicy({
        bucket,
        object: objectPath,
        contentType,
        saKeyJson,
      });

      return jsonResp(req, {
        uploadUrl: policy.url,
        fields: policy.fields,
        gcsObjectPath: objectPath,
        attachmentId,
      });
    }

    // --- Download (access token) ---
    if (action === "download") {
      if (!gcsObjectPath) {
        return jsonResp(req, { error: "Missing gcsObjectPath" }, 400);
      }

      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );

      const { data: attachment } = await supabaseAdmin
        .from("note_attachments")
        .select("user_id")
        .eq("gcs_object_path", gcsObjectPath)
        .maybeSingle();

      if (!attachment || attachment.user_id !== user.id) {
        return jsonResp(req, { error: "Not found" }, 404);
      }

      const accessToken = await getServiceAccountAccessToken(saKeyJson);
      const downloadUrl = `https://storage.googleapis.com/${bucket}/${gcsObjectPath}`;

      return jsonResp(req, {
        downloadUrl,
        accessToken,
        expiresIn: 3600,
      });
    }

    // --- Delete ---
    if (action === "delete") {
      if (!gcsObjectPath) {
        return jsonResp(req, { error: "Missing gcsObjectPath" }, 400);
      }

      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );

      const { data: attachment } = await supabaseAdmin
        .from("note_attachments")
        .select("user_id")
        .eq("gcs_object_path", gcsObjectPath)
        .maybeSingle();

      if (!attachment || attachment.user_id !== user.id) {
        return jsonResp(req, { error: "Not found" }, 404);
      }

      const accessToken = await getServiceAccountAccessToken(saKeyJson);
      const encodedPath = gcsObjectPath.split("/").map(encodeURIComponent).join("/");
      const deleteRes = await fetch(
        `https://storage.googleapis.com/storage/v1/b/${bucket}/o/${encodedPath}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      if (!deleteRes.ok && deleteRes.status !== 404) {
        console.error("GCS delete failed:", deleteRes.status, await deleteRes.text());
        return jsonResp(req, { error: "Failed to delete from storage" }, 500);
      }

      return jsonResp(req, { success: true });
    }

    return jsonResp(req, { error: `Unknown action: ${action}` }, 400);
  } catch (err) {
    console.error("get-signed-url error:", err);
    return jsonResp(req, { error: err instanceof Error ? err.message : "Internal server error" }, 500);
  }
});
