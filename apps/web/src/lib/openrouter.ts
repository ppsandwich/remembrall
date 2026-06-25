const BASE = "https://openrouter.ai/api/v1";

export async function testApiKey(apiKey: string): Promise<boolean> {
  try {
    const res = await fetch(`${BASE}/models`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function transcribeAudio(apiKey: string, blob: Blob): Promise<string> {
  const form = new FormData();
  const ext = blob.type.includes("webm") ? "webm" : "mp4";
  form.append("file", blob, `recording.${ext}`);
  form.append("model", "openai/whisper-1");

  const res = await fetch(`${BASE}/audio/transcriptions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });

  if (!res.ok) {
    throw new Error(`Transcription failed: ${res.status}`);
  }

  const data = await res.json();
  return (data.text as string).trim();
}
