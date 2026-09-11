<script setup lang="ts">
import { useSkillsStore } from "../../stores/skills";
import SkillCard from "../cards/SkillCard.vue";

const store = useSkillsStore();
</script>

<template>
  <SkillCard v-for="[name, data] in store.entries" :key="name" :name="name" :data="data" />
  <p v-if="!store.entries.length" class="dy-empty-state">暂无相关记录。</p>
</template>
