import { computed, ref } from "vue";
import { defineStore } from "pinia";
import { asNamedRecord } from "./helpers";
import type { NamedRecord, StatData } from "../types/stat-data";

export const usePetsStore = defineStore("pets", () => {
  const pets = ref<NamedRecord>({});
  const entries = computed(() => Object.entries(pets.value));

  function updateFromStatData(statData: StatData): void {
    pets.value = asNamedRecord(statData.灵宠);
  }

  return { pets, entries, updateFromStatData };
});
