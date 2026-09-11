import { computed, ref } from "vue";
import { defineStore } from "pinia";
import { asNamedRecord, asRecord } from "./helpers";
import type { NamedRecord, StatData, WorldData } from "../types/stat-data";

export const useWorldStore = defineStore("world", () => {
  const world = ref<WorldData>({});
  const events = ref<NamedRecord>({});
  const currentTime = computed(() => String(world.value.当前时间 ?? ""));
  const currentLocation = computed(() => String(world.value.当前地点 ?? ""));
  const encounterCooldownLabel = computed(() => {
    const rawValue = world.value.遭遇冷却;
    if (rawValue === null || rawValue === undefined) return "—";
    const value = String(rawValue).trim();
    if (!value) return "—";
    return /^-?\d+(?:\.\d+)?$/.test(value) ? `${value} 轮` : value;
  });

  function updateFromStatData(statData: StatData): void {
    world.value = { ...asRecord(statData.世界) };
    events.value = asNamedRecord(statData.世界?.动向);
  }

  return {
    world,
    events,
    currentTime,
    currentLocation,
    encounterCooldownLabel,
    updateFromStatData,
  };
});
