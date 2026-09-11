import { requireCapability } from "./errors";
import { tavernApi, type TavernApi } from "./tavern-api";
import type { MvuApi, MvuHost } from "../types/mvu";
import type { MvuData } from "../types/stat-data";
import type { VariableOption } from "../types/tavern";

export interface MvuBridge {
  /** Tavern Helper + MVU: wait until the MVU script exports its API. */
  waitUntilReady(): Promise<void>;
  /** MVU: report whether the host has already exported window.Mvu. */
  isAvailable(): boolean;
  /** MVU: returns the full scoped object, including unknown top-level metadata. */
  getMvuData(option: VariableOption): MvuData | null;
  /** MVU: writes a full scoped object. Callers must preserve unknown metadata. */
  replaceMvuData(data: MvuData, option: VariableOption): Promise<void>;
  /** MVU: resolve the version-matched VARIABLE_UPDATE_ENDED event name. */
  getVariableUpdateEndedEvent(): string | null;
}

function browserHost(): MvuHost {
  return window;
}

function getApi(getHost: () => MvuHost): MvuApi {
  return requireCapability(getHost().Mvu, "Mvu", "MVU");
}

export function createMvuBridge(
  getHost: () => MvuHost = browserHost,
  hostApi: TavernApi = tavernApi,
): MvuBridge {
  const isAvailable = (): boolean => getHost().Mvu !== undefined;

  return {
    async waitUntilReady() {
      if (!isAvailable()) {
        await hostApi.waitGlobalInitialized("Mvu");
      }
      getApi(getHost);
    },

    isAvailable,

    getMvuData(option) {
      const result = getApi(getHost).getMvuData(option);
      return result && typeof result === "object" ? result : null;
    },

    async replaceMvuData(data, option) {
      const api = getApi(getHost);
      await api.replaceMvuData(data, option);
    },

    getVariableUpdateEndedEvent() {
      return getHost().Mvu?.events?.VARIABLE_UPDATE_ENDED ?? null;
    },
  };
}

export const mvuBridge = createMvuBridge();
