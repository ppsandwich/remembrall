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
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize) as unknown as number[]);
  }
  const base64 = btoa(binary);
  const format = blob.type.includes("webm") ? "webm" : "mp4";

  const res = await fetch(`${BASE}/audio/transcriptions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "openai/whisper-1",
      input_audio: {
        data: base64,
        format,
      },
    }),
  });

  if (!res.ok) {
    throw new Error(`Transcription failed: ${res.status}`);
  }

  const data = await res.json();
  return (data.text as string).trim();
}
