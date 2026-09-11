import { fetchImageLibrary } from "./api.ts";
import { clearImageLibraryCache, readImageLibraryCache, writeImageLibraryCache } from "./cache.ts";
import { parseImageLibrary } from "./schema.ts";
import { getImageLibraryState, setImageLibrary } from "./store.ts";
export * from "./selectors.ts";
export { getImageLibraryState } from "./store.ts";
function notify(): void { globalThis.dispatchEvent?.(new CustomEvent("daoyuan_images_changed")); }
export async function initializeImageLibrary(options: { autoFetch?: boolean } = {}): Promise<boolean> {
  try {
    const cached = readImageLibraryCache();
    if (cached) { setImageLibrary(parseImageLibrary(cached), "cache"); notify(); return true; }
  } catch (error) { console.warn("[道渊状态栏] 图片库缓存无效，准备重新同步:", error); clearImageLibraryCache(); }
  if (options.autoFetch === false) return false;
  try { await refreshImageLibrary(); return true; } catch (error) { console.warn("[道渊状态栏] 首次同步图片库失败:", error); return false; }
}
export async function refreshImageLibrary() {
  const parsed = parseImageLibrary(await fetchImageLibrary());
  writeImageLibraryCache(parsed);
  setImageLibrary(parsed, "remote");
  notify();
  return parsed;
}
