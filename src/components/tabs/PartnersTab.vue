<script setup lang="ts">
import { usePartnersStore } from "../../stores/partners";
import PartnerCard from "../cards/PartnerCard.vue";
const store = usePartnersStore();
</script>
<template><PartnerCard v-for="[name, data] in store.entries" :key="name" :name="name" :data="data" /><p v-if="!store.entries.length" class="dy-empty-state">暂无相关记录。</p></template>
