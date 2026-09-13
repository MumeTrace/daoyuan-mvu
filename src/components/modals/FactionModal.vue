<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useUiStore } from "../../stores/ui";
import { parseLoreDisplayBlocks } from "../../utils/lore-display";

const ui = useUiStore();
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
  <div v-if="ui.activeModal === 'faction'" id="faction-modal-overlay" class="faction-modal-overlay" @click.self="ui.closeModal">
    <div class="faction-modal-content" :class="{ 'faction-modal-content--lore': ui.factionContentKind === 'lore' }">
      <button class="faction-modal-close" type="button" aria-label="关闭" @click="ui.closeModal">×</button>
      <div class="faction-modal-header">{{ ui.factionTitle }}</div>
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
      </div>
      <div v-if="ui.factionImageUrl" class="faction-modal-map">
        <div class="faction-map-title">宗门舆图</div>
        <img class="faction-map-image" :src="ui.factionImageUrl" :alt="`${ui.factionTitle}舆图`" title="点击放大查看" @click="ui.openImageModal(ui.factionImageUrl)" />
      </div>
      <div class="faction-modal-footer">✨ 乾坤洞察 ✨</div>
    </div>
  </div>
</template>
