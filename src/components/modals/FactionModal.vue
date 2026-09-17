<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useUiStore } from "../../stores/ui";
import { parseLoreDisplayBlocks } from "../../utils/lore-display";
import GuardianPortrait from "../map/GuardianPortrait.vue";
import { useLoreSearch } from "../../composables/useLoreSearch";

const ui = useUiStore();
const loreSearch = useLoreSearch();
const showRaw = ref(false);
const loreBlocks = computed(() =>
  ui.factionContentKind === "lore"
    ? parseLoreDisplayBlocks(ui.factionNote)
    : [],
);
const hasStructuredLore = computed(() => loreBlocks.value.length > 0);
const visibleLoreBlocks = computed(() =>
  loreBlocks.value.filter(
    (block) => !(block.type === "heading" && ui.factionTitle.includes(block.content)),
  ),
);

watch(
  () => [ui.factionNote, ui.factionContentKind],
  () => (showRaw.value = false),
);
</script>

<template>
  <div v-if="ui.activeModal === 'faction'" id="faction-modal-overlay" class="faction-modal-overlay" :class="{ 'dy-map-faction-overlay': ui.factionMapContext }" @click.self="ui.closeModal">
    <div class="faction-modal-content" :class="{ 'faction-modal-content--lore': ui.factionContentKind === 'lore' }">
      <button class="faction-modal-close" type="button" aria-label="关闭" @click="ui.closeModal">×</button>
      <div class="faction-modal-header"><button v-if="ui.factionPortraitName" class="dy-guardian-name" type="button" :aria-label="`查看${ui.factionPortraitName}人物详情`" title="点击查看人物详情" @click="loreSearch.openCharacterLore(ui.factionPortraitName, { asChild: true, mapContext: true })">{{ ui.factionTitle }}<small>人物详情 ›</small></button><template v-else>{{ ui.factionTitle }}</template></div>
      <div v-if="hasStructuredLore" class="faction-lore-toolbar">
        <span>仅整理显示，不修改世界书原文</span>
        <button type="button" @click="showRaw = !showRaw">{{ showRaw ? "整理阅读" : "查看原文" }}</button>
      </div>
      <div class="faction-modal-body" :class="{ 'faction-modal-body--lore': hasStructuredLore && !showRaw }">
        <div v-if="hasStructuredLore && !showRaw" class="faction-lore-blocks">
          <template v-for="(block, index) in visibleLoreBlocks" :key="`${block.label}-${index}`">
            <div v-if="block.type === 'heading'" class="faction-lore-heading">{{ block.content }}</div>
            <section v-else-if="block.type === 'field'" class="faction-lore-field" :class="{ 'is-long': block.content.length > 90 }">
              <strong>{{ block.label }}</strong>
              <p>{{ block.content }}</p>
            </section>
            <p v-else class="faction-lore-text">{{ block.content }}</p>
          </template>
        </div>
        <div v-else class="faction-lore-raw dy-pre-line">{{ ui.factionNote }}</div>
        <GuardianPortrait v-if="ui.factionPortraitName" :key="ui.factionPortraitName" :name="ui.factionPortraitName" />
      </div>
      <div v-if="ui.factionImageUrl && !ui.factionPortraitName" class="faction-modal-map">
        <div class="faction-map-title">宗门舆图</div>
        <img class="faction-map-image" :src="ui.factionImageUrl" :alt="`${ui.factionTitle}舆图`" title="点击放大查看" @click="ui.openImageModal(ui.factionImageUrl)" />
      </div>
      <div class="faction-modal-footer">✨ 乾坤洞察 ✨</div>
    </div>
  </div>
</template>

<style scoped>
.dy-map-faction-overlay { width: var(--dy-overlay-width, 100vw); height: var(--dy-overlay-height, 100dvh); --accent-gold: var(--rare-text); --accent-gold-glow: color-mix(in srgb, var(--rare-text) 28%, transparent); }
.dy-map-faction-overlay .faction-modal-content { max-height: calc(var(--dy-overlay-height, 100dvh) - 32px); }
@media (max-width: 600px) {
  .dy-map-faction-overlay { padding: 8px; }
  .dy-map-faction-overlay .faction-modal-content { width: 100%; max-height: calc(var(--dy-overlay-height, 100dvh) - 16px); padding: 18px 14px; }
}
.dy-guardian-name { border: 0; padding: 0 10px; background: transparent; color: inherit; font: inherit; letter-spacing: inherit; cursor: pointer; }
.dy-guardian-name small { display: block; font-size: 11px; margin-top: 7px; color: var(--text-dim); font-weight: normal; letter-spacing: 1px; }
.dy-guardian-name:hover small { color: var(--rare-text); }
.dy-guardian-name:focus-visible { outline: 1px solid var(--rare-text); outline-offset: 4px; }
</style>
