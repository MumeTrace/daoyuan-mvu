<script setup lang="ts">
import { onBeforeUnmount, reactive, watch } from "vue";
import { hostDom } from "../../bridge/host-dom";
import { useUiStore } from "../../stores/ui";
import { useImageLibraryStore } from "../../stores/image-library";
import AppHeader from "./AppHeader.vue";
import StatusPanel from "./StatusPanel.vue";
import TabNavigation from "./TabNavigation.vue";
import DashboardTab from "../tabs/DashboardTab.vue";
import SkillsTab from "../tabs/SkillsTab.vue";
import PartnersTab from "../tabs/PartnersTab.vue";
import NpcsTab from "../tabs/NpcsTab.vue";
import PetsTab from "../tabs/PetsTab.vue";
import QuestsTab from "../tabs/QuestsTab.vue";
import BeautyRankTab from "../tabs/BeautyRankTab.vue";
import WorldEventsTab from "../tabs/WorldEventsTab.vue";
import JadeListTab from "../tabs/JadeListTab.vue";
import ModalsRoot from "../modals/ModalsRoot.vue";
import JadePromptModal from "../modals/JadePromptModal.vue";
import WorldMap from "../map/WorldMap.vue";
import FairyGuide from "../map/FairyGuide.vue";
import AchievementToast from "../shared/AchievementToast.vue";

const ui = useUiStore();
const imageLibrary = useImageLibraryStore();
const syncImageLibrary = (): void => { imageLibrary.syncFromRuntime(); };
const visitedTabs = reactive(new Set<string>([ui.activeTab]));
const imageLibraryTabs = new Set(["partners", "npcs", "pets", "database", "messages", "map"]);

globalThis.addEventListener?.("daoyuan_images_changed", syncImageLibrary);

const stopCollapseWatch = watch(
  () => ui.statusBarCollapsed,
  (collapsed) => hostDom.setBodyClass("dy-global-collapsed", collapsed),
  { immediate: true },
);

const stopActiveTabWatch = watch(
  () => ui.activeTab,
  (activeTab) => {
    visitedTabs.add(activeTab);
    if (imageLibraryTabs.has(activeTab) && !imageLibrary.loaded) {
      void imageLibrary.initialize();
    }
  },
  { immediate: true, flush: "sync" },
);

onBeforeUnmount(() => {
  globalThis.removeEventListener?.("daoyuan_images_changed", syncImageLibrary);
  stopCollapseWatch();
  stopActiveTabWatch();
  hostDom.setBodyClass("dy-global-collapsed", false);
});
</script>

<template>
  <div class="terminal-container" :class="{ 'dy-bar-collapsed': ui.statusBarCollapsed }">
    <div class="top-bar"></div>
    <AppHeader />
    <div class="content-grid">
      <StatusPanel />
      <main class="main-panel">
        <nav id="tab-navigation-vue-root" class="nav-tabs"><TabNavigation /></nav>
        <section v-if="visitedTabs.has('dashboard')" v-show="ui.activeTab === 'dashboard'" id="tab-dashboard" class="tab-content"><DashboardTab /></section>
        <section v-if="visitedTabs.has('skills')" v-show="ui.activeTab === 'skills'" id="tab-skills" class="tab-content"><SkillsTab /></section>
        <section v-if="visitedTabs.has('partners')" v-show="ui.activeTab === 'partners'" id="tab-partners" class="tab-content"><PartnersTab /></section>
        <section v-if="visitedTabs.has('npcs')" v-show="ui.activeTab === 'npcs'" id="tab-npcs" class="tab-content"><NpcsTab /></section>
        <section v-if="visitedTabs.has('pets')" v-show="ui.activeTab === 'pets'" id="tab-pets" class="tab-content"><PetsTab /></section>
        <section v-if="visitedTabs.has('quests')" v-show="ui.activeTab === 'quests'" id="tab-quests" class="tab-content"><QuestsTab /></section>
        <section v-if="visitedTabs.has('database')" v-show="ui.activeTab === 'database'" id="tab-database" class="tab-content"><BeautyRankTab /></section>
        <section v-if="visitedTabs.has('world_events')" v-show="ui.activeTab === 'world_events'" id="tab-world_events" class="tab-content"><WorldEventsTab /></section>
        <section v-if="visitedTabs.has('messages')" v-show="ui.activeTab === 'messages'" id="tab-messages" class="tab-content tab-content--messages"><JadeListTab /></section>
        <section v-if="visitedTabs.has('map')" v-show="ui.activeTab === 'map'" id="tab-map" class="tab-content"><WorldMap /></section>
      </main>
    </div>
    <div id="fairy-guide" class="fairy-container"><FairyGuide /></div>
  </div>
  <ModalsRoot />
  <JadePromptModal />
  <AchievementToast />
</template>
