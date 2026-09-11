import type { DataRecord } from "./stat-data";
import type { DaoyuanStatusDbApi } from "./shujuku";

export type MessageId = number | "latest";

export type VariableOption =
  | { type: "chat" | "preset" | "global" }
  | { type: "character" }
  | { type: "message"; message_id?: MessageId }
  | { type: "script"; script_id?: string }
  | { type: "extension"; extension_id: string };

export interface ChatMessage extends DataRecord {
  message_id: number;
  mes?: string;
  name?: string;
  role?: string;
  data?: DataRecord;
}

export interface GenerateOptions extends DataRecord {
  generation_id?: string;
  user_input?: string;
  should_stream?: boolean;
  should_silence?: boolean;
  max_chat_history?: number;
}

export type GenerateResult = string | DataRecord;

export interface TavernIframeEvents {
  GENERATION_STARTED?: string;
  STREAM_TOKEN_RECEIVED_FULLY?: string;
  STREAM_TOKEN_RECEIVED_INCREMENTALLY?: string;
  GENERATION_ENDED?: string;
}

export interface TavernEventHandle {
  stop(): void;
}

export interface DaoyuanKeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  clear(): void;
}

export type TavernEventHandler = (...args: unknown[]) => unknown;

export interface TavernHost {
  waitGlobalInitialized?: (name: string) => Promise<unknown> | unknown;
  getAllVariables?: () => DataRecord | null | undefined;
  getVariables?: (option: VariableOption) => DataRecord | null | undefined;
  getCurrentMessageId?: () => number | null | undefined;
  getLastMessageId?: () => number;
  getChatMessages?: (
    range: string | number,
    options?: DataRecord,
  ) => ChatMessage[] | null | undefined;
  generate?: (options: GenerateOptions) => Promise<GenerateResult> | GenerateResult;
  stopGenerationById?: (generationId: string) => boolean;
  stopAllGeneration?: () => boolean;
  iframe_events?: TavernIframeEvents;
  getPersonaAvatarPath?: (personaId?: "current" | string) => string | null;
  eventOn?: (
    event: string,
    handler: TavernEventHandler,
  ) => TavernEventHandle | void;
  eventOff?: (event: string, handler: TavernEventHandler) => void;
  eventEmit?: (event: string, ...args: unknown[]) => Promise<unknown> | unknown;
  getOrCreateChatLorebook?: () => Promise<string | null> | string | null;
  getCurrentCharPrimaryLorebook?: () => Promise<string | null> | string | null;
  getCharLorebooks?: (options: { name: string }) => unknown;
  getLorebookEntries?: (name: string, options?: { fields?: string[] }) => unknown;
  DaoyuanStatusStorage?: DaoyuanKeyValueStorage;
  DaoyuanStatusDb?: DaoyuanStatusDbApi;
  localStorage?: Storage;
}
