import type { DataRecord, MvuData } from "../types/stat-data";
import type {
  DaoyuanStatusDbApi,
  ShujukuHost,
  ShujukuSubscription,
} from "../types/shujuku";

export interface ShujukuApi {
  /** Shujuku adapter: report whether the early IIFE installed its database facade. */
  isAvailable(): boolean;
  /** Shujuku adapter: wait for AutoCardUpdaterAPI and its variable reader. */
  ready(timeoutMs?: number): Promise<boolean>;
  /** Shujuku adapter: read a normalized full variable snapshot. */
  readVariables(): MvuData | null;
  /** Shujuku adapter: map a stat_data path to a writable table row. */
  resolvePath(path: readonly (string | number)[]): DataRecord | null;
  /** Shujuku adapter: update fields on one resolved database row. */
  update(path: readonly (string | number)[], values: DataRecord): Promise<boolean>;
  /** Shujuku adapter: remove one resolved, non-protected database row. */
  remove(path: readonly (string | number)[]): Promise<boolean>;
  /** Shujuku adapter: append and persist one Jade message. */
  appendJadeMessage(
    name: string,
    sender: string,
    content: string,
  ): Promise<{ success: boolean; history: DataRecord; messageId: string }>;
  /** Shujuku adapter: atomically replace one contact's serialized message history. */
  writeJadeHistory(name: string, history: DataRecord): Promise<boolean>;
  /** Shujuku adapter: remove and persist one Jade message. */
  deleteJadeMessage(name: string, messageId: string): Promise<DataRecord>;
  /** Shujuku adapter: subscribe to table-update events with an explicit stop handle. */
  subscribe(callback: () => void): ShujukuSubscription | null;
}

function browserHost(): ShujukuHost {
  return window;
}

function getDb(getHost: () => ShujukuHost): DaoyuanStatusDbApi | null {
  const db = getHost().DaoyuanStatusDb;
  return db && typeof db === "object" ? db : null;
}

export function createShujukuApi(
  getHost: () => ShujukuHost = browserHost,
): ShujukuApi {
  return {
    isAvailable() {
      return getDb(getHost) !== null;
    },

    async ready(timeoutMs) {
      const db = getDb(getHost);
      return db ? await db.ready(timeoutMs) : false;
    },

    readVariables() {
      const db = getDb(getHost);
      if (!db) return null;
      const result = db.readVariables();
      return result && typeof result === "object" ? result : null;
    },

    resolvePath(path) {
      return getDb(getHost)?.resolvePath(path) ?? null;
    },

    async update(path, values) {
      const db = getDb(getHost);
      if (!db) return false;
      await db.ready();
      return await db.update(path, values);
    },

    async remove(path) {
      const db = getDb(getHost);
      if (!db) return false;
      await db.ready();
      return await db.remove(path);
    },

    async appendJadeMessage(name, sender, content) {
      const db = getDb(getHost);
      if (!db) return { success: false, history: {}, messageId: "" };
      await db.ready();
      return await db.appendJadeMessage(name, sender, content);
    },

    async writeJadeHistory(name, history) {
      const db = getDb(getHost);
      if (!db) return false;
      await db.ready();
      return await db.writeJadeHistory(name, history);
    },

    async deleteJadeMessage(name, messageId) {
      const db = getDb(getHost);
      if (!db) return {};
      await db.ready();
      return await db.deleteJadeMessage(name, messageId);
    },

    subscribe(callback) {
      const db = getDb(getHost);
      if (!db) return null;
      const handle = db.subscribe(callback);
      return handle && typeof handle.stop === "function" ? handle : null;
    },
  };
}

export const shujukuApi = createShujukuApi();
