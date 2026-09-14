import { getDaoyuanStorage } from "../../bridge/storage.ts";
import {
  IMAGES_CACHE_KEY,
  WORKSHOP_IMAGES_CACHE_KEY,
} from "../image-library/constants.ts";
import {
  isStoredLocalPortraitRef,
  persistPortraitImageUrls,
  pruneLocalPortraitImages,
} from "./local-images.ts";
import {
  PREFERENCES_KEY,
  readPortraitPreferences,
  useTransientPortraitPreferences,
  writePortraitPreferences,
  type PortraitPreferences,
} from "./preferences.ts";

const VERSION_KEY = "daoyuan_portrait_preferences_migration_version";
const MIGRATION_VERSION = 3;
const LEGACY_THEMES = ["normal", "female", "special", "wedding", "tarot"];
const FIXED_KEYS: Record<string, string> = {
  normal: "daoyuan_custom_portraits",
  female: "daoyuan_custom_portraits_female",
  special: "daoyuan_custom_portraits_special",
};
const LEGACY_KEYS = [
  "daoyuan_active_portrait_pools",
  "daoyuan_portrait_indices",
  ...LEGACY_THEMES.map((theme) => `daoyuan_custom_portraits_pool_${theme}`),
  ...Object.values(FIXED_KEYS),
];

let migrationPromise: Promise<boolean> | null = null;

function readRecord(key: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(getDaoyuanStorage().getItem(key) || "{}");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

const themeName = (theme: string): string =>
  theme === "normal" ? "default" : theme;

function urls(value: unknown): string[] {
  return (Array.isArray(value) ? value : String(value ?? "").split("|"))
    .map(String)
    .map((url) => url.trim())
    .filter(
      (url) =>
        /^(https?:\/\/|data:image\/)/i.test(url) ||
        isStoredLocalPortraitRef(url),
    );
}

function isQuotaExceededError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { name?: unknown; code?: unknown };
  return (
    candidate.name === "QuotaExceededError" ||
    candidate.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
    candidate.code === 22 ||
    candidate.code === 1014
  );
}

async function moveLocalImagesToIndexedDb(
  preferences: PortraitPreferences,
): Promise<PortraitPreferences> {
  for (const themes of Object.values(preferences.customImages)) {
    for (const [theme, imageUrls] of Object.entries(themes)) {
      themes[theme] = await persistPortraitImageUrls(urls(imageUrls));
    }
  }
  return preferences;
}

function allCustomImageUrls(preferences: PortraitPreferences): string[] {
  return Object.values(preferences.customImages).flatMap((themes) =>
    Object.values(themes).flatMap((imageUrls) =>
      Array.isArray(imageUrls) ? imageUrls : [],
    ),
  );
}

function writeWithCacheRecovery(preferences: PortraitPreferences): void {
  const storage = getDaoyuanStorage();
  try {
    writePortraitPreferences(preferences);
    return;
  } catch (error) {
    if (!isQuotaExceededError(error)) throw error;
    console.warn(
      "[道渊] 立绘迁移空间不足，清理可重新下载的图片库缓存后重试。",
    );
  }

  try {
    storage.removeItem(IMAGES_CACHE_KEY);
    storage.removeItem(WORKSHOP_IMAGES_CACHE_KEY);
  } catch (error) {
    console.warn("[道渊] 图片库缓存清理失败，继续重试立绘迁移:", error);
  }
  writePortraitPreferences(preferences);
}

async function runLegacyPortraitMigration(): Promise<boolean> {
  const storage = getDaoyuanStorage();
  if (Number(storage.getItem(VERSION_KEY)) >= MIGRATION_VERSION) return false;

  const preferences = readPortraitPreferences();
  Object.entries(readRecord("daoyuan_active_portrait_pools")).forEach(
    ([name, theme]) => {
      if (!preferences.activeThemes[name]) {
        preferences.activeThemes[name] = themeName(String(theme));
      }
    },
  );
  Object.entries(readRecord("daoyuan_portrait_indices")).forEach(
    ([theme, names]) => {
      if (!names || typeof names !== "object" || Array.isArray(names)) return;
      Object.entries(names as Record<string, unknown>).forEach(
        ([name, index]) => {
          preferences.indices[name] ??= {};
          preferences.indices[name]![themeName(theme)] ??= Number(index) || 0;
        },
      );
    },
  );
  LEGACY_THEMES.forEach((legacyTheme) => {
    const fixedKey = FIXED_KEYS[legacyTheme];
    const combined = {
      ...(fixedKey ? readRecord(fixedKey) : {}),
      ...readRecord(`daoyuan_custom_portraits_pool_${legacyTheme}`),
    };
    Object.entries(combined).forEach(([name, value]) => {
      const images = urls(value);
      if (!images.length) return;
      preferences.customImages[name] ??= {};
      preferences.customImages[name]![themeName(legacyTheme)] ??= images;
    });
  });

  await moveLocalImagesToIndexedDb(preferences);

  try {
    writeWithCacheRecovery(preferences);
    storage.setItem(VERSION_KEY, String(MIGRATION_VERSION));
    if (
      storage.getItem(VERSION_KEY) !== String(MIGRATION_VERSION) ||
      !storage.getItem(PREFERENCES_KEY)
    ) {
      throw new Error("立绘迁移结果未能持久化");
    }
  } catch (error) {
    useTransientPortraitPreferences(preferences);
    console.warn(
      "[道渊] 立绘偏好迁移未能持久化；已保留旧数据并仅在本次运行中加载:",
      error,
    );
    return false;
  }

  [...new Set(LEGACY_KEYS)].forEach((key) => {
    try {
      storage.removeItem(key);
    } catch (error) {
      console.warn(`[道渊] 旧立绘键 ${key} 清理失败:`, error);
    }
  });
  try {
    await pruneLocalPortraitImages(allCustomImageUrls(preferences));
  } catch (error) {
    console.warn("[道渊] 清理未使用的本地立绘失败:", error);
  }
  return true;
}

export function migrateLegacyPortraitPreferences(): Promise<boolean> {
  migrationPromise ??= runLegacyPortraitMigration().finally(() => {
    migrationPromise = null;
  });
  return migrationPromise;
}
