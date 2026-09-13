import { ref, watch } from "vue";
import { defineStore } from "pinia";
import { tavernApi } from "../bridge/tavern-api";
import {
  initializeLocalPortraitImages,
  persistPortraitImageUrls,
  pruneLocalPortraitImages,
  resolvePortraitImageUrls,
} from "../features/portraits/local-images";
import { migrateLegacyPortraitPreferences } from "../features/portraits/migration";
import {
  emptyPortraitPreferences,
  readPortraitPreferences,
  writePortraitPreferences,
  type PortraitPreferences,
} from "../features/portraits/preferences";
import { canUsePortraitTheme } from "../features/portraits/rules";
import { getThemeUi } from "../features/portraits/theme-ui";
import { safeImageUrl } from "../utils/safe-url";
import { asRecord } from "./helpers";
import { useImageLibraryStore } from "./image-library";
import type { DataRecord } from "../types/stat-data";

export const PORTRAIT_PREFERENCES_KEY = "daoyuan_portrait_preferences_v2";

export interface PortraitPoolOption {
  id: string;
  name: string;
  icon: string;
  active: boolean;
}

function clonePreferences(value: PortraitPreferences): PortraitPreferences {
  return JSON.parse(JSON.stringify(value)) as PortraitPreferences;
}

function storedCustomImageUrls(value: PortraitPreferences): string[] {
  return Object.values(value.customImages).flatMap((themes) =>
    Object.values(themes).flatMap((urls) =>
      Array.isArray(urls) ? urls : [],
    ),
  );
}

