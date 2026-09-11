import { computed, ref } from "vue";
import { defineStore } from "pinia";
import { asNamedRecord } from "./helpers";
import type { NamedRecord, StatData } from "../types/stat-data";

export const useNpcsStore = defineStore("npcs", () => {
  const npcs = ref<NamedRecord>({});
  const entries = computed(() => Object.entries(npcs.value));

  function updateFromStatData(statData: StatData): void {
    npcs.value = asNamedRecord(statData.人物);
  }

  return { npcs, entries, updateFromStatData };
});
