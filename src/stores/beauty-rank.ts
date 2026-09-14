import { ref } from "vue";
import { defineStore } from "pinia";
import { readStorageJson, writeStorageJson } from "../bridge/storage";
import { asNamedRecord, asRecord } from "./helpers";
import type { DataRecord, NamedRecord, StatData } from "../types/stat-data";

export const BEAUTY_FORUM_SETTINGS_KEY = "daoyuan_beauty_forum_settings";
export const BEAUTY_FORUM_PRESETS_KEY = "daoyuan_beauty_forum_presets";
export const DEFAULT_BEAUTY_FORUM_REPLY_INSTRUCTION =
  "请你以另一位匿名道友的身份，针对上一条评论进行互喷/抬杠/吐槽，语气像修仙界坊市泼皮骂街。50字以内，禁止使用<!-- -->或任何思考标签。只输出纯评论内容，不要角色名、不要引号、不要任何格式标记。";

export interface BeautyForumSettings extends DataRecord {
  apiBaseUrl: string;
  apiKey: string;
  apiModel: string;
  replyInstruction: string;
  extraPrompt: string;
  temperature: number;
}

export interface BeautyCard {
  name: string;
  data: DataRecord;
}

export type BeautyForumFloorStatus = "done" | "pending" | "error";

export interface BeautyForumFloor {
  id: string;
  content: string;
  userContent?: string;
  aiContent?: string;
  createdAt: number;
  time: string;
  replyTo: number | null;
  floor: number;
  likes: number;
  liked: boolean;
  status: BeautyForumFloorStatus;
  error: string;
}

export const DEFAULT_BEAUTY_FORUM_SETTINGS: BeautyForumSettings = {
  apiBaseUrl: "",
  apiKey: "",
  apiModel: "",
  replyInstruction: DEFAULT_BEAUTY_FORUM_REPLY_INSTRUCTION,
  extraPrompt: "",
  temperature: 0.7,
};

function cloneSettings(value: unknown): BeautyForumSettings {
  const source = asRecord(value);
  const temperature = Number(source.temperature);
  return {
    ...DEFAULT_BEAUTY_FORUM_SETTINGS,
    ...source,
    apiBaseUrl: String(source.apiBaseUrl ?? ""),
    apiKey: String(source.apiKey ?? ""),
    apiModel: String(source.apiModel ?? ""),
    replyInstruction: String(
      source.replyInstruction ?? DEFAULT_BEAUTY_FORUM_REPLY_INSTRUCTION,
    ),
    extraPrompt: String(source.extraPrompt ?? ""),
    temperature: Number.isFinite(temperature) ? temperature : 0.7,
  };
}

function loadPresets(): Record<string, BeautyForumSettings> {
  const stored = asRecord(readStorageJson<unknown>(BEAUTY_FORUM_PRESETS_KEY, {}));
  return Object.fromEntries(
    Object.entries(stored).map(([name, settings]) => [name, cloneSettings(settings)]),
  );
}

function beautyRankOrder(data: DataRecord): number {
  const explicitValue = data.排名序;
  if (explicitValue !== null && explicitValue !== undefined && String(explicitValue).trim()) {
    const explicit = Number(explicitValue);
    if (Number.isFinite(explicit)) return explicit;
  }

  const raw = String(data.排名 ?? "").trim().replace(/^第/, "").replace(/名$/, "");
  const numeric = Number.parseInt(raw, 10);
  if (Number.isFinite(numeric)) return numeric;

  const digits: Record<string, number> = {
    零: 0, 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5,
    六: 6, 七: 7, 八: 8, 九: 9,
  };
  let rest = raw;
  let total = 0;
  const hundredIndex = rest.indexOf("百");
  if (hundredIndex >= 0) {
    total += (digits[rest.slice(0, hundredIndex)] ?? 1) * 100;
    rest = rest.slice(hundredIndex + 1);
  }
  const tenIndex = rest.indexOf("十");
  if (tenIndex >= 0) {
    total += (digits[rest.slice(0, tenIndex)] ?? 1) * 10;
    rest = rest.slice(tenIndex + 1);
  }
  if (rest in digits) total += digits[rest] ?? 0;
  return total > 0 ? total : Number.MAX_SAFE_INTEGER;
}

