<script setup lang="ts">
import { useNpcsStore } from "../../stores/npcs";
import NpcCard from "../cards/NpcCard.vue";
const store = useNpcsStore();
</script>
<template><NpcCard v-for="[name, data] in store.entries" :key="name" :name="name" :data="data" /><p v-if="!store.entries.length" class="dy-empty-state">暂无相关记录。</p></template>
