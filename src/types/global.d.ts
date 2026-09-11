import type { MvuApi } from "./mvu";
import type { TavernHost } from "./tavern";
import type { AutoCardUpdaterApi } from "./shujuku";

declare global {
  interface Window extends TavernHost {
    Mvu?: MvuApi;
    AutoCardUpdaterAPI?: AutoCardUpdaterApi;
  }
}

export {};
