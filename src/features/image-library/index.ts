import { fetchImageLibrary } from "./api.ts";
import {
  clearImageLibraryCache,
  clearWorkshopImageLibraryCache,
  readImageLibraryCache,
  readWorkshopImageLibraryCache,
  writeImageLibraryCache,
  writeWorkshopImageLibraryCache,
} from "./cache.ts";
import { parseImageLibrary } from "./schema.ts";
import { getImageLibraryState, setImageLibrary, setWorkshopImageLibrary } from "./store.ts";
import { readWorkshopImageLibrary } from "./workshop/index.ts";
export * from "./selectors.ts";
export { getImageLibraryState } from "./store.ts";
function notify(): void { globalThis.dispatchEvent?.(new CustomEvent("daoyuan_images_changed")); }
export async function initializeImageLibrary(options: { autoFetch?: boolean } = {}): Promise<boolean> {
  try {
    const cached = readImageLibraryCache();
    if (cached) { setImageLibrary(parseImageLibrary(cached), "cache"); notify(); return true; }
  } catch (error) {
    console.warn("[道渊状态栏] 图片库缓存无效，准备重新同步:", error);
    try { clearImageLibraryCache(); } catch { /* volatile tombstone is already active */ }
  }
  if (options.autoFetch === false) return false;
  try { await refreshImageLibrary(); return true; } catch (error) { console.warn("[道渊状态栏] 首次同步图片库失败:", error); return false; }
}
export async function refreshImageLibrary() {
  const parsed = parseImageLibrary(await fetchImageLibrary());
  try {
    writeImageLibraryCache(parsed);
  } catch (error) {
    console.warn(
      "[道渊状态栏] 图片库缓存写入失败，本次继续使用已下载数据:",
      error,
    );
  }
  setImageLibrary(parsed, "remote");
  notify();
  return parsed;
}

export interface WorkshopImageLoadResult {
  loaded: boolean;
  refreshed: boolean;
}

export async function loadWorkshopImagesWithStatus(
  options: { timeoutMs?: number } = {},
): Promise<WorkshopImageLoadResult> {
  let loadedFromCache = false;
  try {
    const cached = readWorkshopImageLibraryCache();
    if (cached) {
      setWorkshopImageLibrary(parseImageLibrary(cached));
      loadedFromCache = true;
      notify();
    }
  } catch (error) {
    console.warn("[道渊状态栏] 工坊图片缓存无效，已忽略:", error);
    try { clearWorkshopImageLibraryCache(); } catch { /* volatile tombstone is already active */ }
  }

  const parsed = await readWorkshopImageLibrary(options.timeoutMs);
  if (!parsed) return { loaded: loadedFromCache, refreshed: false };
  try {
    writeWorkshopImageLibraryCache(parsed);
  } catch (error) {
    console.warn(
      "[道渊状态栏] 工坊图片缓存写入失败，本次继续使用已读取数据:",
      error,
    );
  }
  setWorkshopImageLibrary(parsed);
  notify();
  return { loaded: true, refreshed: true };
}

export async function loadWorkshopImages(
  options: { timeoutMs?: number } = {},
): Promise<boolean> {
  return (await loadWorkshopImagesWithStatus(options)).loaded;
}
