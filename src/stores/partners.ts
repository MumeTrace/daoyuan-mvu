import { computed, ref } from "vue";
import { defineStore } from "pinia";
import { asNamedRecord } from "./helpers";
import type { NamedRecord, StatData } from "../types/stat-data";

export const usePartnersStore = defineStore("partners", () => {
  const partners = ref<NamedRecord>({});
  const entries = computed(() => Object.entries(partners.value));

  function updateFromStatData(statData: StatData): void {
    partners.value = asNamedRecord(statData.道侣);
  }

  return { partners, entries, updateFromStatData };
});
