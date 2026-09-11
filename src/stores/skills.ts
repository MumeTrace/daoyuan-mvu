import { computed, ref } from "vue";
import { defineStore } from "pinia";
import { asNamedRecord } from "./helpers";
import type { NamedRecord, StatData } from "../types/stat-data";

export const useSkillsStore = defineStore("skills", () => {
  const skills = ref<NamedRecord>({});
  const entries = computed(() => Object.entries(skills.value));

  function updateFromStatData(statData: StatData): void {
    skills.value = asNamedRecord(statData.主角?.功法);
  }

  return { skills, entries, updateFromStatData };
});
