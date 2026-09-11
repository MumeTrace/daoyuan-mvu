<script setup lang="ts">
import { computed } from "vue";
import type { MapLocation } from "../../data/lore-xuantian";

const props = defineProps<{ from: MapLocation; to: MapLocation }>();
const style = computed(() => {
  const dx = props.to.x - props.from.x;
  const dy = (props.to.y - props.from.y) * 0.75;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx) * 180 / Math.PI;
  return {
    width: `calc(${distance}% - 10px)`,
    left: `${props.from.x}%`,
    top: `${props.from.y}%`,
    transform: `rotate(${angle}deg)`,
  };
});
</script>

<template><div class="map-line" :style="style"></div></template>
