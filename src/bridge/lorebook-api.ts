import { requireCapability } from "./errors";
import type { DataRecord } from "../types/stat-data";
import type { TavernHost } from "../types/tavern";

export interface LorebookEntry extends DataRecord {
  uid?: string | number;
  name?: string;
  enabled?: boolean;
  comment?: string;
  key?: string[] | string;
  content?: string;
}

export interface CharacterBookNames {
  primary: string | null;
  additional: string[];
}

export interface LorebookApi {
  /** Tavern Helper: capability probe for legacy/community lorebook methods. */
  isAvailable(capability?: keyof Pick<
    TavernHost,
    | "getOrCreateChatLorebook"
    | "getCurrentCharPrimaryLorebook"
    | "getCharLorebooks"
    | "getLorebookEntries"
    | "getCharWorldbookNames"
    | "getWorldbook"
  >): boolean;
  /** Tavern Helper legacy/community lorebook API. */
  getOrCreateChatLorebook(): Promise<string | null>;
  /** Tavern Helper legacy/community lorebook API. */
  getCurrentCharPrimaryLorebook(): Promise<string | null>;
  /** Tavern Helper: normalize all supported character-lorebook result shapes. */
  getCharLorebookNames(options: { name: string }): Promise<string[]>;
  /** Tavern Helper: current character primary and additional books, modern API first. */
  getCurrentCharacterBookNames(): Promise<CharacterBookNames>;
  /** Tavern Helper: normalize lorebook entries to object records. */
  getLorebookEntries(
    name: string,
    options?: { fields?: string[] },
  ): Promise<LorebookEntry[]>;
  /** Tavern Helper: read a whole book using the modern API with legacy fallback. */
  getBookEntries(name: string): Promise<LorebookEntry[]>;
}

function browserHost(): TavernHost {
  return window;
}

function normalizeBookNames(value: unknown): string[] {
  const names = new Set<string>();
  const visit = (candidate: unknown): void => {
    if (typeof candidate === "string" && candidate.trim()) {
      names.add(candidate.trim());
      return;
    }
    if (Array.isArray(candidate)) {
      candidate.forEach(visit);
      return;
    }
    if (candidate && typeof candidate === "object") {
      Object.values(candidate).forEach(visit);
    }
  };
  visit(value);
  return [...names];
}

function normalizeCharacterBookNames(value: unknown): CharacterBookNames {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { primary: null, additional: [] };
  }
  const record = value as Record<string, unknown>;
  const primary = typeof record.primary === "string" && record.primary.trim()
    ? record.primary.trim()
    : null;
  const additional = Array.isArray(record.additional)
    ? record.additional
        .filter((name): name is string => typeof name === "string" && Boolean(name.trim()))
        .map((name) => name.trim())
    : [];
  return { primary, additional: [...new Set(additional)] };
}

function normalizeEntries(value: unknown): LorebookEntry[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (entry): entry is Record<string, unknown> =>
        entry !== null && typeof entry === "object" && !Array.isArray(entry),
    )
    .map((entry) => {
      const strategy = entry.strategy;
      const keys = strategy && typeof strategy === "object" && !Array.isArray(strategy)
        ? (strategy as Record<string, unknown>).keys
        : undefined;
      const normalizedKeys = Array.isArray(keys)
        ? keys.filter((key): key is string => typeof key === "string")
        : entry.key;
      return {
        ...entry,
        name: typeof entry.name === "string" ? entry.name : undefined,
        comment: typeof entry.comment === "string"
          ? entry.comment
          : typeof entry.name === "string"
            ? entry.name
            : undefined,
        key: Array.isArray(normalizedKeys) || typeof normalizedKeys === "string"
          ? normalizedKeys
          : [],
        content: typeof entry.content === "string" ? entry.content : undefined,
      } as LorebookEntry;
    });
}

export function createLorebookApi(
  getHost: () => TavernHost = browserHost,
): LorebookApi {
  return {
    isAvailable(capability = "getLorebookEntries") {
      return typeof getHost()[capability] === "function";
    },

    async getOrCreateChatLorebook() {
      const fn = requireCapability(
        getHost().getOrCreateChatLorebook,
        "getOrCreateChatLorebook",
        "Tavern Helper",
      );
      const result = await fn.call(getHost());
      return typeof result === "string" && result.length > 0 ? result : null;
    },

    async getCurrentCharPrimaryLorebook() {
      const fn = requireCapability(
        getHost().getCurrentCharPrimaryLorebook,
        "getCurrentCharPrimaryLorebook",
        "Tavern Helper",
      );
      const result = await fn.call(getHost());
      return typeof result === "string" && result.length > 0 ? result : null;
    },

    async getCharLorebookNames(options) {
      const fn = requireCapability(
        getHost().getCharLorebooks,
        "getCharLorebooks",
        "Tavern Helper",
      );
      return normalizeBookNames(await fn.call(getHost(), options));
    },

    async getCurrentCharacterBookNames() {
      const host = getHost();
      if (typeof host.getCharWorldbookNames === "function") {
        return normalizeCharacterBookNames(
          await host.getCharWorldbookNames.call(host, "current"),
        );
      }
      if (typeof host.getCharLorebooks === "function") {
        return normalizeCharacterBookNames(
          await host.getCharLorebooks.call(host, { type: "all" }),
        );
      }
      if (typeof host.getCurrentCharPrimaryLorebook === "function") {
        const primary = await host.getCurrentCharPrimaryLorebook.call(host);
        return {
          primary: typeof primary === "string" && primary.trim() ? primary.trim() : null,
          additional: [],
        };
      }
      return { primary: null, additional: [] };
    },

    async getLorebookEntries(name, options = {}) {
      const fn = requireCapability(
        getHost().getLorebookEntries,
        "getLorebookEntries",
        "Tavern Helper",
      );
      const result = await fn.call(getHost(), name, options);
      return normalizeEntries(result);
    },

    async getBookEntries(name) {
      const host = getHost();
      if (typeof host.getWorldbook === "function") {
        return normalizeEntries(await host.getWorldbook.call(host, name));
      }
      if (typeof host.getLorebookEntries === "function") {
        return this.getLorebookEntries(name, {
          fields: ["uid", "name", "comment", "key", "content", "enabled"],
        });
      }
      return [];
    },
  };
}

export const lorebookApi = createLorebookApi();
