const PREFERENCES_KEY = "daoyuan_portrait_preferences_v2";

function getStorage() {
  return window.DaoyuanStatusStorage || window.localStorage;
}

function createEmptyPreferences() {
  return { activeThemes: {}, indices: {}, customImages: {} };
}

export function readPortraitPreferences() {
  try {
    const saved = getStorage().getItem(PREFERENCES_KEY);
    if (!saved) return createEmptyPreferences();
    const parsed = JSON.parse(saved);
    return {
      activeThemes: parsed?.activeThemes || {},
      indices: parsed?.indices || {},
      customImages: parsed?.customImages || {},
    };
  } catch (error) {
    console.warn("[道渊] 读取立绘偏好失败:", error);
    return createEmptyPreferences();
  }
}

export function writePortraitPreferences(preferences) {
  getStorage().setItem(PREFERENCES_KEY, JSON.stringify(preferences));
}

export function getActiveTheme(name) {
  return readPortraitPreferences().activeThemes[name] || "";
}

export function setActiveTheme(name, theme) {
  const preferences = readPortraitPreferences();
  preferences.activeThemes[name] = theme;
  writePortraitPreferences(preferences);
}

export function getPortraitIndex(name, theme, length) {
  if (length <= 0) return 0;
  const stored = Number(readPortraitPreferences().indices[name]?.[theme]);
  return Number.isInteger(stored) && stored >= 0 ? stored % length : 0;
}

export function setPortraitIndex(name, theme, index) {
  const preferences = readPortraitPreferences();
  preferences.indices[name] ||= {};
  preferences.indices[name][theme] = index;
  writePortraitPreferences(preferences);
}

export function getCustomImages(name, theme) {
  const images = readPortraitPreferences().customImages[name]?.[theme];
  return Array.isArray(images) ? images.slice() : [];
}

export function setCustomImages(name, theme, urls) {
  const preferences = readPortraitPreferences();
  preferences.customImages[name] ||= {};
  preferences.customImages[name][theme] = urls.slice();
  writePortraitPreferences(preferences);
}

export function removeCustomImages(name, theme) {
  const preferences = readPortraitPreferences();
  if (preferences.customImages[name]) {
    delete preferences.customImages[name][theme];
    if (Object.keys(preferences.customImages[name]).length === 0) {
      delete preferences.customImages[name];
    }
    writePortraitPreferences(preferences);
  }
}

export function resetPortraitPreferences() {
  writePortraitPreferences(createEmptyPreferences());
}

export { PREFERENCES_KEY };
