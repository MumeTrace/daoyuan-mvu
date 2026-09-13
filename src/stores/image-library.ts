import { ref } from "vue";
import { defineStore } from "pinia";
import { setWindowExport } from "../bridge/window-exports";
import type { DataRecord } from "../types/stat-data";
import {
  getImageLibraryState,
  initializeImageLibrary,
  refreshImageLibrary,
} from "../features/image-library";
import {
  initializePortraitDrawers,
  refreshPortraitDrawers,
} from "../features/portraits/drawers";

export const useImageLibraryStore = defineStore("image-library", () => {
  const schemaVersion = ref<string | number | null>(null);
  const entities = ref<Record<string, unknown>>({});
  const loaded = ref(false);
  const source = ref<string | null>(null);
  const error = ref<string | null>(null);
  const drawersLoaded = ref(false);
  let initializePromise: Promise<boolean> | null = null;
  let initializationAllowsFetch = false;

  function publishCacheState(missing: boolean): void {
    // Project compatibility: the notice and older host integrations still read
    // these flags. All writes stay inside the registered window-export bridge.
    setWindowExport("dyImageCacheMissing", missing);
    setWindowExport("dyPortraitCacheMissing", missing);
  }

  function setLibrary(data: DataRecord, nextSource: string): void {
    const payload =
      data.data && typeof data.data === "object" && !Array.isArray(data.data)
        ? (data.data as DataRecord)
        : {};
    schemaVersion.value =
      typeof data.schemaVersion === "string" || typeof data.schemaVersion === "number"
        ? data.schemaVersion
        : null;
    entities.value =
      payload.entities && typeof payload.entities === "object"
        ? { ...(payload.entities as Record<string, unknown>) }
        : {};
    source.value = nextSource;
    loaded.value = true;
    error.value = null;
    publishCacheState(false);
  }

  function setError(reason: unknown): void {
    error.value = reason instanceof Error ? reason.message : String(reason ?? "未知错误");
    if (!loaded.value) publishCacheState(true);
  }

  function syncFromRuntime(): boolean {
    const state = getImageLibraryState();
    if (!state || state.loaded !== true || !state.entities || typeof state.entities !== "object") return false;
    schemaVersion.value = typeof state.schemaVersion === "string" || typeof state.schemaVersion === "number" ? state.schemaVersion : null;
    entities.value = { ...(state.entities as Record<string, unknown>) };
    loaded.value = true;
    source.value = typeof state.source === "string" ? state.source : null;
    error.value = null;
    publishCacheState(false);
    return true;
  }

  function initialize(options: { autoFetch?: boolean } = {}): Promise<boolean> {
    const allowsFetch = options.autoFetch !== false;
    if (loaded.value && drawersLoaded.value) return Promise.resolve(true);
    if (initializePromise) {
      if (allowsFetch && !initializationAllowsFetch) {
        return initializePromise.then(
          initialized => initialized || initialize({ autoFetch: true }),
        );
      }
      return initializePromise;
    }
    initializationAllowsFetch = allowsFetch;
    initializePromise = (async () => {
      const [initialized, initializedDrawers] = await Promise.all([
        initializeImageLibrary(options),
        initializePortraitDrawers(options),
      ]);
      drawersLoaded.value = initializedDrawers;
      const synced = syncFromRuntime();
      if (!initialized || !synced) setError("图片库暂时不可用，可从公告中重新同步。");
      return initialized && synced;
    })().finally(() => {
      initializePromise = null;
      initializationAllowsFetch = false;
    });
    return initializePromise;
  }

  async function refresh(): Promise<boolean> {
    try {
      const [imagesResult, drawersResult] = await Promise.allSettled([
        refreshImageLibrary(),
        refreshPortraitDrawers(),
      ]);
      if (imagesResult.status === "rejected") throw imagesResult.reason;
      if (drawersResult.status === "rejected") {
        console.warn(
          "[道渊状态栏] 图片已同步，但立绘抽屉配置同步失败，继续使用已有配置:",
          drawersResult.reason,
        );
      } else {
        drawersLoaded.value = true;
      }
      const synced = syncFromRuntime();
      if (!synced) publishCacheState(true);
      return synced;
    } catch (reason) {
      setError(reason);
      return false;
    }
  }
  function getSectMapUrl(name: string): string {
    const entity = entities.value[name];
    if (!entity || typeof entity !== "object" || Array.isArray(entity)) return "";
    const source = entity as Record<string, unknown>;
    if (source.type !== "sect" || !Array.isArray(source.images)) return "";
    const image = source.images.find((item) => item && typeof item === "object" && !Array.isArray(item) && (item as Record<string, unknown>).theme === "map");
    return image && typeof image === "object" ? String((image as Record<string, unknown>).url ?? "") : "";
  }

  return { schemaVersion, entities, loaded, source, error, setLibrary, setError, syncFromRuntime, initialize, refresh, getSectMapUrl };
});
