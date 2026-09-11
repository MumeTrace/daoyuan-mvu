<script setup lang="ts">
import { useUiStore } from "../../stores/ui";
const ui = useUiStore();
</script>

<template>
  <div v-if="ui.activeModal === 'faction'" id="faction-modal-overlay" class="faction-modal-overlay" @click.self="ui.closeModal">
    <div class="faction-modal-content">
      <button class="faction-modal-close" type="button" aria-label="关闭" @click="ui.closeModal">×</button>
      <div class="faction-modal-header">{{ ui.factionTitle }}</div>
      <div class="faction-modal-body dy-pre-line">{{ ui.factionNote }}</div>
      <div v-if="ui.factionImageUrl" class="faction-modal-map">
        <div class="faction-map-title">宗门舆图</div>
        <img class="faction-map-image" :src="ui.factionImageUrl" :alt="`${ui.factionTitle}舆图`" title="点击放大查看" @click="ui.openImageModal(ui.factionImageUrl)" />
      </div>
      <div class="faction-modal-footer">✨ 乾坤洞察 ✨</div>
    </div>
  </div>
</template>
