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
  const { uploadUrl, fields, gcsObjectPath, attachmentId } = await callEdgeFunction({
    action: "upload",
    filename: file.name,
    contentType: file.type || "application/octet-stream",
    noteId,
  });

  await uploadWithPostPolicy(uploadUrl, fields, file, onProgress);

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
  const { downloadUrl, accessToken } = await callEdgeFunction({
    action: "download",
    gcsObjectPath,
  });

  const res = await fetch(downloadUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) throw new Error(`Download failed: ${res.status}`);

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function deleteAttachment(attachmentId: string, gcsObjectPath: string): Promise<void> {
  await callEdgeFunction({ action: "delete", gcsObjectPath });

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

export async function deleteAttachmentsForNote(noteId: string): Promise<void> {
  const supabase = getSupabase();
  const { data: attachments } = await supabase
    .from("note_attachments")
    .select("id, gcs_object_path")
    .eq("note_id", noteId);

  if (!attachments || attachments.length === 0) return;

  // Delete GCS objects in parallel (best-effort)
  await Promise.allSettled(
    attachments.map((att) =>
      callEdgeFunction({ action: "delete", gcsObjectPath: att.gcs_object_path })
    )
  );

  // Delete DB rows
  const { error } = await supabase
    .from("note_attachments")
    .delete()
    .eq("note_id", noteId);

  if (error) throw error;
}

export async function cloneAttachmentsForNote(
  sourceNoteId: string,
  targetNoteId: string,
): Promise<Attachment[]> {
  const supabase = getSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: sourceAttachments } = await supabase
    .from("note_attachments")
    .select("filename, mime_type, size_bytes, gcs_object_path")
    .eq("note_id", sourceNoteId);

  if (!sourceAttachments || sourceAttachments.length === 0) return [];

  const rows = sourceAttachments.map((att) => ({
    note_id: targetNoteId,
    user_id: user.id,
    filename: att.filename,
    mime_type: att.mime_type,
    size_bytes: att.size_bytes,
    gcs_object_path: att.gcs_object_path,
  }));

  const { data: inserted, error } = await supabase
    .from("note_attachments")
    .insert(rows)
    .select();

  if (error) throw error;
  return (inserted ?? []) as Attachment[];
}

function uploadWithPostPolicy(
  uploadUrl: string,
  fields: Record<string, string>,
  file: File,
  onProgress?: (percent: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    for (const [key, value] of Object.entries(fields)) {
      form.append(key, value);
    }
    // File must be last
    form.append("file", file);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", uploadUrl);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Upload failed: ${xhr.status} ${xhr.statusText}`));
    };

    xhr.onerror = () => reject(new Error("Upload failed — network error"));
    xhr.send(form);
  });
}
