import { computed, ref } from "vue";
import { defineStore } from "pinia";
import { asNamedRecord } from "./helpers";
import type { NamedRecord, StatData } from "../types/stat-data";

export const useQuestsStore = defineStore("quests", () => {
  const quests = ref<NamedRecord>({});
  const entries = computed(() => Object.entries(quests.value));

  function updateFromStatData(statData: StatData): void {
    quests.value = asNamedRecord(statData.机遇);
  }

  return { quests, entries, updateFromStatData };
});
