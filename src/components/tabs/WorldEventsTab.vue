<script setup lang="ts">
import { useWorldStore } from "../../stores/world";
import WorldEventCard from "../cards/WorldEventCard.vue";
const store = useWorldStore();
</script>

<template>
  <div class="dy-world-cooldown" aria-label="遭遇冷却">
    <span>遭遇冷却</span>
    <strong>{{ store.encounterCooldownLabel }}</strong>
  </div>
  <WorldEventCard
    v-for="(data, name) in store.events"
    :key="name"
    :name="name"
    :data="data"
  />
  <p v-if="!Object.keys(store.events).length" class="dy-empty-state">暂无相关记录。</p>
</template>

<style scoped>
.dy-world-cooldown {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-width: 0;
  margin-bottom: 8px;
  padding: 8px 12px;
  border: 1px solid rgba(255, 215, 0, 0.2);
  border-left: 3px solid var(--accent-gold);
  border-radius: 7px;
  background: linear-gradient(90deg, rgba(255, 215, 0, 0.07), rgba(20, 20, 25, 0.58));
  color: var(--text-main);
  box-sizing: border-box;
  white-space: nowrap;
}

.dy-world-cooldown span {
  overflow: hidden;
  text-overflow: ellipsis;
}

.dy-world-cooldown strong {
  flex: 0 0 auto;
  color: var(--accent-gold);
  font-family: "JetBrains Mono", monospace;
  font-weight: 700;
  text-shadow: 0 0 6px var(--accent-gold-glow);
}
</style>
