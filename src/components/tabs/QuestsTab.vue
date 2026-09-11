<script setup lang="ts">
import { useQuestsStore } from "../../stores/quests";
import QuestCard from "../cards/QuestCard.vue";
const store = useQuestsStore();
</script>
<template><QuestCard v-for="[name, data] in store.entries" :key="name" :name="name" :data="data" /><p v-if="!store.entries.length" class="dy-empty-state">暂无相关记录。</p></template>
