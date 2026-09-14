import { computed, ref } from "vue";
import { defineStore } from "pinia";
import type { LorebookEntry } from "../bridge/lorebook-api";

export interface JadeLoreEntry extends LorebookEntry {
  lbName: string;
}

export const useJadeLoreStore = defineStore("jade-lore", () => {
  const entries = ref<JadeLoreEntry[]>([]);
  const query = ref("");
  const loading = ref(false);
  const status = ref("请先在玉简中选择聊天对象并打开此面板...");
  const error = ref("");
  const filteredEntries = computed(() => {
    const needle = query.value.trim().toLocaleLowerCase();
    if (!needle) return entries.value;
    return entries.value.filter((entry) => {
      const keys = Array.isArray(entry.key) ? entry.key.join(", ") : String(entry.key ?? "");
      return `${entry.comment ?? ""}\n${keys}\n${entry.content ?? ""}`.toLocaleLowerCase().includes(needle);
    });
  });

  function begin(message: string): void {
    loading.value = true;
    error.value = "";
    entries.value = [];
    status.value = message;
  }

  function setEntries(nextEntries: JadeLoreEntry[]): void {
    entries.value = nextEntries;
    loading.value = false;
    error.value = "";
    status.value = nextEntries.length ? "" : "绑定的世界书中未找到任何有效条目。";
  }

  function setStatus(message: string): void {
    loading.value = false;
    error.value = "";
    entries.value = [];
    status.value = message;
  }

  function setError(reason: unknown): void {
    loading.value = false;
    entries.value = [];
    error.value = reason instanceof Error ? reason.message : String(reason ?? "拉取世界书失败");
  }

  return { entries, query, loading, status, error, filteredEntries, begin, setEntries, setStatus, setError };
});
