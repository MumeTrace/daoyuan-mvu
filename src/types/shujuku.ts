import type { DataRecord, MvuData } from "./stat-data";

export interface ShujukuRow extends DataRecord {
  id?: string | number;
}

export interface AutoCardUpdaterApi {
  exportTableAsJson(): Promise<unknown> | unknown;
  updateRow(...args: unknown[]): Promise<unknown> | unknown;
  deleteRow(...args: unknown[]): Promise<unknown> | unknown;
  insertRow(...args: unknown[]): Promise<unknown> | unknown;
  updateCell(...args: unknown[]): Promise<unknown> | unknown;
}

export interface ShujukuSubscription {
  stop(): void;
}

export interface DaoyuanStatusDbApi {
  getApi(): AutoCardUpdaterApi | null;
  readVariables(): MvuData;
  resolvePath(path: readonly (string | number)[]): DataRecord | null;
  update(path: readonly (string | number)[], values: DataRecord): Promise<boolean>;
  remove(path: readonly (string | number)[]): Promise<boolean>;
  appendJadeMessage(
    name: string,
    sender: string,
    content: string,
  ): Promise<{ success: boolean; history: DataRecord; messageId: string }>;
  writeJadeHistory(name: string, history: DataRecord): Promise<boolean>;
  deleteJadeMessage(name: string, messageId: string): Promise<DataRecord>;
  ready(timeoutMs?: number): Promise<boolean>;
  subscribe(callback: () => void): ShujukuSubscription;
}

export interface ShujukuHost {
  AutoCardUpdaterAPI?: AutoCardUpdaterApi;
  DaoyuanStatusDb?: DaoyuanStatusDbApi;
}