export const useBeautyRankStore = defineStore("beauty-rank", () => {
  const ranks = ref<NamedRecord>({});
  const cards = ref<BeautyCard[]>([]);
  const threads = ref<Record<string, BeautyForumFloor[]>>({});
  const drafts = ref<Record<string, string>>({});
  const expanded = ref<Record<string, boolean>>({});
  const deleteArmed = ref<Record<string, boolean>>({});
  const settingsOpen = ref(false);
  const settingsPresetName = ref("");
  const presetNames = ref<string[]>([]);
  const settings = ref<BeautyForumSettings>(
    cloneSettings(readStorageJson(BEAUTY_FORUM_SETTINGS_KEY, DEFAULT_BEAUTY_FORUM_SETTINGS)),
  );
  const modelOptions = ref<string[]>([]);
  const statusMessage = ref("");
  const statusTone = ref("info");
  const generatingName = ref("");
  const portraitRevision = ref(0);

  function setCards(nextCards: BeautyCard[]): void {
    cards.value = nextCards.map((card) => ({
      name: String(card.name ?? ""),
      data: { ...asRecord(card.data) },
    }));
    for (const { name } of cards.value) {
      if (!name) continue;
      threads.value[name] ??= [];
      drafts.value[name] ??= "";
      expanded.value[name] ??= false;
      deleteArmed.value[name] ??= false;
    }
  }

  function updateFromStatData(statData: StatData): void {
    ranks.value = asNamedRecord(statData.绝色榜);
    const ordered = Object.entries(ranks.value)
      .map(([name, data], index) => ({ name, data, index }))
      .sort((left, right) => beautyRankOrder(left.data) - beautyRankOrder(right.data) || left.index - right.index)
      .map(({ name, data }) => ({ name, data }));
    setCards(ordered);
  }

  function setStatus(message: unknown, tone = "info"): void {
    statusMessage.value = String(message ?? "");
    statusTone.value = String(tone || "info");
  }

  function saveSettings(nextSettings: unknown): void {
    settings.value = cloneSettings(nextSettings);
    writeStorageJson(BEAUTY_FORUM_SETTINGS_KEY, settings.value);
  }

  function refreshSettings(): BeautyForumSettings {
    settings.value = cloneSettings(
      readStorageJson(BEAUTY_FORUM_SETTINGS_KEY, DEFAULT_BEAUTY_FORUM_SETTINGS),
    );
    return settings.value;
  }

  function refreshPresets(): string[] {
    const presets = loadPresets();
    presetNames.value = Object.keys(presets).sort((left, right) =>
      left.localeCompare(right, "zh-CN"),
    );
    if (
      settingsPresetName.value &&
      !Object.prototype.hasOwnProperty.call(presets, settingsPresetName.value)
    ) {
      settingsPresetName.value = "";
    }
    return presetNames.value;
  }

  function applyPreset(name: unknown): BeautyForumSettings | null {
    const presetName = String(name ?? "").trim();
    const preset = loadPresets()[presetName];
    if (!preset) return null;
    settings.value = cloneSettings(preset);
    settingsPresetName.value = presetName;
    return settings.value;
  }

  function savePreset(name: unknown, nextSettings: unknown = settings.value): boolean {
    const presetName = String(name ?? "").trim();
    if (!presetName) return false;
    const presets = loadPresets();
    presets[presetName] = cloneSettings(nextSettings);
    if (!writeStorageJson(BEAUTY_FORUM_PRESETS_KEY, presets)) return false;
    settingsPresetName.value = presetName;
    refreshPresets();
    return true;
  }

  function deletePreset(name: unknown): boolean {
    const presetName = String(name ?? "").trim();
    const presets = loadPresets();
    if (!Object.prototype.hasOwnProperty.call(presets, presetName)) return false;
    delete presets[presetName];
    if (!writeStorageJson(BEAUTY_FORUM_PRESETS_KEY, presets)) return false;
    if (settingsPresetName.value === presetName) settingsPresetName.value = "";
    refreshPresets();
    return true;
  }

  refreshPresets();

  return {
    ranks,
    cards,
    threads,
    drafts,
    expanded,
    deleteArmed,
    settingsOpen,
    settingsPresetName,
    presetNames,
    settings,
    modelOptions,
    statusMessage,
    statusTone,
    generatingName,
    portraitRevision,
    setCards,
    updateFromStatData,
    setStatus,
    saveSettings,
    refreshSettings,
    refreshPresets,
    applyPreset,
    savePreset,
    deletePreset,
  };
});
