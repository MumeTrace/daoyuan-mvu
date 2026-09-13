export type WorkshopEntryKind = "character" | "worldbook";

export interface WorkshopEntryIndexItem {
  readonly packageId: string;
  readonly packageDisplayName: string;
  readonly version: string;
  readonly entryId: string;
  readonly kind: WorkshopEntryKind;
  readonly displayName: string;
  readonly primaryKeys: readonly string[];
}

export interface WorkshopEntryIndexEnvelope {
  readonly schemaVersion: 1;
  readonly data: {
    readonly revision: number;
    readonly workshopOrigin: string;
    readonly entries: readonly WorkshopEntryIndexItem[];
  };
}

export interface DaoyuanWorkshopApi {
  readonly open?: () => void;
  readonly getEntry?: () => Promise<unknown> | unknown;
  readonly getImages?: () => Promise<unknown> | unknown;
}

export interface DaoyuanWorkshopHost {
  DaoyuanWorkshopAPI?: DaoyuanWorkshopApi;
}

export interface WorkshopRuntime {
  waitGlobalInitialized?: (name: string) => Promise<unknown> | unknown;
  parent?: unknown;
}
