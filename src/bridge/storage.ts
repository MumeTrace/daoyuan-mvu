import { getDaoyuanStorage as getRuntimeStorage } from "./storage-runtime.ts";
import type { DaoyuanKeyValueStorage, TavernHost } from "../types/tavern";

/** Project bridge: select Shujuku storage, browser storage, or safe memory fallback. */
export function getDaoyuanStorage(
  getHost?: () => TavernHost,
): DaoyuanKeyValueStorage {
  return getRuntimeStorage(getHost);
}

/** Project bridge: parse one persisted JSON value without leaking storage failures. */
export function readStorageJson<T>(key: string, fallback: T): T {
  try {
    const raw = getDaoyuanStorage().getItem(key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch (error) {
    console.warn(`[道渊] 读取本地数据 ${key} 失败，已使用默认值。`, error);
    return fallback;
  }
}

/** Project bridge: serialize one JSON value and report whether persistence succeeded. */
export function writeStorageJson(key: string, value: unknown): boolean {
  try {
    getDaoyuanStorage().setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.warn(`[道渊] 保存本地数据 ${key} 失败。`, error);
    return false;
  }
}
