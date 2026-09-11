import { getDaoyuanStorage } from "../../bridge/storage.ts";
import { IMAGES_CACHE_KEY } from "./constants.ts";
export function readImageLibraryCache(): unknown {
  const saved = getDaoyuanStorage().getItem(IMAGES_CACHE_KEY);
  return saved ? JSON.parse(saved) as unknown : null;
}
export function writeImageLibraryCache(data: unknown): void { getDaoyuanStorage().setItem(IMAGES_CACHE_KEY, JSON.stringify(data)); }
export function clearImageLibraryCache(): void { getDaoyuanStorage().removeItem(IMAGES_CACHE_KEY); }
