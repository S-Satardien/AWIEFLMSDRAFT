const ALLOWED_TAGS = new Set([
  "p",
  "br",
  "b",
  "strong",
  "i",
  "em",
  "u",
  "ul",
  "ol",
  "li",
  "code",
  "pre",
  "blockquote",
  "span",
]);

/**
 * Sanitizes rich-text HTML snippets (e.g., quiz question stems) before rendering via DOM.
 * Removes script/iframe/style elements, inline event handlers, and javascript:/data: URLs,
 * preserving only benign text formatting tags.
 *
 * @param html - Untrusted or legacy HTML string.
 * @returns Sanitized safe HTML string.
 */
export function sanitizeHtml(html: string | null | undefined): string {
  if (!html) return "";

  // Strip dangerous container elements completely along with their contents
  let clean = html
    .replace(/<(script|style|iframe|object|embed|svg|form|noscript)[^>]*>[\s\S]*?<\/\1>/gi, "")
    .replace(/<(script|style|iframe|object|embed|svg|form|input|meta|link|base)[^>]*\/?>/gi, "");

  // Keep only allowlisted tags with all attributes stripped (no onclick/onerror/style/href XSS vectors)
  clean = clean.replace(/<\/?([a-zA-Z0-9-]+)(?:\s[^>]*)?>/g, (fullMatch, rawTag: string) => {
    const tag = rawTag.toLowerCase();
    if (!ALLOWED_TAGS.has(tag)) {
      return "";
    }
    if (fullMatch.startsWith("</")) {
      return `</${tag}>`;
    }
    return tag === "br" ? "<br />" : `<${tag}>`;
  });

  return clean.trim();
}
