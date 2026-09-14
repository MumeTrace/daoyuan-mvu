<script setup lang="ts">
import { usePetsStore } from "../../stores/pets";
import PetCard from "../cards/PetCard.vue";
const store = usePetsStore();
</script>
<template><PetCard v-for="[name, data] in store.entries" :key="name" :name="name" :data="data" /><p v-if="!store.entries.length" class="dy-empty-state">暂无相关记录。</p></template>
