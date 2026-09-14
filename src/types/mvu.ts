import type { MvuData } from "./stat-data";
import type { VariableOption } from "./tavern";

export interface MvuEvents {
  VARIABLE_INITIALIZED?: string;
  VARIABLE_UPDATE_STARTED?: string;
  COMMAND_PARSED?: string;
  VARIABLE_UPDATE_ENDED?: string;
  BEFORE_MESSAGE_UPDATE?: string;
  [key: string]: string | undefined;
}

export interface MvuApi {
  events?: MvuEvents;
  getMvuData(option: VariableOption): MvuData | null | undefined;
  replaceMvuData(
    data: MvuData,
    option: VariableOption,
  ): Promise<unknown> | unknown;
  parseMessage?: (message: string, data: MvuData) => Promise<MvuData | null>;
}

export interface MvuHost {
  Mvu?: MvuApi;
}
