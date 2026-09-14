<script setup lang="ts">
import { useUiStore } from "../../stores/ui";

const ui = useUiStore();
const tabs = [
  ["dashboard", "概览"],
  ["skills", "功法"],
  ["partners", "道侣"],
  ["npcs", "人物"],
  ["pets", "灵宠"],
  ["quests", "机遇"],
  ["database", "绝色榜"],
  ["world_events", "动向"],
  ["messages", "玉简"],
  ["map", "舆图"],
] as const;

function activate(tabId: string): void {
  ui.setActiveTab(tabId);
}
</script>

<template>
  <button
    v-for="tab in tabs"
    :key="tab[0]"
    class="tab-btn"
    :class="{ active: ui.activeTab === tab[0] }"
    type="button"
    :data-tab-id="tab[0]"
    @click="activate(tab[0])"
  >
    {{ tab[1] }}
  </button>
</template>

<style scoped src="../../styles/components/tab-navigation.css"></style>
