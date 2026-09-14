import type { MvuApi } from "./mvu";
import type { TavernHost } from "./tavern";
import type { AutoCardUpdaterApi } from "./shujuku";
import type { DaoyuanWorkshopHost } from "../features/image-library/workshop/types";

declare global {
  interface Window extends TavernHost, DaoyuanWorkshopHost {
    Mvu?: MvuApi;
    AutoCardUpdaterAPI?: AutoCardUpdaterApi;
  }
}

export {};
