import { getSupabase } from "./supabaseClient";
import type { Attachment } from "@brall/core";

async function callEdgeFunction(body: Record<string, unknown>) {
  const supabase = getSupabase();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("Not authenticated");

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const res = await fetch(`${supabaseUrl}/functions/v1/get-signed-url`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(body),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || "Edge function error");
  return json;
}

export async function uploadAttachment(
  noteId: string,
  file: File,
  onProgress?: (percent: number) => void,
): Promise<Attachment> {
  const { signedUrl, gcsObjectPath, attachmentId } = await callEdgeFunction({
    action: "upload",
    filename: file.name,
    contentType: file.type || "application/octet-stream",
    noteId,
  });

  await uploadWithProgress(signedUrl, file, onProgress);

  const supabase = getSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("note_attachments")
    .insert({
      id: attachmentId,
      note_id: noteId,
      user_id: user.id,
      filename: file.name,
      mime_type: file.type || "application/octet-stream",
      size_bytes: file.size,
      gcs_object_path: gcsObjectPath,
    })
    .select()
    .single();

  if (error) throw error;
  return data as Attachment;
}

export async function fetchAttachments(noteId: string): Promise<Attachment[]> {
  const { data, error } = await getSupabase()
    .from("note_attachments")
    .select("*")
    .eq("note_id", noteId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as Attachment[];
}

export async function fetchAllAttachments(): Promise<Attachment[]> {
  const { data, error } = await getSupabase()
    .from("note_attachments")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as Attachment[];
}

export async function downloadAttachment(
  gcsObjectPath: string,
  filename: string,
): Promise<void> {
  const { signedUrl } = await callEdgeFunction({
    action: "download",
    gcsObjectPath,
  });

  const a = document.createElement("a");
  a.href = signedUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export async function deleteAttachment(attachmentId: string, gcsObjectPath: string): Promise<void> {
  // Delete from GCS via edge function (fire and forget — best effort)
  callEdgeFunction({ action: "delete", gcsObjectPath }).catch(() => {});

  const { error } = await getSupabase()
    .from("note_attachments")
    .delete()
    .eq("id", attachmentId);

  if (error) throw error;
}

export async function getUserStorageUsed(): Promise<number> {
  const { data, error } = await getSupabase()
    .from("user_storage_usage")
    .select("total_bytes")
    .maybeSingle();

  if (error) throw error;
  return data?.total_bytes ?? 0;
}

function uploadWithProgress(
  signedUrl: string,
  file: File,
  onProgress?: (percent: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", signedUrl);
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Upload failed: ${xhr.status}`));
    };

    xhr.onerror = () => reject(new Error("Upload failed"));
    xhr.send(file);
  });
}
