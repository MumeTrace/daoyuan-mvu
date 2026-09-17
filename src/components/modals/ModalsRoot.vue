<script setup lang="ts">
import { onBeforeUnmount, watch } from "vue";
import { useUiStore } from "../../stores/ui";
import { acquireOverlayHost, overlayHostTarget } from "../../bridge/overlay-host";
import FactionModal from "./FactionModal.vue";
import ImageModal from "./ImageModal.vue";
import LuckModal from "./LuckModal.vue";
import NoticeModal from "./NoticeModal.vue";
import JiuqiStory from "./JiuqiStory.vue";
import JiuqiEditModal from "./JiuqiEditModal.vue";
import PortraitCustomModal from "./PortraitCustomModal.vue";
import MissingPortraitModal from "./MissingPortraitModal.vue";
import StatusDialog from "./StatusDialog.vue";
import MapLocationModal from "./MapLocationModal.vue";
const ui = useUiStore();
let releaseModalHost: (() => void) | undefined;
watch(() => ui.activeModal === "image" || ui.activeModal === "map-location" ||
  (ui.activeModal === "faction" && ui.factionMapContext), needsHost => {
  if (needsHost && !releaseModalHost) releaseModalHost = acquireOverlayHost().release;
  if (!needsHost) { releaseModalHost?.(); releaseModalHost = undefined; }
}, { flush: "pre", immediate: true });
onBeforeUnmount(() => releaseModalHost?.());
</script>
<template>
  <Teleport :to="overlayHostTarget || 'body'">
  <ImageModal />
  <FactionModal />
  <MapLocationModal />
  <LuckModal />
  <NoticeModal />
  <JiuqiStory />
  <JiuqiEditModal />
  <MissingPortraitModal />
  <PortraitCustomModal />
  <StatusDialog />
  </Teleport>
</template>
