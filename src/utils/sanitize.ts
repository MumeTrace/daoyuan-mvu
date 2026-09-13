import { safeImageUrl, safeWebUrl } from "./safe-url";
import { escapeHtmlText } from "./html";

const ALLOWED_TAGS = new Set([
  "a", "b", "blockquote", "br", "code", "del", "details", "div", "em",
  "figcaption", "figure", "h1", "h2", "h3", "h4", "h5", "h6", "hr", "i",
  "img", "li", "mark", "ol", "p", "pre", "s", "small", "span", "strong",
  "summary", "table", "tbody", "td", "th", "thead", "tr", "u", "ul",
]);
const DROP_WITH_CONTENT = new Set([
  "audio", "embed", "iframe", "math", "object", "script", "style", "svg", "template", "video",
]);
const ALLOWED_NOTICE_CLASSES = new Set([
  "danger-text", "rare-text", "dy-gold-text", "dy-mana-text", "dy-san-text",
]);
const ALLOWED_STYLE_PROPERTIES = [
  "background-color", "border", "border-color", "border-radius", "border-style",
  "border-width", "color", "font-size", "font-style", "font-weight", "height",
  "letter-spacing", "line-height", "margin", "margin-bottom", "margin-left",
  "margin-right", "margin-top", "max-height", "max-width", "padding",
  "padding-bottom", "padding-left", "padding-right", "padding-top", "text-align",
  "text-decoration", "width",
] as const;
const UNSAFE_STYLE_VALUE = /url\s*\(|expression\s*\(|@import|javascript\s*:|vbscript\s*:|behavior\s*:|-moz-binding/i;

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

function copyControlledPresentation(source: Element, target: HTMLElement): void {
  const classes = [...source.classList].filter((className) =>
    ALLOWED_NOTICE_CLASSES.has(className) || /^dy-notice-[a-z0-9_-]+$/i.test(className),
  );
  if (classes.length) target.className = classes.join(" ");

  if (source instanceof HTMLElement) {
    for (const property of ALLOWED_STYLE_PROPERTIES) {
      const value = source.style.getPropertyValue(property).trim();
      if (!value || value.length > 160 || UNSAFE_STYLE_VALUE.test(value)) continue;
      target.style.setProperty(property, value);
    }
  }
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
  copyControlledPresentation(source, clean);
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
  if (tag === "img") {
    const src = safeImageUrl(source.getAttribute("src"));
    if (!src) return;
    clean.setAttribute("src", src);
    clean.setAttribute("alt", (source.getAttribute("alt") ?? "公告图片").slice(0, 300));
    clean.setAttribute("loading", "lazy");
    clean.setAttribute("decoding", "async");
    clean.setAttribute("referrerpolicy", "no-referrer");
    const title = source.getAttribute("title");
    if (title) clean.setAttribute("title", title.slice(0, 300));
    for (const dimension of ["width", "height"] as const) {
      const value = Number.parseInt(source.getAttribute(dimension) ?? "", 10);
      if (Number.isFinite(value) && value > 0 && value <= 2000) {
        clean.setAttribute(dimension, String(value));
      }
    }
  }
  if (tag === "td" || tag === "th") {
    for (const span of ["colspan", "rowspan"] as const) {
      const value = Number.parseInt(source.getAttribute(span) ?? "", 10);
      if (Number.isFinite(value) && value > 0 && value <= 20) clean.setAttribute(span, String(value));
    }
  }
  source.childNodes.forEach((child) => copySafeNode(child, clean, preserveWhitespace || tag === "pre" || tag === "code"));
  target.appendChild(clean);
}

/**
 * Allow-list renderer for the controlled Daoyuan notice format only.
 * It preserves the controlled announcement format, safe web links, images and
 * a narrow set of presentation properties. It is not a general-purpose HTML
 * sanitizer.
 */
export function sanitizeNoticeHtmlCompat(value: unknown): string {
  if (typeof value !== "string") return "";
  if (typeof DOMParser === "undefined") return escapeHtmlText(value).replace(/\r\n?|\n/g, "<br>");

  const parsed = new DOMParser().parseFromString(value, "text/html");
  const clean = document.createElement("div");
  parsed.body.childNodes.forEach((node) => copySafeNode(node, clean));
  return clean.innerHTML;
}
