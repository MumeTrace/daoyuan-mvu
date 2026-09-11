import { HostCapabilityError, requireCapability } from "./errors";
import type { DataRecord } from "../types/stat-data";
import type {
  ChatMessage,
  GenerateOptions,
  GenerateResult,
  TavernHost,
  VariableOption,
} from "../types/tavern";

export interface TavernApi {
  /** Tavern Helper: capability probe that never invokes the host function. */
  has(capability: keyof TavernHost): boolean;
  /** Tavern Helper: wait for an asynchronously exported global such as MVU. */
  waitGlobalInitialized(name: string): Promise<void>;
  /** Tavern Helper: merged, read-only variable visibility for this iframe. */
  getAllVariables(): DataRecord | null;
  /** Tavern Helper: read one explicit variable scope. */
  getVariables(option: VariableOption): DataRecord | null;
  /** Tavern Helper: the message floor containing this frontend, when available. */
  getCurrentMessageId(): number | null;
  /** Tavern Helper: latest chat floor, which is not necessarily this iframe's floor. */
  getLastMessageId(): number | null;
  /** Tavern Helper: read chat messages without mutating or refreshing the chat. */
  getChatMessages(range: string | number, options?: DataRecord): ChatMessage[];
  /** Tavern Helper generation; callers must narrow tool-call results. */
  generate(options: GenerateOptions): Promise<GenerateResult>;
  /** Project wrapper over Tavern Helper generation that rejects non-text results. */
  generateText(options: GenerateOptions): Promise<string>;
  /** Tavern Helper: stop only the direct generation owned by this UI. */
  stopGenerationById(generationId: string): boolean;
  /** Resolve a version-matched Tavern Helper iframe event name when exported. */
  getIframeEventName(event: keyof NonNullable<TavernHost["iframe_events"]>): string | null;
  /** Tavern Helper persona API. Null means there is no usable avatar. */
  getPersonaAvatarPath(personaId?: "current" | string): string | null;
}

function browserHost(): TavernHost {
  return window;
}

function asRecord(value: unknown): DataRecord | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as DataRecord)
    : null;
}

export function createTavernApi(
  getHost: () => TavernHost = browserHost,
): TavernApi {
  const generate = async (options: GenerateOptions): Promise<GenerateResult> => {
    const host = getHost();
    const fn = requireCapability(host.generate, "generate", "Tavern Helper");
    return await fn.call(host, options);
  };

  return {
    has(capability) {
      return typeof getHost()[capability] === "function";
    },

    async waitGlobalInitialized(name) {
      const fn = requireCapability(
        getHost().waitGlobalInitialized,
        "waitGlobalInitialized",
        "Tavern Helper",
      );
      await fn.call(getHost(), name);
    },

    getAllVariables() {
      const fn = getHost().getAllVariables;
      return typeof fn === "function" ? asRecord(fn.call(getHost())) : null;
    },

    getVariables(option) {
      const fn = getHost().getVariables;
      return typeof fn === "function"
        ? asRecord(fn.call(getHost(), option))
        : null;
    },

    getCurrentMessageId() {
      const fn = getHost().getCurrentMessageId;
      const value = typeof fn === "function" ? fn.call(getHost()) : null;
      return typeof value === "number" && Number.isInteger(value) ? value : null;
    },

    getLastMessageId() {
      const fn = getHost().getLastMessageId;
      const value = typeof fn === "function" ? fn.call(getHost()) : null;
      return typeof value === "number" && Number.isInteger(value) ? value : null;
    },

    getChatMessages(range, options) {
      const fn = requireCapability(
        getHost().getChatMessages,
        "getChatMessages",
        "Tavern Helper",
      );
      const result = fn.call(getHost(), range, options);
      return Array.isArray(result) ? result : [];
    },

    generate,

    async generateText(options) {
      const result = await generate(options);
      if (typeof result !== "string") {
        throw new HostCapabilityError("generate 返回文本", "Tavern Helper");
      }
      return result;
    },

    stopGenerationById(generationId) {
      const host = getHost();
      const fn = host.stopGenerationById;
      return typeof fn === "function" ? fn.call(host, generationId) === true : false;
    },

    getIframeEventName(event) {
      const value = getHost().iframe_events?.[event];
      return typeof value === "string" && value.length > 0 ? value : null;
    },

    getPersonaAvatarPath(personaId = "current") {
      const fn = getHost().getPersonaAvatarPath;
      if (typeof fn !== "function") return null;
      const result = fn.call(getHost(), personaId);
      return typeof result === "string" && result.length > 0 ? result : null;
    },
  };
}

export const tavernApi = createTavernApi();
