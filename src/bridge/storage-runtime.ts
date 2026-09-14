import type { DaoyuanKeyValueStorage, TavernHost } from "../types/tavern";

class MemoryStorage implements DaoyuanKeyValueStorage {
  readonly #items = new Map<string, string>();

  hasItem(key: string): boolean {
    return this.#items.has(String(key));
  }

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
const volatileKeys = new Set<string>();
const removedKeys = new Set<string>();
let volatileClear = false;
const resilientStorageCache = new WeakMap<object, DaoyuanKeyValueStorage>();
let warnedAboutFallback = false;

function withVolatileFallback(
  backend: DaoyuanKeyValueStorage,
): DaoyuanKeyValueStorage {
  const cached = resilientStorageCache.get(backend as object);
  if (cached) return cached;

  const memory = new MemoryStorage();
  const pendingWrites = new Set<string>();
  const pendingRemovals = new Set<string>();
  let pendingClear = false;
  const wrapped: DaoyuanKeyValueStorage = {
    getItem(key): string | null {
      const normalizedKey = String(key);
      if (
        pendingWrites.has(normalizedKey) ||
        (pendingClear && memory.hasItem(normalizedKey))
      ) {
        return memory.getItem(normalizedKey);
      }
      if (pendingRemovals.has(normalizedKey) || pendingClear) return null;
      return backend.getItem(normalizedKey);
    },
    setItem(key, value): void {
      const normalizedKey = String(key);
      const normalizedValue = String(value);
      memory.setItem(normalizedKey, normalizedValue);
      pendingWrites.add(normalizedKey);
      pendingRemovals.delete(normalizedKey);
      try {
        backend.setItem(normalizedKey, normalizedValue);
        pendingWrites.delete(normalizedKey);
      } catch (error) {
        warnFallback(error);
        throw error;
      }
    },
    removeItem(key): void {
      const normalizedKey = String(key);
      memory.removeItem(normalizedKey);
      pendingWrites.delete(normalizedKey);
      pendingRemovals.add(normalizedKey);
      try {
        backend.removeItem(normalizedKey);
        pendingRemovals.delete(normalizedKey);
      } catch (error) {
        warnFallback(error);
        throw error;
      }
    },
    clear(): void {
      memory.clear();
      pendingWrites.clear();
      pendingRemovals.clear();
      pendingClear = true;
      try {
        backend.clear();
        pendingClear = false;
      } catch (error) {
        warnFallback(error);
        throw error;
      }
    },
  };
  resilientStorageCache.set(backend as object, wrapped);
  return wrapped;
}

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
    if (
      volatileKeys.has(normalizedKey) ||
      (volatileClear && memoryStorage.hasItem(normalizedKey))
    ) {
      return memoryStorage.getItem(normalizedKey);
    }
    if (removedKeys.has(normalizedKey) || volatileClear) return null;
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
    memoryStorage.setItem(normalizedKey, normalizedValue);
    volatileKeys.add(normalizedKey);
    removedKeys.delete(normalizedKey);
    const storages = browserStorages();
    let persisted = 0;
    let lastError: unknown;
    for (const storage of storages) {
      try {
        storage.setItem(normalizedKey, normalizedValue);
        persisted += 1;
      } catch (error) {
        lastError = error;
        // Keep trying other accessible storage scopes.
      }
    }
    if (persisted > 0) {
      if (persisted === storages.length) volatileKeys.delete(normalizedKey);
      return;
    }
    warnFallback(lastError ?? new Error("没有可写入的浏览器存储"));
    if (storages.length > 0) {
      // The volatile value remains readable for this session, while the error
      // tells callers that it was not persisted across reloads.
      throw lastError ?? new Error("浏览器存储写入失败");
    }
  },
  removeItem(key): void {
    const normalizedKey = String(key);
    memoryStorage.removeItem(normalizedKey);
    volatileKeys.delete(normalizedKey);
    removedKeys.add(normalizedKey);
    const storages = browserStorages();
    let removed = 0;
    let lastError: unknown;
    storages.forEach((storage) => {
      try {
        storage.removeItem(normalizedKey);
        removed += 1;
      } catch (error) {
        lastError = error;
        // Keep removing from other accessible storage scopes.
      }
    });
    if (removed === storages.length) removedKeys.delete(normalizedKey);
    if (storages.length > 0 && removed === 0) {
      warnFallback(lastError);
      throw lastError ?? new Error("浏览器存储删除失败");
    }
  },
  clear(): void {
    memoryStorage.clear();
    volatileKeys.clear();
    removedKeys.clear();
    volatileClear = true;
    const storages = browserStorages();
    let cleared = 0;
    let lastError: unknown;
    storages.forEach((storage) => {
      try {
        storage.clear();
        cleared += 1;
      } catch (error) {
        lastError = error;
        // Keep clearing other accessible storage scopes.
      }
    });
    if (cleared === storages.length && storages.length > 0) volatileClear = false;
    if (storages.length > 0 && cleared === 0) {
      warnFallback(lastError);
      throw lastError ?? new Error("浏览器存储清空失败");
    }
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
    const providedStorage = host.DaoyuanStatusStorage ??
      (getHost === browserHost ? null : host.localStorage);
    const storage = providedStorage
      ? withVolatileFallback(providedStorage)
      : getHost === browserHost
        ? sharedBrowserStorage
        : null;
    if (!storage) return memoryStorage;
    storage.getItem("__daoyuan_storage_probe__");
    return storage;
  } catch (error) {
    warnFallback(error);
    return memoryStorage;
  }
}
