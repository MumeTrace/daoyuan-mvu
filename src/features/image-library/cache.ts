import { getDaoyuanStorage } from "../../bridge/storage.ts";
import {
  IMAGES_CACHE_KEY,
  WORKSHOP_IMAGES_CACHE_KEY,
} from "./constants.ts";

function readCache(key: string): unknown {
  const saved = getDaoyuanStorage().getItem(key);
  return saved ? JSON.parse(saved) as unknown : null;
}

function writeCache(key: string, data: unknown): void {
  getDaoyuanStorage().setItem(key, JSON.stringify(data));
}

export function readImageLibraryCache(): unknown {
  return readCache(IMAGES_CACHE_KEY);
}
export function writeImageLibraryCache(data: unknown): void {
  writeCache(IMAGES_CACHE_KEY, data);
}
export function clearImageLibraryCache(): void { getDaoyuanStorage().removeItem(IMAGES_CACHE_KEY); }

export function readWorkshopImageLibraryCache(): unknown {
  return readCache(WORKSHOP_IMAGES_CACHE_KEY);
}

export function writeWorkshopImageLibraryCache(data: unknown): void {
  writeCache(WORKSHOP_IMAGES_CACHE_KEY, data);
}

export function clearWorkshopImageLibraryCache(): void {
  getDaoyuanStorage().removeItem(WORKSHOP_IMAGES_CACHE_KEY);
}
