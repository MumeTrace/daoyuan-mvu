<script setup lang="ts">
import { computed, ref } from "vue";
import { getDaoyuanStorage } from "../../bridge/storage";
import { useImageLibraryStore } from "../../stores/image-library";
import { useUiStore } from "../../stores/ui";
import type { MapFaction } from "../../data/lore-xuantian";
import RealmAtlas from "./RealmAtlas.vue";
import { xuantianAtlas } from "./atlas/xuantian-atlas";
import { xianjieAtlas } from "./atlas/xianjie-atlas";
import { useAtlasPreferences } from "./atlas/useAtlasPreferences";
import { resolveAtlasPosition } from "./atlas/location-match";
import { useWorldStore } from "../../stores/world";
import { safeImageUrl, safeWebUrl } from "../../utils/safe-url";

const ui = useUiStore();
const images = useImageLibraryStore();
const world = useWorldStore();
const { opened, setOpened, persistenceError } = useAtlasPreferences();
const atlases = [xuantianAtlas, xianjieAtlas];
const position = computed(() => resolveAtlasPosition(world.currentLocation, atlases));
const show2d = ref(false);
const show3d = ref(false);
const warningOpen = ref(false);
const rememberWarning = ref(true);
const map3dFrame = ref<(HTMLIFrameElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
  msRequestFullscreen?: () => Promise<void> | void;
}) | null>(null);
const storage = getDaoyuanStorage();
const fallbackMapImage = safeImageUrl("https://free-img.400040.xyz/4/2026/05/17/6a09d0b65af1c.png");
const mapImage = computed(() => safeImageUrl(images.getSectMapUrl("玄天界")) || fallbackMapImage);
const map3dUrl = safeWebUrl("https://mumetrace.github.io/daoyuan-map/");

function openAtlasFaction(faction: MapFaction): void {
  ui.openFactionModal(`【${faction.name}】`, faction.note || "暂无详细信息", images.getSectMapUrl(faction.name), { mapContext: true });
}

function toggle2d(): void {
  show2d.value = !show2d.value;
  if (show2d.value) show3d.value = false;
}

function toggle3d(): void {
  if (show3d.value) {
    show3d.value = false;
    return;
  }
  if (storage.getItem("dy_map3d_warned") === "1") {
    show3d.value = true;
    show2d.value = false;
    return;
  }
  warningOpen.value = true;
}

function confirm3d(): void {
  if (rememberWarning.value) {
    try {
      storage.setItem("dy_map3d_warned", "1");
    } catch (error) {
      console.warn("[道渊] 3D 舆图提醒偏好未能持久化。", error);
    }
  }
  warningOpen.value = false;
  show3d.value = true;
  show2d.value = false;
}

function fullscreen(): void {
  const frame = map3dFrame.value;
  if (!frame) return;
  const request = frame.requestFullscreen ?? frame.webkitRequestFullscreen ?? frame.msRequestFullscreen;
  if (request) void request.call(frame);
}
</script>

<template>
  <div class="dy-world-map">
    <div class="dy-map-mode-row">
      <button type="button" @click="toggle2d">{{ show2d ? "[ 关闭 2D 全图 ]" : "[ 查看 2D 全图 ]" }}</button>
      <button class="dy-map-3d-button" type="button" @click="toggle3d">{{ show3d ? "[ 关闭 3D 舆图 ]" : "[ 开启 3D 舆图 ]" }}</button>
    </div>

    <button v-if="show2d" class="dy-map-overview" type="button" title="点击放大查看" @click="ui.openImageModal(mapImage)">
      <img :src="mapImage" alt="玄天界全图" />
    </button>

    <div v-if="show3d" class="dy-map-3d-container">
      <button class="dy-map-fullscreen" type="button" @click="fullscreen">⛶ 全屏显示</button>
      <iframe id="map-3d-iframe" ref="map3dFrame" :src="map3dUrl" title="道渊 3D 舆图"></iframe>
    </div>

    <RealmAtlas v-for="atlas in atlases" :key="atlas.id" :atlas="atlas" :opened="opened[atlas.id]" :position="position"
      @update:opened="setOpened(atlas.id, $event)" @location="ui.openMapLocation" @faction="openAtlasFaction" />
    <p v-if="persistenceError" class="danger-text">地图开关未能持久保存，当前会话仍保留本次选择。</p>

    <div v-if="warningOpen" class="luck-modal-overlay dy-map-warning-overlay" @click.self="warningOpen = false">
      <div class="luck-modal-content dy-map-warning-content">
        <div class="luck-modal-header">⚠️ 性能提示</div>
        <p>3D 立体舆图在部分手机设备上可能会引起明显的卡顿或发热。建议在电脑端或性能较好的设备上体验。</p>
        <label class="dy-map-warning-choice"><input v-model="rememberWarning" type="checkbox" /> 不再提示</label>
        <div class="dy-map-warning-actions">
          <button class="btn-cancel" type="button" @click="warningOpen = false">取消</button>
          <button class="btn-confirm" type="button" @click="confirm3d">继续开启</button>
        </div>
      </div>
    </div>
  </div>
</template>
