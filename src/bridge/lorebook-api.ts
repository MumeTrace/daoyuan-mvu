import { requireCapability } from "./errors";
import type { DataRecord } from "../types/stat-data";
import type { TavernHost } from "../types/tavern";

export interface LorebookEntry extends DataRecord {
  uid?: string | number;
  comment?: string;
  key?: string[] | string;
  content?: string;
}

export interface LorebookApi {
  /** Tavern Helper: capability probe for legacy/community lorebook methods. */
  isAvailable(capability?: keyof Pick<
    TavernHost,
    | "getOrCreateChatLorebook"
    | "getCurrentCharPrimaryLorebook"
    | "getCharLorebooks"
    | "getLorebookEntries"
  >): boolean;
  /** Tavern Helper legacy/community lorebook API. */
  getOrCreateChatLorebook(): Promise<string | null>;
  /** Tavern Helper legacy/community lorebook API. */
  getCurrentCharPrimaryLorebook(): Promise<string | null>;
  /** Tavern Helper: normalize all supported character-lorebook result shapes. */
  getCharLorebookNames(options: { name: string }): Promise<string[]>;
  /** Tavern Helper: normalize lorebook entries to object records. */
  getLorebookEntries(
    name: string,
    options?: { fields?: string[] },
  ): Promise<LorebookEntry[]>;
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

    async getLorebookEntries(name, options = {}) {
      const fn = requireCapability(
        getHost().getLorebookEntries,
        "getLorebookEntries",
        "Tavern Helper",
      );
      const result = await fn.call(getHost(), name, options);
      return Array.isArray(result)
        ? result.filter(
            (entry): entry is LorebookEntry =>
              entry !== null && typeof entry === "object" && !Array.isArray(entry),
          )
        : [];
    },
  };
}

export const lorebookApi = createLorebookApi();
