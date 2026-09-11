<script setup lang="ts">
import { computed } from "vue";
import type { MapLocation } from "../../data/lore-xuantian";

const props = defineProps<{ nodeKey: string; location: MapLocation; active: boolean }>();
const emit = defineEmits<{ select: [location: MapLocation] }>();
const nodeClass = computed(() => {
  if (["center", "north", "south", "east", "west"].includes(props.nodeKey)) {
    return `node-${props.nodeKey}`;
  }
  return ["node-special", { "label-right": ["s_tianyuan", "special_east"].includes(props.nodeKey) }];
});
</script>

<template>
  <button
    class="map-node"
    :class="[nodeClass, { 'active-node': active }]"
    type="button"
    :style="{ left: `${location.x}%`, top: `${location.y}%` }"
    @click="emit('select', location)"
  >
    <span class="map-node-label">{{ location.name }}</span>
  </button>
</template>
