<script setup lang="ts">
import type { DataRecord } from "../../types/stat-data";
import CharacterCard from "./CharacterCard.vue";
defineProps<{ name: string; data: DataRecord }>();
</script>
<template><CharacterCard kind="npc" :name="name" :data="data" /></template>
