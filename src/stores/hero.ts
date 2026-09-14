import { computed, ref } from "vue";
import { defineStore } from "pinia";
import { asRecord, numericValue, percentage } from "./helpers";
import type { HeroData, StatData } from "../types/stat-data";

export const useHeroStore = defineStore("hero", () => {
  const data = ref<HeroData>({});
  const name = computed(() => String(data.value.姓名 ?? ""));
  const gender = computed(() => String(data.value.性别 ?? ""));
  const hp = computed(() => numericValue(data.value.生命));
  const hpMax = computed(() => numericValue(data.value.生命上限));
  const hpPercent = computed(() => percentage(data.value.生命, data.value.生命上限));
  const manaPercent = computed(() => percentage(data.value.灵力, data.value.灵力上限));
  const cultivationPercent = computed(() =>
    percentage(data.value.修为, data.value.修为上限),
  );

  function updateFromStatData(statData: StatData): void {
    data.value = { ...asRecord(statData.主角) };
  }

  return {
    data,
    name,
    gender,
    hp,
    hpMax,
    hpPercent,
    manaPercent,
    cultivationPercent,
    updateFromStatData,
  };
});
