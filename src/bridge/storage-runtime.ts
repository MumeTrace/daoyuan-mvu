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

function browserStorageRoots(): Window[] {
  const roots: Window[] = [];
  try {
    if (window.parent && window.parent !== window) roots.push(window.parent);
  } catch {
    // Cross-origin parents are intentionally ignored.
  }
  try {
    if (window.top && window.top !== window && !roots.includes(window.top)) {
      roots.push(window.top);
    }
  } catch {
    // Cross-origin top windows are intentionally ignored.
  }
  roots.push(window);
  return roots;
}

function browserStorages(): Storage[] {
  const storages: Storage[] = [];
  for (const root of browserStorageRoots()) {
    try {
      const storage = root.localStorage;
      storage.getItem("__daoyuan_storage_probe__");
      if (!storages.includes(storage)) storages.push(storage);
    } catch {
      // Continue to the next accessible window/storage scope.
    }
  }
  return storages;
}

const sharedBrowserStorage: DaoyuanKeyValueStorage = {
  getItem(key): string | null {
    const normalizedKey = String(key);
    const storages = browserStorages();
    for (const [index, storage] of storages.entries()) {
      try {
        const value = storage.getItem(normalizedKey);
        if (value === null) continue;
        // Backfill the parent-first storage scopes so existing iframe-local
        // data becomes reusable when the status-bar message is recreated.
        storages.slice(0, index).forEach((target) => {
          try {
            target.setItem(normalizedKey, value);
          } catch {
            // A readable scope may still be read-only or out of quota.
          }
        });
        return value;
      } catch {
        // Continue to the next accessible storage scope.
      }
    }
    return storages.length === 0
      ? memoryStorage.getItem(normalizedKey)
      : null;
  },
  setItem(key, value): void {
    const normalizedKey = String(key);
    const normalizedValue = String(value);
    const storages = browserStorages();
    let persisted = false;
    let lastError: unknown;
    for (const storage of storages) {
      try {
        storage.setItem(normalizedKey, normalizedValue);
        persisted = true;
      } catch (error) {
        lastError = error;
        // Keep trying other accessible storage scopes.
      }
    }
    if (storages.length > 0 && !persisted) {
      throw lastError ?? new Error("浏览器存储写入失败");
    }
    memoryStorage.setItem(normalizedKey, normalizedValue);
    if (!persisted) warnFallback(new Error("没有可写入的浏览器存储"));
  },
  removeItem(key): void {
    const normalizedKey = String(key);
    browserStorages().forEach((storage) => {
      try {
        storage.removeItem(normalizedKey);
      } catch {
        // Keep removing from other accessible storage scopes.
      }
    });
    memoryStorage.removeItem(normalizedKey);
  },
  clear(): void {
    browserStorages().forEach((storage) => {
      try {
        storage.clear();
      } catch {
        // Keep clearing other accessible storage scopes.
      }
    });
    memoryStorage.clear();
  },
};

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
    const storage =
      host.DaoyuanStatusStorage ??
      (getHost === browserHost ? sharedBrowserStorage : host.localStorage);
    if (!storage) return memoryStorage;
    storage.getItem("__daoyuan_storage_probe__");
    return storage;
  } catch (error) {
    warnFallback(error);
    return memoryStorage;
  }
}
