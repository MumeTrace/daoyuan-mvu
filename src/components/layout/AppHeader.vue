<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import type { CSSProperties } from "vue";
import { useHeroStore } from "../../stores/hero";
import { useUiStore } from "../../stores/ui";
import { useNoticeStore } from "../../stores/notice";
import { useImageLibraryStore } from "../../stores/image-library";
import { scheduleAfterFirstPaint } from "../../utils/schedule-idle";
import HeroDropdown from "./HeroDropdown.vue";

const ui = useUiStore();
const notice = useNoticeStore();
const hero = useHeroStore();
const images = useImageLibraryStore();
const header = ref<HTMLElement | null>(null);
const dropdownOpen = ref(false);
const editToastVisible = ref(false);
let pressTimer: ReturnType<typeof setTimeout> | undefined;
let cancelNoticeSchedule: (() => void) | undefined;
let toastTimer: ReturnType<typeof setTimeout> | undefined;
let pointerDown = false;
let longPressed = false;

const controlsStyle = computed<CSSProperties>(() => ({
  maxWidth:
    ui.actionButtonsCollapsed || ui.statusBarCollapsed ? "0px" : "500px",
  opacity: ui.actionButtonsCollapsed || ui.statusBarCollapsed ? "0" : "1",
  pointerEvents:
    ui.actionButtonsCollapsed || ui.statusBarCollapsed ? "none" : "auto",
}));

const toggleIcon = computed(() => {
  if (ui.statusBarCollapsed) return "🔽";
  return ui.actionButtonsCollapsed ? "◀️" : "🔼";
});
const toggleText = computed(() =>
  ui.statusBarCollapsed || ui.actionButtonsCollapsed ? "展开" : "收起",
);
const hasNoticeAttention = computed(() => {
  return notice.hasUnread || !images.loaded || Boolean(images.error);
});

function closeDropdown(event: MouseEvent): void {
  if (!header.value?.contains(event.target as Node)) dropdownOpen.value = false;
}

function toggleDropdown(): void {
  if (!ui.statusBarCollapsed) dropdownOpen.value = !dropdownOpen.value;
}

function edit(): void {
  if (ui.statusBarCollapsed) return;
  ui.requestEditMode(String(hero.data.姓名 || "default"));
  if (!ui.editMode) return;
  editToastVisible.value = true;
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (editToastVisible.value = false), 3000);
}

function openNotice(): void {
  ui.openNotice();
  void notice.load();
}

function beginToggle(event: PointerEvent): void {
  if (event.pointerType === "mouse" && event.button !== 0) return;
  pointerDown = true;
  longPressed = false;
  pressTimer = setTimeout(() => {
    if (!pointerDown) return;
    longPressed = true;
    const collapsed = !ui.statusBarCollapsed;
    ui.setStatusBarCollapsed(collapsed);
    if (collapsed) {
      dropdownOpen.value = false;
      ui.setActionButtonsCollapsed(true);
    }
  }, 500);
}

function finishToggle(): void {
  if (!pointerDown) return;
  pointerDown = false;
  if (pressTimer) clearTimeout(pressTimer);
  if (longPressed) return;

  if (ui.statusBarCollapsed) {
    ui.setStatusBarCollapsed(false);
    ui.setActionButtonsCollapsed(false);
  } else {
    ui.setActionButtonsCollapsed(!ui.actionButtonsCollapsed);
  }
}

function cancelToggle(): void {
  pointerDown = false;
  if (pressTimer) clearTimeout(pressTimer);
}

onMounted(() => {
  document.addEventListener("click", closeDropdown);
  cancelNoticeSchedule = scheduleAfterFirstPaint(
    () => void notice.load(),
    1800,
  );
});

onBeforeUnmount(() => {
  document.removeEventListener("click", closeDropdown);
  if (pressTimer) clearTimeout(pressTimer);
  cancelNoticeSchedule?.();
  if (toastTimer) clearTimeout(toastTimer);
});
</script>

<template>
  <div ref="header" class="header">
    <div class="guild-badge">
      <button
        id="hero-info-btn"
        class="guild-logo"
        type="button"
        title="点击查看主角信息"
        aria-controls="hero-info-dropdown"
        :aria-expanded="dropdownOpen"
        @click.stop="toggleDropdown"
      >
        修
      </button>
      <div class="guild-name">面板</div>
    </div>

    <HeroDropdown :open="dropdownOpen" />

    <div id="dy-right-container" class="dy-right-container">
      <div id="dy-btns-container" class="dy-btns-container" :style="controlsStyle">
        <button
          id="dy-notice-btn"
          class="dy-top-btn dy-notice-btn-class"
          type="button"
          :disabled="ui.statusBarCollapsed"
          :class="{ 'dy-update-attention': hasNoticeAttention }"
          @click="openNotice"
        >
          <span class="dy-btn-icon">🔔</span><span class="dy-btn-txt">公告</span>
        </button>
        <button
          id="dy-jiuqi-btn"
          class="dy-top-btn"
          type="button"
          :disabled="ui.statusBarCollapsed"
          @click="edit"
        >
          <span class="dy-btn-icon">✏️</span><span class="dy-btn-txt">修改</span>
        </button>
      </div>
      <button
        id="dy-toggle-bar-btn"
        class="dy-top-btn"
        type="button"
        title="短按展开按钮，长按收起整个面板"
        @pointerdown="beginToggle"
        @pointerup="finishToggle"
        @pointercancel="cancelToggle"
        @pointerleave="cancelToggle"
      >
        <span class="dy-btn-icon">{{ toggleIcon }}</span>
        <span class="dy-btn-txt">{{ toggleText }}</span>
      </button>
    </div>
  </div>

  <Transition name="dy-toast">
    <div v-if="editToastVisible" id="dy-edit-toast" class="dy-edit-toast">
      <strong>✏️ 修改模式已开启</strong><br />
      <span>面板删除按钮已临时替换为修改图标，点击即可修改底层变量</span>
    </div>
  </Transition>
</template>

<style scoped src="../../styles/components/app-header.css"></style>
