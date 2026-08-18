import {
  PREFERENCES_KEY,
  readPortraitPreferences,
  writePortraitPreferences,
} from "./preferences.js";

const MIGRATION_VERSION_KEY = "daoyuan_portrait_preferences_migration_version";
const MIGRATION_VERSION = 2;
const LEGACY_THEMES = ["normal", "female", "special", "wedding", "tarot"];
const LEGACY_CUSTOM_KEYS = {
  normal: "daoyuan_custom_portraits",
  female: "daoyuan_custom_portraits_female",
  special: "daoyuan_custom_portraits_special",
};

function getStorage() {
  return window.DaoyuanStatusStorage || window.localStorage;
}

function readJson(key) {
  try {
    return JSON.parse(getStorage().getItem(key) || "{}");
  } catch {
    return {};
  }
}

function toTheme(theme) {
  return theme === "normal" ? "default" : theme;
}

function toUrlArray(value) {
  const values = Array.isArray(value) ? value : String(value || "").split("|");
  return values
    .map((url) => String(url).trim())
    .filter((url) => /^(https?:\/\/|data:image\/)/i.test(url));
}

export function migrateLegacyPortraitPreferences() {
  const storage = getStorage();
  if (Number(storage.getItem(MIGRATION_VERSION_KEY)) >= MIGRATION_VERSION) {
    return false;
  }

  const preferences = readPortraitPreferences();
  const legacyActive = readJson("daoyuan_active_portrait_pools");
  Object.entries(legacyActive).forEach(([name, theme]) => {
    if (!preferences.activeThemes[name]) preferences.activeThemes[name] = toTheme(theme);
  });

  const legacyIndices = readJson("daoyuan_portrait_indices");
  Object.entries(legacyIndices).forEach(([theme, names]) => {
    if (!names || typeof names !== "object") return;
    const nextTheme = toTheme(theme);
    Object.entries(names).forEach(([name, index]) => {
      preferences.indices[name] ||= {};
      if (preferences.indices[name][nextTheme] === undefined) {
        preferences.indices[name][nextTheme] = Number(index) || 0;
      }
    });
  });

  LEGACY_THEMES.forEach((legacyTheme) => {
    const theme = toTheme(legacyTheme);
    const dynamic = readJson(`daoyuan_custom_portraits_pool_${legacyTheme}`);
    const fixed = LEGACY_CUSTOM_KEYS[legacyTheme]
      ? readJson(LEGACY_CUSTOM_KEYS[legacyTheme])
      : {};
    Object.entries({ ...fixed, ...dynamic }).forEach(([name, value]) => {
      const urls = toUrlArray(value);
      if (urls.length === 0) return;
      preferences.customImages[name] ||= {};
      if (!Array.isArray(preferences.customImages[name][theme])) {
        preferences.customImages[name][theme] = urls;
      }
    });
  });

  writePortraitPreferences(preferences);
  storage.setItem(MIGRATION_VERSION_KEY, String(MIGRATION_VERSION));
  return Boolean(storage.getItem(PREFERENCES_KEY));
}
