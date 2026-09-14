import { ref } from "vue";
import { defineStore } from "pinia";
import { setWindowExport } from "../bridge/window-exports";
import type { DataRecord } from "../types/stat-data";
import {
  getImageLibraryState,
  initializeImageLibrary,
  loadWorkshopImages,
  loadWorkshopImagesWithStatus,
  refreshImageLibrary,
} from "../features/image-library";
import {
  initializePortraitDrawers,
  refreshPortraitDrawers,
} from "../features/portraits/drawers";

export const useImageLibraryStore = defineStore("image-library", () => {
  const schemaVersion = ref<string | number | null>(null);
  const entities = ref<Record<string, unknown>>({});
  const revision = ref(0);
  const loaded = ref(false);
  const source = ref<string | null>(null);
  const error = ref<string | null>(null);
  const drawersLoaded = ref(false);
  let initializePromise: Promise<boolean> | null = null;
  let workshopPromise: Promise<boolean> | null = null;
  let initializationAllowsFetch = false;
  let workshopRetryTimer: ReturnType<typeof globalThis.setTimeout> | undefined;
  let workshopRetryCount = 0;
  let imageLibraryRetryTimer: ReturnType<typeof globalThis.setTimeout> | undefined;
  let imageLibraryRetryCount = 0;

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
    revision.value += 1;
    publishCacheState(nextSource === "workshop");
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
    revision.value += 1;
    publishCacheState(source.value === "workshop");
    return true;
  }

  function scheduleImageLibraryRetry(): void {
    if (imageLibraryRetryTimer !== undefined || imageLibraryRetryCount >= 3) return;
    const delay = [2500, 6000, 12000][imageLibraryRetryCount] ?? 12000;
    imageLibraryRetryCount += 1;
    imageLibraryRetryTimer = globalThis.setTimeout(() => {
      imageLibraryRetryTimer = undefined;
      void initialize({ autoFetch: true });
    }, delay);
  }

  function initialize(options: { autoFetch?: boolean } = {}): Promise<boolean> {
    void initializeWorkshop();
    const allowsFetch = options.autoFetch !== false;
    if (loaded.value && source.value !== "workshop" && drawersLoaded.value) {
      return Promise.resolve(true);
    }
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
      const ready = initialized && synced;
      if (!ready) {
        setError("图片库暂时不可用，正在后台重试；也可从公告中手动同步。");
        if (allowsFetch) scheduleImageLibraryRetry();
      } else {
        imageLibraryRetryCount = 0;
      }
      return ready;
    })().finally(() => {
      initializePromise = null;
      initializationAllowsFetch = false;
    });
    return initializePromise;
  }

  function scheduleWorkshopRetry(): void {
    if (workshopRetryTimer !== undefined || workshopRetryCount >= 3) return;
    const delay = [2500, 6000, 12000][workshopRetryCount] ?? 12000;
    workshopRetryCount += 1;
    workshopRetryTimer = globalThis.setTimeout(() => {
      workshopRetryTimer = undefined;
      void initializeWorkshop();
    }, delay);
  }

  function initializeWorkshop(): Promise<boolean> {
    if (workshopPromise) return workshopPromise;
    workshopPromise = loadWorkshopImagesWithStatus()
      .then((result) => {
        if (result.loaded) {
          syncFromRuntime();
        }
        if (result.refreshed) {
          workshopRetryCount = 0;
        } else {
          scheduleWorkshopRetry();
        }
        return result.loaded;
      })
      .finally(() => {
        workshopPromise = null;
      });
    return workshopPromise;
  }

  async function refresh(): Promise<boolean> {
    try {
      const [imagesResult, drawersResult, workshopResult] = await Promise.allSettled([
        refreshImageLibrary(),
        refreshPortraitDrawers(),
        loadWorkshopImages({ timeoutMs: 2000 }),
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
      if (workshopResult.status === "rejected") {
        console.warn(
          "[道渊状态栏] 主图片库已同步，但工坊图片读取失败:",
          workshopResult.reason,
        );
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

  return { schemaVersion, entities, revision, loaded, source, error, setLibrary, setError, syncFromRuntime, initialize, initializeWorkshop, refresh, getSectMapUrl };
});
