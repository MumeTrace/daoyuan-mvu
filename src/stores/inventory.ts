import { computed, ref } from "vue";
import { defineStore } from "pinia";
import { asNamedRecord, asRecord } from "./helpers";
import type { DataRecord, NamedRecord, StatData } from "../types/stat-data";

export const useInventoryStore = defineStore("inventory", () => {
  const items = ref<NamedRecord>({});
  const artifacts = ref<NamedRecord>({});
  const luck = ref<NamedRecord>({});
  const alchemy = ref<DataRecord>({});
  const forging = ref<DataRecord>({});
  const itemCount = computed(() => Object.keys(items.value).length);

  function updateFromStatData(statData: StatData): void {
    const hero = statData.主角;
    items.value = asNamedRecord(hero?.储物袋);
    artifacts.value = asNamedRecord(hero?.器物);
    luck.value = asNamedRecord(hero?.气运);
    alchemy.value = asRecord(hero?.炼丹);
    forging.value = asRecord(hero?.炼器);
  }

  return {
    items,
    artifacts,
    luck,
    alchemy,
    forging,
    itemCount,
    updateFromStatData,
  };
});
