const HTML_TAG_RE = /<[a-z][\s\S]*>/i;
const TAG_TOKEN_RE = /(?:^|\s)#[a-zA-Z0-9_-]+/g;

export function isHtml(body: string): boolean {
  return HTML_TAG_RE.test(body);
}

export function plainTextToHtml(text: string): string {
  if (!text.trim()) return "";
  const paragraphs = text.split(/\n{2,}/);
  return paragraphs
    .map((p) => {
      const lines = p.split("\n");
      return `<p>${lines.join("<br>")}</p>`;
    })
    .join("");
}

export function htmlToPlainText(html: string): string {
  if (!html || !isHtml(html)) return html;

  let text = html;
  text = text.replace(/<div[^>]*class="checklist-item"[^>]*data-checked="true"[^>]*>(.*?)<\/div>/gi, "[x] $1\n");
  text = text.replace(/<div[^>]*class="checklist-item"[^>]*data-checked="false"[^>]*>(.*?)<\/div>/gi, "[ ] $1\n");
  text = text.replace(/<\/li>/gi, "\n");
  text = text.replace(/<br\s*\/?>/gi, "\n");
  text = text.replace(/<\/p>/gi, "\n\n");
  text = text.replace(/<\/div>/gi, "\n");
  text = text.replace(/<li[^>]*>/gi, "• ");
  text = text.replace(/<[^>]+>/g, "");
  text = text.replace(/&nbsp;/g, " ");
  text = text.replace(/&amp;/g, "&");
  text = text.replace(/&lt;/g, "<");
  text = text.replace(/&gt;/g, ">");
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/\u200B/g, "");
  text = text.replace(/\n{3,}/g, "\n\n");
  return text.trim();
}

export function derivePreviewFromHtml(html: string): string {
  const plain = htmlToPlainText(html);
  if (!plain) return "Empty note";
  const lines = plain.split("\n").slice(0, 7);
  const preview = lines.join("\n").trim();
  if (!preview) return "Empty note";
  return preview.length > 280 ? preview.slice(0, 280) + "…" : preview;
}

export function stripTagsFromHtml(html: string): string {
  if (!isHtml(html)) {
    return html.replace(TAG_TOKEN_RE, "").replace(/\n{3,}/g, "\n\n").trim();
  }
  const doc = new DOMParser().parseFromString(html, "text/html");
  const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);
  const toRemove: Text[] = [];
  while (walker.nextNode()) {
    const node = walker.currentNode as Text;
    const cleaned = node.textContent?.replace(TAG_TOKEN_RE, "") ?? "";
    if (cleaned !== node.textContent) {
      toRemove.push(node);
    }
  }
  for (const node of toRemove) {
    node.textContent = node.textContent?.replace(TAG_TOKEN_RE, "") ?? "";
  }
  return doc.body.innerHTML.trim();
}
