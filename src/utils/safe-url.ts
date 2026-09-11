const HTTP_PROTOCOLS = new Set(["http:", "https:"]);
const SAFE_DATA_IMAGE = /^data:image\/(?:avif|gif|jpeg|png|webp);base64,[a-z0-9+/=\s]+$/i;

function parseUrl(value: unknown): URL | null {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const baseUrl = typeof document !== "undefined" ? document.baseURI : globalThis.location?.href;
    if (!baseUrl) return null;
    const url = new URL(value.trim(), baseUrl);
    if (url.username || url.password) return null;
    return url;
  } catch {
    return null;
  }
}

/** Allow only ordinary web links. Intended for remote notice links and iframes. */
export function safeWebUrl(value: unknown): string {
  const url = parseUrl(value);
  return url && HTTP_PROTOCOLS.has(url.protocol) ? url.href : "";
}

/** Allow web images plus local image previews created by this frontend. */
export function safeImageUrl(value: unknown): string {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (SAFE_DATA_IMAGE.test(trimmed)) return trimmed;
  if (trimmed.startsWith("blob:")) {
    const url = parseUrl(trimmed);
    return url?.protocol === "blob:" ? url.href : "";
  }
  return safeWebUrl(trimmed);
}
