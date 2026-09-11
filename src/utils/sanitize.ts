import { safeWebUrl } from "./safe-url";
import { escapeHtmlText } from "./html";

const ALLOWED_TAGS = new Set([
  "a", "b", "blockquote", "br", "code", "div", "em", "h1", "h2", "h3",
  "h4", "hr", "i", "li", "ol", "p", "pre", "small", "span", "strong", "u", "ul",
]);
const DROP_WITH_CONTENT = new Set([
  "audio", "embed", "iframe", "math", "object", "script", "style", "svg", "template", "video",
]);

function appendTextWithBreaks(target: Node, value: string, preserveWhitespace: boolean): void {
  if (preserveWhitespace) {
    target.appendChild(document.createTextNode(value));
    return;
  }
  const parts = value.replace(/\r\n?/g, "\n").split("\n");
  parts.forEach((part, index) => {
    if (index > 0) target.appendChild(document.createElement("br"));
    if (part) target.appendChild(document.createTextNode(part));
  });
}

function copySafeNode(source: Node, target: Node, preserveWhitespace = false): void {
  if (source.nodeType === Node.TEXT_NODE) {
    appendTextWithBreaks(target, source.textContent ?? "", preserveWhitespace);
    return;
  }
  if (!(source instanceof Element)) return;

  const tag = source.tagName.toLocaleLowerCase();
  if (DROP_WITH_CONTENT.has(tag)) return;
  if (!ALLOWED_TAGS.has(tag)) {
    source.childNodes.forEach((child) => copySafeNode(child, target, preserveWhitespace));
    return;
  }

  const clean = document.createElement(tag);
  if (tag === "a") {
    const href = safeWebUrl(source.getAttribute("href"));
    if (href) {
      clean.setAttribute("href", href);
      clean.setAttribute("target", "_blank");
      clean.setAttribute("rel", "noopener noreferrer");
    }
    const title = source.getAttribute("title");
    if (title) clean.setAttribute("title", title.slice(0, 300));
  }
  source.childNodes.forEach((child) => copySafeNode(child, clean, preserveWhitespace || tag === "pre" || tag === "code"));
  target.appendChild(clean);
}

/**
 * Allow-list renderer for the controlled Daoyuan notice format only.
 * It intentionally preserves basic text formatting and safe web links, but it
 * is not advertised as a general-purpose HTML sanitizer.
 */
export function sanitizeNoticeHtmlCompat(value: unknown): string {
  if (typeof value !== "string") return "";
  if (typeof DOMParser === "undefined") return escapeHtmlText(value).replace(/\r\n?|\n/g, "<br>");

  const parsed = new DOMParser().parseFromString(value, "text/html");
  const clean = document.createElement("div");
  parsed.body.childNodes.forEach((node) => copySafeNode(node, clean));
  return clean.innerHTML;
}
