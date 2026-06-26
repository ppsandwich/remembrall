import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const QUOTA_BYTES = 2 * 1024 * 1024 * 1024; // 2 GB
const SIGNED_URL_EXPIRY_SECONDS = 900; // 15 minutes

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
// GCS V4 signed URL helpers (pure Deno, no SDK required)
// ---------------------------------------------------------------------------

function base64url(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
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

async function sign(privateKey: CryptoKey, data: string): Promise<string> {
  const sig = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    privateKey,
    new TextEncoder().encode(data)
  );
  return base64url(sig);
}

function toAmzDate(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

async function generateSignedUrl(opts: {
  method: "PUT" | "GET";
  bucket: string;
  object: string;
  contentType?: string;
  serviceAccountEmail: string;
  privateKey: string;
  expiresIn?: number;
}): Promise<string> {
  const {
    method,
    bucket,
    object,
    contentType,
    serviceAccountEmail,
    privateKey,
    expiresIn = SIGNED_URL_EXPIRY_SECONDS,
  } = opts;

  const now = new Date();
  const dateStamp = toAmzDate(now).slice(0, 8);
  const amzDate = toAmzDate(now);
  const credentialScope = `${dateStamp}/auto/storage/goog4_request`;

  const host = "storage.googleapis.com";
  const canonicalUri = `/${bucket}/${encodeURIComponent(object).replace(/%2F/g, "/")}`;

  const params: Record<string, string> = {
    "X-Goog-Algorithm": "GOOG4-RSA-SHA256",
    "X-Goog-Credential": `${serviceAccountEmail}/${credentialScope}`,
    "X-Goog-Date": amzDate,
    "X-Goog-Expires": String(expiresIn),
    "X-Goog-SignedHeaders": contentType ? "content-type;host" : "host",
  };

  const sortedKeys = Object.keys(params).sort();
  const canonicalQueryString = sortedKeys
    .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`)
    .join("&");

  const canonicalHeaders = contentType
    ? `content-type:${contentType}\nhost:${host}\n`
    : `host:${host}\n`;
  const signedHeaders = contentType ? "content-type;host" : "host";

  const canonicalRequest = [
    method,
    canonicalUri,
    canonicalQueryString,
    canonicalHeaders,
    signedHeaders,
    "UNSIGNED-PAYLOAD",
  ].join("\n");

  const stringToSign = [
    "GOOG4-RSA-SHA256",
    amzDate,
    credentialScope,
    base64url(
      await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(canonicalRequest)
      )
    ),
  ].join("\n");

  const key = await importPrivateKey(privateKey);
  const signature = await sign(key, stringToSign);

  return `https://${host}${canonicalUri}?${canonicalQueryString}&X-Goog-Signature=${signature}`;
}

// ---------------------------------------------------------------------------
// Service account OAuth2 access token (for GCS JSON API calls)
// ---------------------------------------------------------------------------

async function getServiceAccountAccessToken(saKeyJson: Record<string, string>): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const jwtHeader = base64url(new TextEncoder().encode(JSON.stringify({ alg: "RS256", typ: "JWT" })));
  const jwtClaimSet = base64url(
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
  const signingInput = `${jwtHeader}.${jwtClaimSet}`;
  const key = await importPrivateKey(saKeyJson.private_key);
  const sig = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(signingInput)
  );
  const jwt = `${signingInput}.${base64url(sig)}`;

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

    // --- Upload ---
    if (action === "upload") {
      if (!filename || !contentType || !noteId) {
        return jsonResp(req, { error: "Missing filename, contentType, or noteId" }, 400);
      }

      // Validate mime type
      const allowed = ALLOWED_MIME_PREFIXES.some((p) => contentType.startsWith(p));
      if (!allowed) {
        return jsonResp(req, { error: `File type not allowed: ${contentType}` }, 400);
      }

      // Check quota
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

      // Build object path
      const sanitized = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
      const attachmentId = crypto.randomUUID();
      const objectPath = `${user.id}/${noteId}/${attachmentId}/${sanitized}`;

      const signedUrl = await generateSignedUrl({
        method: "PUT",
        bucket,
        object: objectPath,
        contentType,
        serviceAccountEmail: saKeyJson.client_email,
        privateKey: saKeyJson.private_key,
      });

      return jsonResp(req, {
        signedUrl,
        gcsObjectPath: objectPath,
        attachmentId,
        expiresInSeconds: SIGNED_URL_EXPIRY_SECONDS,
      });
    }

    // --- Download ---
    if (action === "download") {
      if (!gcsObjectPath) {
        return jsonResp(req, { error: "Missing gcsObjectPath" }, 400);
      }

      // Verify ownership
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

      const signedUrl = await generateSignedUrl({
        method: "GET",
        bucket,
        object: gcsObjectPath,
        serviceAccountEmail: saKeyJson.client_email,
        privateKey: saKeyJson.private_key,
      });

      return jsonResp(req, {
        signedUrl,
        expiresInSeconds: SIGNED_URL_EXPIRY_SECONDS,
      });
    }

    // --- Delete ---
    if (action === "delete") {
      if (!gcsObjectPath) {
        return jsonResp(req, { error: "Missing gcsObjectPath" }, 400);
      }

      // Verify ownership
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

      // Get OAuth2 access token from service account
      const accessToken = await getServiceAccountAccessToken(saKeyJson);

      // Delete the GCS object
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
    return jsonResp(req, { error: "Internal server error" }, 500);
  }
});
