import { parseImageLibrary } from "../schema.ts";
import type { ParsedImageLibrary } from "../types.ts";
import { fetchWorkshopImageLibrary } from "./api.ts";

export async function readWorkshopImageLibrary(
  timeoutMs?: number,
): Promise<ParsedImageLibrary | null> {
  const raw = await fetchWorkshopImageLibrary(undefined, timeoutMs);
  if (raw === null) return null;

  try {
    return parseImageLibrary(raw);
  } catch {
    return null;
  }
}

export type { DaoyuanWorkshopApi, DaoyuanWorkshopHost } from "./types.ts";
export type {
  WorkshopEntryIndexEnvelope,
  WorkshopEntryIndexItem,
  WorkshopEntryKind,
} from "./types.ts";
export { fetchWorkshopEntryIndex } from "./api.ts";
