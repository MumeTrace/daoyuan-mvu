<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from "vue";
import { useUiStore } from "../../stores/ui";
import LocationDetail from "../map/LocationDetail.vue";
import { overlayHostTarget } from "../../bridge/overlay-host";
const ui = useUiStore();
const dialog = ref<HTMLElement | null>(null);
let returnFocus: HTMLElement | SVGElement | null = null;
watch(() => ui.activeModal, async (active, previous) => {
  if (active === "map-location") {
    if (!previous) returnFocus = ((overlayHostTarget.value?.getRootNode() ?? document) as Document | ShadowRoot).activeElement as HTMLElement | SVGElement | null;
    await nextTick();
    dialog.value?.focus({ preventScroll: true });
  } else if (previous === "map-location" && !active) {
    returnFocus?.focus({ preventScroll: true });
    returnFocus = null;
  }
});
function keyboard(event: KeyboardEvent) {
  if (ui.activeModal !== "map-location") return;
  if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); ui.closeModal(); }
  if (event.key !== "Tab") return;
  const buttons = [...(dialog.value?.querySelectorAll<HTMLElement>('button:not([disabled]),[tabindex="0"]') ?? [])];
  const first = buttons[0], last = buttons[buttons.length - 1];
  const active = (dialog.value?.getRootNode() as Document | ShadowRoot | undefined)?.activeElement;
  if (event.shiftKey && (active === first || active === dialog.value)) { event.preventDefault(); last?.focus(); }
  else if (!event.shiftKey && active === last) { event.preventDefault(); first?.focus(); }
}
onBeforeUnmount(() => { returnFocus = null; });
</script>

<template>
  <div v-if="ui.activeModal === 'map-location' && ui.mapLocation" class="faction-modal-overlay dy-map-location-overlay" @click.self="ui.closeModal" @keydown="keyboard">
    <section ref="dialog" class="faction-modal-content dy-map-location-dialog" role="dialog" aria-modal="true" :aria-label="ui.mapLocation.name" tabindex="-1">
      <button class="faction-modal-close" type="button" aria-label="关闭地域详情" @click="ui.closeModal">×</button>
      <div class="dy-map-location-scroll"><LocationDetail :location="ui.mapLocation" in-modal /></div>
    </section>
  </div>
</template>

<style scoped>
.dy-map-location-overlay { width: var(--dy-overlay-width, 100vw); height: var(--dy-overlay-height, 100dvh); --accent-gold: var(--rare-text); --accent-gold-glow: color-mix(in srgb, var(--rare-text) 28%, transparent); }
.dy-map-location-dialog { width: min(100%, 640px); max-width: 640px; max-height: calc(var(--dy-overlay-height, 100dvh) - 32px); padding: 25px 22px; outline: none; }
.dy-map-location-scroll { overflow-y: auto; min-height: 0; overscroll-behavior: contain; scrollbar-width: thin; scrollbar-color: #86715d transparent; padding-right: 5px; }
.dy-map-location-dialog > .faction-modal-close { z-index: 1; top: 8px; right: 10px; }
@media(max-width:600px) { .dy-map-location-overlay { padding: 8px; } .dy-map-location-dialog { max-height: calc(var(--dy-overlay-height, 100dvh) - 16px); padding: 24px 14px 16px; } }
</style>
