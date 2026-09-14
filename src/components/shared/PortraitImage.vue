<script setup lang="ts">
import { computed, ref, watch } from "vue";

const props = withDefaults(defineProps<{
  src?: string;
  alt: string;
  fit?: "contain" | "cover";
  fallbackLabel?: string;
  loading?: "eager" | "lazy";
  retryKey?: string | number;
  compact?: boolean;
}>(), {
  src: "",
  fit: "contain",
  fallbackLabel: "立绘加载失败",
  loading: "lazy",
  retryKey: 0,
  compact: false,
});

const emit = defineEmits<{
  activate: [];
  failed: [url: string];
}>();

const failedUrl = ref("");
const normalizedSrc = computed(() => props.src.trim());
const failed = computed(() =>
  !normalizedSrc.value || failedUrl.value === normalizedSrc.value,
);

watch(
  [normalizedSrc, () => props.retryKey],
  () => { failedUrl.value = ""; },
);

function markFailed(): void {
  if (!normalizedSrc.value) return;
  failedUrl.value = normalizedSrc.value;
  emit("failed", normalizedSrc.value);
}

function activate(): void {
  if (!failed.value) emit("activate");
}
</script>

<template>
  <span
    class="dy-portrait-media"
    :class="[
      `dy-portrait-media--${fit}`,
      { 'is-fallback': failed, 'dy-portrait-media--compact': compact },
    ]"
    :data-portrait-state="failed ? 'fallback' : 'ready'"
  >
    <img
      v-if="!failed"
      class="dy-portrait-media__image"
      :src="normalizedSrc"
      :alt="alt"
      :loading="loading"
      decoding="async"
      @error="markFailed"
      @click="activate"
    />
    <span
      v-else
      class="dy-portrait-media__fallback"
      role="img"
      :aria-label="`${alt}：${fallbackLabel || '暂无可用立绘'}`"
    >
      <span v-if="fallbackLabel" class="dy-portrait-media__sigil" aria-hidden="true">◇</span>
      <span v-if="fallbackLabel">{{ fallbackLabel }}</span>
    </span>
  </span>
</template>

<style scoped>
.dy-portrait-media {
  display: grid;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: inherit;
  overflow: hidden;
  place-items: center;
  background:
    radial-gradient(circle at 50% 35%, rgba(255, 215, 0, 0.08), transparent 52%),
    linear-gradient(145deg, rgba(24, 20, 28, 0.96), rgba(8, 10, 15, 0.98));
}

.dy-portrait-media__image {
  display: block;
  width: 100%;
  max-width: 100%;
}

.dy-portrait-media--contain .dy-portrait-media__image {
  height: auto;
  max-height: 100%;
  object-fit: contain;
}

.dy-portrait-media--cover .dy-portrait-media__image {
  height: 100%;
  object-fit: cover;
}

.dy-portrait-media__fallback {
  display: grid;
  min-height: inherit;
  padding: 12px;
  place-items: center;
  align-content: center;
  gap: 4px;
  box-sizing: border-box;
  color: var(--text-dim, #a8a8b3);
  font-size: 0.82em;
  line-height: 1.35;
  text-align: center;
}

.dy-portrait-media__sigil {
  color: var(--accent-gold, #ffd700);
  font-size: 1.45em;
  line-height: 1;
  text-shadow: 0 0 10px var(--accent-gold-glow, rgba(255, 215, 0, 0.35));
}

.dy-portrait-media--compact .dy-portrait-media__fallback {
  gap: 0;
  padding: 4px;
  font-size: 0.92em;
}

.dy-portrait-media--compact .dy-portrait-media__sigil {
  font-size: 1em;
}
</style>