export const usePortraitStore = defineStore("portraits", () => {
  const images = useImageLibraryStore();
  const preferences = ref(readPortraitPreferences());
  const revision = ref(0);
  const cycleNoticeRevision = ref(0);
  let initializePromise: Promise<void> | null = null;

  // 图片库同步只替换图库数据，不应重挂载整条状态栏。把图库版本
  // 映射到立绘版本后，所有已挂载的头像、抽屉与大图会原位重算。
  watch(
    () => images.revision,
    () => { revision.value += 1; },
    { flush: "sync" },
  );

  function persist(): boolean {
    try {
      return writePortraitPreferences(preferences.value);
    } catch (error) {
      console.warn("[道渊] 保存立绘偏好失败:", error);
      return false;
    }
  }

  function reload(): void {
    preferences.value = readPortraitPreferences();
    revision.value += 1;
  }

  async function initialize(): Promise<void> {
    if (initializePromise) return initializePromise;
    initializePromise = (async () => {
      await initializeLocalPortraitImages();
      await migrateLegacyPortraitPreferences();
      reload();
      globalThis.dispatchEvent?.(
        new CustomEvent("daoyuan_portraits_changed"),
      );
    })().catch((error) => {
      console.warn("[道渊] 初始化本地立绘失败，将保留当前可读设置。", error);
    });
    return initializePromise;
  }

  function characterStat(name: string): DataRecord {
    const stat = asRecord(tavernApi.getAllVariables()?.stat_data);
    return asRecord(
      asRecord(stat.道侣)[name] ??
        asRecord(stat.人物)[name] ??
        asRecord(stat.灵宠)[name] ??
        asRecord(stat.绝色榜)[name],
    );
  }

  function defaultThemeUrls(name: string, theme: string): string[] {
    const entity = asRecord(images.entities[name]);
    const entityImages = Array.isArray(entity.images) ? entity.images : [];
    return entityImages
      .map(asRecord)
      .filter((image) => image.theme === theme)
      .map((image) => safeImageUrl(image.url))
      .filter(Boolean);
  }

  function themeUrls(name: string, theme: string): string[] {
    const custom = resolvePortraitImageUrls(
      preferences.value.customImages[name]?.[theme],
    )
      .map((url) => safeImageUrl(url))
      .filter(Boolean);
    return custom.length ? custom : defaultThemeUrls(name, theme);
  }

  function visibleThemes(name: string): string[] {
    const entity = asRecord(images.entities[name]);
    const ordered = (Array.isArray(entity.images) ? entity.images : [])
      .map((item) => String(asRecord(item).theme ?? ""))
      .filter(Boolean);
    Object.keys(preferences.value.customImages[name] ?? {}).forEach((theme) =>
      ordered.push(theme),
    );
    return [...new Set(ordered)].filter((theme) =>
      canUsePortraitTheme(theme, themeUrls(name, theme), characterStat(name)),
    );
  }

  function activeTheme(name: string, gender: unknown = ""): string {
    const saved = preferences.value.activeThemes[name];
    if (saved && visibleThemes(name).includes(saved)) return saved;
    if ((preferences.value.customImages[name]?.default ?? []).length) {
      return "default";
    }
    const effectiveGender = String(gender || characterStat(name).性别 || "");
    if (/^女/.test(effectiveGender) && visibleThemes(name).includes("female")) {
      return "female";
    }
    return visibleThemes(name).includes("default")
      ? "default"
      : (visibleThemes(name)[0] ?? "default");
  }

  function getUrl(name: string, gender: unknown = ""): string {
    void revision.value;
    const theme = activeTheme(name, gender);
    const urls = themeUrls(name, theme);
    const stored = Number(preferences.value.indices[name]?.[theme] ?? 0);
    const index = urls.length
      ? Math.max(0, Number.isInteger(stored) ? stored : 0) % urls.length
      : 0;
    return urls[index] ?? "";
  }

  function drawerOptions(
    name: string,
    gender: unknown = "",
  ): PortraitPoolOption[] {
    const active = activeTheme(name, gender);
    return visibleThemes(name)
      .map((id, index) => ({ id, index, ui: getThemeUi(id) }))
      .sort((left, right) => {
        const leftOrder = typeof left.ui.order === "number"
          && Number.isFinite(left.ui.order)
          ? left.ui.order
          : Number.MAX_SAFE_INTEGER;
        const rightOrder = typeof right.ui.order === "number"
          && Number.isFinite(right.ui.order)
          ? right.ui.order
          : Number.MAX_SAFE_INTEGER;
        return leftOrder - rightOrder || left.index - right.index;
      })
      .map(({ id, ui }) => ({
        id,
        name: ui.name,
        icon: ui.icon,
        active: id === active,
      }));
  }

  function setActiveTheme(name: string, theme: string): boolean {
    if (!visibleThemes(name).includes(theme)) return false;
    const previous = preferences.value.activeThemes[name];
    preferences.value.activeThemes[name] = theme;
    if (!persist()) {
      if (previous === undefined) delete preferences.value.activeThemes[name];
      else preferences.value.activeThemes[name] = previous;
      return false;
    }
    revision.value += 1;
    return true;
  }

  function setIndex(name: string, theme: string, index: number): void {
    preferences.value.indices[name] ??= {};
    preferences.value.indices[name]![theme] = Math.max(0, Math.trunc(index));
    persist();
    revision.value += 1;
  }

  function cycle(name: string, gender: unknown = ""): boolean {
    const theme = activeTheme(name, gender);
    const urls = themeUrls(name, theme);
    if (urls.length < 2) {
      cycleNoticeRevision.value += 1;
      return false;
    }
    const current = Number(preferences.value.indices[name]?.[theme] ?? 0);
    setIndex(name, theme, (current + 1) % urls.length);
    return true;
  }

  async function setCustomImages(
    name: string,
    theme: string,
    urls: string[],
  ): Promise<boolean> {
    const valid = urls.map((url) => safeImageUrl(url)).filter(Boolean);
    const defaults = defaultThemeUrls(name, theme);
    const matchesDefault = valid.length === defaults.length
      && valid.every((url, index) => url === defaults[index]);
    const stored = matchesDefault ? [] : await persistPortraitImageUrls(valid);
    const previous = clonePreferences(preferences.value);

    if (stored.length) {
      preferences.value.customImages[name] ??= {};
      preferences.value.customImages[name]![theme] = stored;
    } else if (preferences.value.customImages[name]) {
      delete preferences.value.customImages[name]![theme];
      if (!Object.keys(preferences.value.customImages[name]!).length) {
        delete preferences.value.customImages[name];
      }
    }
    preferences.value.indices[name] ??= {};
    preferences.value.indices[name]![theme] = 0;

    if (!persist()) {
      preferences.value = previous;
      return false;
    }
    revision.value += 1;
    void pruneLocalPortraitImages(
      storedCustomImageUrls(preferences.value),
    ).catch((error) =>
      console.warn("[道渊] 清理未使用的本地立绘失败:", error),
    );
    return true;
  }

  async function resetAllCustomImages(): Promise<boolean> {
    const previous = preferences.value;
    preferences.value = emptyPortraitPreferences();
    if (!persist()) {
      preferences.value = previous;
      return false;
    }
    revision.value += 1;
    await pruneLocalPortraitImages([]).catch((error) => {
      console.warn("[道渊] 清理本地立绘失败:", error);
      return false;
    });
    return true;
  }

  function search(query: string): Array<{
    name: string;
    gender: string;
    url: string;
  }> {
    const names = [
      ...new Set([
        ...Object.keys(images.entities),
        ...Object.keys(preferences.value.customImages),
      ]),
    ];
    const matched =
      query === "随机"
        ? names.length
          ? [names[Math.floor(Math.random() * names.length)]!]
          : []
        : names.filter((name) => name.includes(query));
    return matched.map((name) => {
      const stat = characterStat(name);
      return {
        name,
        gender: String(stat.性别 ?? ""),
        url: getUrl(name, stat.性别),
      };
    });
  }

  void initialize();

  return {
    preferences,
    revision,
    cycleNoticeRevision,
    initialize,
    persist,
    reload,
    themeUrls,
    visibleThemes,
    activeTheme,
    getUrl,
    drawerOptions,
    setActiveTheme,
    setIndex,
    cycle,
    setCustomImages,
    resetAllCustomImages,
    search,
  };
});
