<script setup lang="ts">
import type { MapLocation, MapLore } from "../../data/lore-xuantian";
import MapConnection from "./MapConnection.vue";
import MapNode from "./MapNode.vue";

const props = defineProps<{ lore: MapLore; activeName: string }>();
const emit = defineEmits<{ select: [location: MapLocation] }>();
const baseConnections: Array<[string, string]> = [
  ["center", "north"], ["center", "south"], ["center", "east"], ["center", "west"],
];
const specialConnections: Array<[string, string]> = [
  ["east", "special_east"], ["south", "s_youlin"], ["west", "s_gengjin"],
  ["north", "s_liuli"], ["center", "s_wuxing"], ["west", "s_shahai"],
  ["east", "s_yunsheng"], ["south", "s_huangquan"], ["north", "s_tianyuan"],
];
const connections = [...baseConnections, ...specialConnections].filter(([from, to]) => props.lore[from] && props.lore[to]);
</script>

<template>
  <div class="map-wrapper">
    <div class="map-grid"></div>
    <MapConnection
      v-for="[from, to] in connections"
      :key="`${from}-${to}`"
      :from="lore[from]!"
      :to="lore[to]!"
    />
    <MapNode
      v-for="(location, key) in lore"
      :key="key"
      :node-key="key"
      :location="location"
      :active="activeName === location.name"
      @select="emit('select', $event)"
    />
  </div>
</template>
