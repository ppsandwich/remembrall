const BASE = "https://openrouter.ai/api/v1";

export type AIActionId =
  | "summarize"
  | "rewrite-tone"
  | "expand"
  | "translate"
  | "fix-grammar"
  | "extract-key-points";

export interface AIAction {
  id: AIActionId;
  label: string;
  shortcut?: string;
  prompt: (text: string) => string;
}

export const AI_ACTIONS: AIAction[] = [
  {
    id: "summarize",
    label: "Summarize",
    shortcut: "/summarize",
    prompt: (text) =>
      `Summarize the following text concisely. Return only the summary, no preamble:\n\n${text}`,
  },
  {
    id: "rewrite-tone",
    label: "Rewrite tone",
    shortcut: "/rewrite",
    prompt: (text) =>
      `Rewrite the following text in a professional, clear tone. Return only the rewritten text, no preamble:\n\n${text}`,
  },
  {
    id: "expand",
    label: "Expand bullets",
    shortcut: "/expand",
    prompt: (text) =>
      `Expand the following bullet points or shorthand notes into full, well-written sentences and paragraphs. Return only the expanded text, no preamble:\n\n${text}`,
  },
  {
    id: "translate",
    label: "Translate to English",
    shortcut: "/translate",
    prompt: (text) =>
      `Translate the following text to English. If it is already English, translate to Spanish. Return only the translated text, no preamble:\n\n${text}`,
  },
  {
    id: "fix-grammar",
    label: "Fix grammar",
    shortcut: "/fix",
    prompt: (text) =>
      `Fix all grammar, spelling, and punctuation errors in the following text. Preserve the original meaning and tone. Return only the corrected text, no preamble:\n\n${text}`,
  },
  {
    id: "extract-key-points",
    label: "Extract key points",
    shortcut: "/keypoints",
    prompt: (text) =>
      `Extract the key points from the following text as a concise bullet list. Return only the bullet list, no preamble:\n\n${text}`,
  },
];

export async function runAIAction(
  apiKey: string,
  actionId: AIActionId,
  text: string,
  signal?: AbortSignal,
): Promise<string> {
  const action = AI_ACTIONS.find((a) => a.id === actionId);
  if (!action) throw new Error(`Unknown action: ${actionId}`);

  const res = await fetch(`${BASE}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.0-flash-001",
      messages: [{ role: "user", content: action.prompt(text) }],
      temperature: 0.3,
      max_tokens: 2048,
    }),
    signal,
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`AI action failed (${res.status}): ${body.slice(0, 200)}`);
  }

  const data = await res.json();
  const content: string = data.choices?.[0]?.message?.content ?? "";
  return content.trim();
}
