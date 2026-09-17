<script setup lang="ts">
import { nextTick, ref, watch } from "vue";
import { useImageZoom } from "../../composables/useImageZoom";
import { useUiStore } from "../../stores/ui";

const ui = useUiStore();
const overlay = ref<HTMLElement | null>(null);
const { transform, reset, wheel, mouseDown, touchStart, touchMove, touchEnd } = useImageZoom();
watch(() => [ui.activeModal, ui.modalImageUrl], () => {
  reset();
  if (ui.activeModal === "image") void nextTick(() => overlay.value?.focus({ preventScroll: true }));
});

function close(event: Event): void {
  void event;
  reset();
  ui.closeModal();
}
</script>

<template>
  <div v-if="ui.activeModal === 'image'" ref="overlay" tabindex="-1" role="dialog" aria-label="全屏图片查看器" id="image-modal-overlay" class="image-modal-overlay" @keydown.esc.stop.prevent="close" @click.self="close" @wheel="wheel" @touchmove="touchMove" @touchend="touchEnd">
    <button class="image-modal-close" type="button" aria-label="关闭" @click="close">×</button>
    <img id="modal-image" class="image-modal-content" :src="ui.modalImageUrl || undefined" alt="立绘大图" :style="{ transform }" @mousedown="mouseDown" @touchstart="touchStart" />
  </div>
</template>
