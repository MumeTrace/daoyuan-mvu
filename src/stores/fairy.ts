import { ref } from "vue";
import { defineStore } from "pinia";
import type { StatData } from "../types/stat-data";

export const useFairyStore = defineStore("fairy-guide", () => {
  const lines = ref<string[]>([]);

  function updateFromStatData(statData: StatData): void {
    const source = statData.$器灵台词;
    lines.value = Array.isArray(source)
      ? source.filter((line): line is string => typeof line === "string" && line.trim().length > 0)
      : [];
  }

  return { lines, updateFromStatData };
});
