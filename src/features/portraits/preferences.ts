import { getDaoyuanStorage } from "../../bridge/storage.ts";
import {
  pruneLocalPortraitImages,
  resolvePortraitImageUrls,
} from "./local-images.ts";

export const PREFERENCES_KEY = "daoyuan_portrait_preferences_v2";

export interface PortraitPreferences {
  activeThemes: Record<string, string>;
  indices: Record<string, Record<string, number>>;
  customImages: Record<string, Record<string, string[]>>;
}

let transientPreferences: string | null = null;

export const emptyPortraitPreferences = (): PortraitPreferences => ({
  activeThemes: {},
  indices: {},
  customImages: {},
});

function stringRecord(value: unknown): Record<string, string> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? { ...(value as Record<string, string>) }
    : {};
}

function nestedNumberRecord(
  value: unknown,
): Record<string, Record<string, number>> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? { ...(value as Record<string, Record<string, number>>) }
    : {};
}

function nestedImages(
  value: unknown,
): Record<string, Record<string, string[]>> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? { ...(value as Record<string, Record<string, string[]>>) }
    : {};
}

export function normalizePortraitPreferences(
  value: unknown,
): PortraitPreferences {
  const parsed =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  return {
    activeThemes: stringRecord(parsed.activeThemes),
    indices: nestedNumberRecord(parsed.indices),
    customImages: nestedImages(parsed.customImages),
  };
}

export function readPortraitPreferences(): PortraitPreferences {
  try {
    const saved =
      transientPreferences ?? getDaoyuanStorage().getItem(PREFERENCES_KEY);
    if (!saved) return emptyPortraitPreferences();
    return normalizePortraitPreferences(JSON.parse(saved));
  } catch (error) {
    console.warn("[道渊] 读取立绘偏好失败:", error);
    return emptyPortraitPreferences();
  }
}

export function writePortraitPreferences(value: PortraitPreferences): boolean {
  const storage = getDaoyuanStorage();
  const serialized = JSON.stringify(value);
  storage.setItem(PREFERENCES_KEY, serialized);
  if (storage.getItem(PREFERENCES_KEY) !== serialized) {
    throw new Error("立绘偏好未能持久化到浏览器存储");
  }
  transientPreferences = null;
  return true;
}

function storedCustomImageUrls(value: PortraitPreferences): string[] {
  return Object.values(value.customImages).flatMap((themes) =>
    Object.values(themes).flatMap((urls) =>
      Array.isArray(urls) ? urls : [],
    ),
  );
}

function pruneUnusedLocalImages(value: PortraitPreferences): void {
  void pruneLocalPortraitImages(storedCustomImageUrls(value)).catch((error) =>
    console.warn("[道渊] 清理未使用的本地立绘失败:", error),
  );
}

export function useTransientPortraitPreferences(
  value: PortraitPreferences,
): void {
  transientPreferences = JSON.stringify(value);
}

export function getActiveTheme(name: string): string {
  return readPortraitPreferences().activeThemes[name] ?? "";
}

export function setActiveTheme(name: string, theme: string): void {
  const value = readPortraitPreferences();
  value.activeThemes[name] = theme;
  writePortraitPreferences(value);
}

export function getPortraitIndex(
  name: string,
  theme: string,
  length: number,
): number {
  if (length <= 0) return 0;
  const index = Number(readPortraitPreferences().indices[name]?.[theme]);
  return Number.isInteger(index) && index >= 0 ? index % length : 0;
}

export function setPortraitIndex(
  name: string,
  theme: string,
  index: number,
): void {
  const value = readPortraitPreferences();
  value.indices[name] ??= {};
  value.indices[name]![theme] = index;
  writePortraitPreferences(value);
}

export function getCustomImages(name: string, theme: string): string[] {
  return resolvePortraitImageUrls(
    readPortraitPreferences().customImages[name]?.[theme],
  );
}

export function setCustomImages(
  name: string,
  theme: string,
  urls: string[],
): void {
  const value = readPortraitPreferences();
  value.customImages[name] ??= {};
  value.customImages[name]![theme] = [...urls];
  writePortraitPreferences(value);
}

export function removeCustomImages(name: string, theme: string): void {
  const value = readPortraitPreferences();
  if (!value.customImages[name]) return;
  delete value.customImages[name]![theme];
  if (!Object.keys(value.customImages[name]!).length) {
    delete value.customImages[name];
  }
  writePortraitPreferences(value);
  pruneUnusedLocalImages(value);
}

export function resetPortraitPreferences(): void {
  const value = emptyPortraitPreferences();
  writePortraitPreferences(value);
  pruneUnusedLocalImages(value);
}
