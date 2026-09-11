<script setup lang="ts">
import { useImageZoom } from "../../composables/useImageZoom";
import { useUiStore } from "../../stores/ui";

const ui = useUiStore();
const { transform, reset, wheel, mouseDown, touchStart, touchMove, touchEnd } = useImageZoom();

function close(event: Event): void {
  void event;
  reset();
  ui.closeModal();
}
</script>

<template>
  <div v-if="ui.activeModal === 'image'" id="image-modal-overlay" class="image-modal-overlay" @click.self="close" @wheel="wheel" @touchmove="touchMove" @touchend="touchEnd">
    <button class="image-modal-close" type="button" aria-label="关闭" @click="close">×</button>
    <img id="modal-image" class="image-modal-content" :src="ui.modalImageUrl || undefined" alt="立绘大图" :style="{ transform }" @mousedown="mouseDown" @touchstart="touchStart" />
  </div>
</template>
