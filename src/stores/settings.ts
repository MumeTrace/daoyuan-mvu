import { ref } from "vue";
import { defineStore } from "pinia";
import { readStorageJson, writeStorageJson } from "../bridge/storage";
import { safeWebUrl } from "../utils/safe-url";

export const JADE_SETTINGS_KEY = "daoyuan_wx_settings";
export const JADE_PRESETS_KEY = "daoyuan_wx_presets";
export const JADE_LORE_SELECTION_KEY = "daoyuan_wx_lore_selected";

export interface JadeSettings { customPrompt: string; apiBaseUrl: string; apiKey: string; apiModel: string }
export interface JadeLoreSelection { uid: string; content: string }
const EMPTY_SETTINGS: JadeSettings = { customPrompt: "", apiBaseUrl: "", apiKey: "", apiModel: "" };

function normalizeSettings(value: unknown): JadeSettings {
  const source = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
  return {
    customPrompt: String(source.customPrompt ?? ""),
    apiBaseUrl: String(source.apiBaseUrl ?? ""),
    apiKey: String(source.apiKey ?? ""),
    apiModel: String(source.apiModel ?? ""),
  };
}

export const useSettingsStore = defineStore("settings", () => {
  const jade = ref<JadeSettings>(normalizeSettings(readStorageJson(JADE_SETTINGS_KEY, EMPTY_SETTINGS)));
  const presets = ref<Record<string, JadeSettings>>(
    Object.fromEntries(Object.entries(readStorageJson<Record<string, unknown>>(JADE_PRESETS_KEY, {})).map(([name, value]) => [name, normalizeSettings(value)])),
  );
  const loreSelections = ref<Record<string, JadeLoreSelection[]>>(readStorageJson(JADE_LORE_SELECTION_KEY, {}));
  const models = ref<string[]>([]);
  const loadingModels = ref(false);
  const modelError = ref("");
  const debugLog = ref("");

  function saveJade(next: JadeSettings = jade.value): boolean {
    jade.value = normalizeSettings(next);
    return writeStorageJson(JADE_SETTINGS_KEY, jade.value);
  }
  function savePreset(name: string): boolean {
    const trimmed = name.trim();
    if (!trimmed) return false;
    presets.value = { ...presets.value, [trimmed]: { ...jade.value } };
    return writeStorageJson(JADE_PRESETS_KEY, presets.value);
  }
  function applyPreset(name: string): boolean {
    const preset = presets.value[name];
    if (!preset) return false;
    jade.value = { ...preset };
    return true;
  }
  function deletePreset(name: string): boolean {
    if (!presets.value[name]) return false;
    const next = { ...presets.value };
    delete next[name];
    presets.value = next;
    return writeStorageJson(JADE_PRESETS_KEY, next);
  }
  function saveLoreSelection(characterName: string, selection: JadeLoreSelection[]): boolean {
    if (!characterName) return false;
    loreSelections.value = { ...loreSelections.value, [characterName]: selection };
    return writeStorageJson(JADE_LORE_SELECTION_KEY, loreSelections.value);
  }
  function setDebugLog(message: string): void {
    const stamp = new Date().toLocaleTimeString("zh-CN", { hour12: false });
    debugLog.value = `[${stamp}] 原始返回:\n${message}\n\n${debugLog.value}`;
  }
  async function fetchModels(): Promise<void> {
    const base = safeWebUrl(jade.value.apiBaseUrl);
    if (!base) throw new Error("请填写有效的 http/https 基础 URL。");
    loadingModels.value = true;
    modelError.value = "";
    try {
      const trimmed = base.replace(/\/+$/, "");
      const url = /\/chat\/completions$/i.test(trimmed) ? trimmed.replace(/\/chat\/completions$/i, "/models") : `${trimmed}/models`;
      const headers: Record<string, string> = {};
      if (jade.value.apiKey) headers.Authorization = `Bearer ${jade.value.apiKey}`;
      const response = await fetch(url, { headers });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json() as { data?: Array<{ id?: unknown }> };
      if (!Array.isArray(payload.data)) throw new Error("模型接口返回格式不符合 OpenAI models 规范。");
      models.value = payload.data.map((item) => item.id).filter((id): id is string => typeof id === "string");
    } catch (error) {
      modelError.value = error instanceof Error ? error.message : String(error);
      throw error;
    } finally {
      loadingModels.value = false;
    }
  }

  return { jade, presets, loreSelections, models, loadingModels, modelError, debugLog, saveJade, savePreset, applyPreset, deletePreset, saveLoreSelection, setDebugLog, fetchModels };
});
