<script setup lang="ts">
import { computed, onBeforeUnmount, watch } from "vue";
import { useAchievementStore } from "../../stores/achievements";

const achievements = useAchievementStore();
const descriptionParts = computed(() =>
  (achievements.current?.description ?? "").split(/(【[^】]+】)/).filter(Boolean),
);
let timer: ReturnType<typeof setTimeout> | undefined;

watch(
  () => achievements.current?.id,
  (id) => {
    if (timer) clearTimeout(timer);
    if (id) timer = setTimeout(() => achievements.dismiss(), 3500);
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  if (timer) clearTimeout(timer);
});
</script>

<template>
  <Transition name="dy-achievement">
    <aside v-if="achievements.current" class="dy-achievement-toast" aria-live="polite">
      <div class="dy-achievement-title">📜 {{ achievements.current.title }}</div>
      <div class="dy-achievement-description">
        <span
          v-for="(part, index) in descriptionParts"
          :key="`${index}-${part}`"
          :class="{ 'dy-achievement-emphasis': part.startsWith('【') && part.endsWith('】') }"
        >{{ part }}</span>
      </div>
    </aside>
  </Transition>
</template>

<style scoped>
.dy-achievement-toast {
  position: fixed;
  top: 60px;
  left: 50%;
  z-index: 9999999;
  min-width: 240px;
  max-width: min(80vw, 560px);
  padding: 16px 24px;
  border: 1px solid var(--accent-gold);
  border-radius: 12px;
  background: linear-gradient(145deg, rgb(30 25 35 / 95%), rgb(15 10 15 / 98%));
  box-shadow: 0 10px 30px rgb(0 0 0 / 80%), inset 0 0 15px rgb(255 215 0 / 10%);
  color: var(--text-main);
  text-align: center;
  pointer-events: none;
}

.dy-achievement-title {
  margin-bottom: 6px;
  color: var(--accent-gold);
  font-size: 1.15em;
  font-weight: 700;
  letter-spacing: 2px;
  text-shadow: 0 0 8px var(--accent-gold-glow);
}

.dy-achievement-description { font-size: 0.9em; line-height: 1.4; }
.dy-achievement-emphasis { color: var(--rare-text); font-weight: 700; }
.dy-achievement-enter-active, .dy-achievement-leave-active { transition: opacity 0.35s ease, transform 0.35s ease; }
.dy-achievement-enter-from, .dy-achievement-leave-to { opacity: 0; transform: translate(-50%, -30px); }
.dy-achievement-enter-to, .dy-achievement-leave-from { opacity: 1; transform: translate(-50%, 0); }
</style>
