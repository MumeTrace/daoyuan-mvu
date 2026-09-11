<script setup lang="ts">
import { computed } from "vue";
import { useHeroStore } from "../../stores/hero";

defineProps<{ open: boolean }>();

const hero = useHeroStore();
const fields = computed(() => [
  ["姓名", "name-value", hero.data.姓名 ?? "未知"],
  ["性别", "gender-value", hero.data.性别 ?? "未知"],
  ["容貌", "appearance-value", hero.data.容貌 ?? "未知"],
  ["身形", "body-value", hero.data.身形 ?? "未知"],
  ["衣着", "clothing-value", hero.data.衣着 ?? "未知"],
]);
</script>

<template>
  <div id="hero-info-dropdown" class="hero-info-dropdown" :class="{ show: open }">
    <div v-for="field in fields" :key="field[1]" class="stat-row">
      <div class="stat-label">
        <span>{{ field[0] }}</span>
        <span :id="String(field[1])" class="rare-text dy-detail-value">{{ field[2] }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped src="../../styles/components/hero-dropdown.css"></style>
