import { safeImageUrl } from "../../utils/safe-url.ts";
import { resolvePortraitImageUrls } from "./local-images.ts";
import type { PortraitPreferences } from "./preferences.ts";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function hasUsableLibraryPortrait(value: unknown): boolean {
  if (!isRecord(value) || value.type !== "character" || !Array.isArray(value.images)) {
    return false;
  }
  return value.images.some((entry) =>
    isRecord(entry) && Boolean(safeImageUrl(entry.url)),
  );
}

function hasUsableCustomPortrait(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return Object.entries(value).some(([theme, urls]) =>
    Boolean(theme.trim())
    && resolvePortraitImageUrls(Array.isArray(urls) ? urls : [])
      .some((url) => Boolean(safeImageUrl(url))),
  );
}

/**
 * Return only names that can take the synchronous portrait-library fast path.
 * Lore-only people deliberately stay out of this list so the caller can fall
 * back to the permitted worldbook search when no portrait actually exists.
 */
export function collectPortraitSearchNames(
  entities: Readonly<Record<string, unknown>>,
  customImages: PortraitPreferences["customImages"],
): string[] {
  const names = new Set<string>();

  for (const [rawName, entity] of Object.entries(entities)) {
    const name = rawName.trim();
    if (name && hasUsableLibraryPortrait(entity)) names.add(name);
  }
  for (const [rawName, themes] of Object.entries(customImages)) {
    const name = rawName.trim();
    if (name && hasUsableCustomPortrait(themes)) names.add(name);
  }

  return [...names];
}

/** A portrait/theme refresh must not perform a second random character draw. */
export function shouldPreserveRandomPortraitResult(
  query: unknown,
  resultCount: number,
): boolean {
  return String(query ?? "").trim() === "随机" && resultCount > 0;
}
