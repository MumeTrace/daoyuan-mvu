import type { DaoyuanKeyValueStorage, TavernHost } from "../types/tavern";

class MemoryStorage implements DaoyuanKeyValueStorage {
  readonly #items = new Map<string, string>();

  clear(): void {
    this.#items.clear();
  }

  getItem(key: string): string | null {
    return this.#items.get(String(key)) ?? null;
  }

  removeItem(key: string): void {
    this.#items.delete(String(key));
  }

  setItem(key: string, value: string): void {
    this.#items.set(String(key), String(value));
  }
}

const memoryStorage = new MemoryStorage();
let warnedAboutFallback = false;

function browserHost(): TavernHost {
  return window;
}

function warnFallback(error: unknown): void {
  if (warnedAboutFallback) return;
  warnedAboutFallback = true;
  console.warn(
    "[道渊] 持久化存储不可用，本次会话改用内存存储；刷新后数据不会保留。",
    error,
  );
}

/** Project bridge: prefer database-scoped storage, then browser localStorage. */
export function getDaoyuanStorage(
  getHost: () => TavernHost = browserHost,
): DaoyuanKeyValueStorage {
  try {
    const host = getHost();
    const storage = host.DaoyuanStatusStorage ?? host.localStorage;
    if (!storage) return memoryStorage;
    storage.getItem("__daoyuan_storage_probe__");
    return storage;
  } catch (error) {
    warnFallback(error);
    return memoryStorage;
  }
}
