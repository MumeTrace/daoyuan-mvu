<script setup lang="ts">
import { computed } from "vue";
import { usePortraitPool } from "../../composables/usePortraitPool";
import { usePortraitStore } from "../../stores/portraits";
import PortraitImage from "../shared/PortraitImage.vue";
import { useUiStore } from "../../stores/ui";

const props = defineProps<{ name: string }>();
const portraits = usePortraitStore();
const ui = useUiStore();
const pool = usePortraitPool(() => props.name);
const portraitUrl = pool.url;
const urls = computed(() => {
  void portraits.revision;
  return portraits.themeUrls(props.name, portraits.activeTheme(props.name));
});
const position = computed(() => Math.max(0, urls.value.indexOf(portraitUrl.value)) + 1);
</script>

<template>
  <section class="dy-guardian-portrait" :aria-label="`${name}立绘`">
    <button class="dy-guardian-image" type="button" :disabled="!portraitUrl" :aria-label="`全屏查看${name}立绘`" title="点击全屏查看，可拖动缩放" @click="ui.openImageModal(portraitUrl)">
      <PortraitImage :src="portraitUrl" :alt="name" :retry-key="pool.revision.value" loading="eager"
        :fallback-label="portraitUrl ? '立绘加载失败' : '暂无守护者立绘'" />
    </button>
    <div class="dy-guardian-actions">
      <span aria-live="polite">{{ urls.length ? `${position} / ${urls.length}` : '暂无图片' }}</span>
      <button type="button" :disabled="urls.length < 2" :title="urls.length < 2 ? '需要至少两张立绘才能切换' : '切换下一张立绘'" @click="pool.cycle">
        <span aria-hidden="true">↻</span> 切换立绘
      </button>
    </div>
  </section>
</template>

<style scoped>
.dy-guardian-portrait { margin-top: 14px; }
.dy-guardian-image { display: block; width: 100%; height: clamp(200px, 48dvh, 480px); padding: 0; overflow: hidden; border: 1px solid var(--border-metal); border-radius: var(--dy-card-border-radius, 8px); background: var(--bg-dark); cursor: zoom-in; }
.dy-guardian-image :deep(.dy-portrait-media) { display: block; height: 100%; min-height: 0; }
.dy-guardian-portrait .dy-guardian-image :deep(.dy-portrait-media__image) { width: 100%; height: 100%; max-height: 100%; min-height: 0; object-fit: contain; }
.dy-guardian-image:focus-visible { outline: 2px solid var(--rare-text); outline-offset: 3px; }
.dy-guardian-image:disabled { cursor: default; }
.dy-guardian-actions { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 10px; }
.dy-guardian-actions > span { color: var(--text-dim); font-size: .85em; font-variant-numeric: tabular-nums; }
.dy-guardian-actions button { display: inline-flex; align-items: center; gap: 7px; min-height: 40px; padding: 7px 16px; border: 1px solid var(--rare-text); border-radius: var(--dy-card-border-radius, 8px); color: var(--rare-text); background: color-mix(in srgb, var(--rare-text) 10%, var(--bg-dark)); font: inherit; cursor: pointer; transition: background .18s, box-shadow .18s, transform .18s; }
.dy-guardian-actions button:not(:disabled):hover { background: color-mix(in srgb, var(--rare-text) 18%, var(--bg-dark)); box-shadow: 0 0 12px color-mix(in srgb, var(--rare-text) 28%, transparent); transform: translateY(-1px); }
.dy-guardian-actions button:focus-visible { outline: 2px solid var(--rare-text); outline-offset: 3px; }
.dy-guardian-actions button:not(:disabled):active { transform: scale(.97); }
.dy-guardian-actions button:disabled { color: var(--text-dim); border-color: var(--border-metal); background: var(--bg-panel); opacity: .65; cursor: default; }
@media(prefers-reduced-motion:reduce) { .dy-guardian-actions button { transition: none; } }
</style>
