<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from "vue";
import { readStorageJson, writeStorageJson } from "../../bridge/storage";
import { useJadeStore } from "../../stores/jade-messenger";
import { useUiStore } from "../../stores/ui";
import { usePortraitStore } from "../../stores/portraits";
import { useStatusDialogStore } from "../../stores/status-dialog";
import type { DataRecord } from "../../types/stat-data";
import JadeChatView from "./JadeChatView.vue";
import { text } from "./view-helpers";

const jade = useJadeStore();
const ui = useUiStore();
const portraits = usePortraitStore();
const statusDialog = useStatusDialogStore();
const READ_KEY = "daoyuan_wx_read_states";
const longPressed = ref(false);
let pressTimer: ReturnType<typeof setTimeout> | undefined;

function contactPreview(name: string, data: DataRecord): { time: string; label: string; unread: boolean } {
  const records = data.历史记录 && typeof data.历史记录 === "object" ? data.历史记录 as Record<string, DataRecord> : {};
  const ids = Object.keys(records);
  if (!ids.length) return { time: "", label: "暂无传讯记录", unread: false };
  const lastId = ids[ids.length - 1] ?? "";
  const reads = readStorageJson<Record<string, string>>(READ_KEY, {});
  return { time: text(records[lastId]?.时间, ""), label: reads[name] === lastId ? "[没有新传讯]" : "[收到新传讯]", unread: reads[name] !== lastId };
}

function openContact(name: string): void {
  if (longPressed.value) { longPressed.value = false; return; }
  jade.activeContact = name;
  const activeData = jade.contacts[name] ?? {};
  const records = activeData.历史记录 && typeof activeData.历史记录 === "object" ? activeData.历史记录 as Record<string, DataRecord> : {};
  const ids = Object.keys(records);
  if (ids.length) {
    const reads = readStorageJson<Record<string, string>>(READ_KEY, {});
    reads[name] = ids[ids.length - 1] ?? "";
    writeStorageJson(READ_KEY, reads);
  }
}

function startPress(name: string, event: PointerEvent): void {
  if (event.pointerType === "mouse" && event.button !== 0) return;
  longPressed.value = false;
  pressTimer = setTimeout(async () => {
    longPressed.value = true;
    const accepted = await statusDialog.confirm(
      `是否销毁与【${name}】的全部玉简传讯记录？`,
      { title: "销毁传讯", confirmText: "确认销毁", tone: "danger" },
    );
    if (accepted) await jade.removeContact(name);
  }, 800);
}
function endPress(): void { if (pressTimer) clearTimeout(pressTimer); pressTimer = undefined; }
onBeforeUnmount(endPress);

function back(): void {
  jade.activeContact = "";
}

watch(() => jade.contacts, (contacts) => {
  if (jade.activeContact && !contacts[jade.activeContact]) back();
}, { deep: true, immediate: true });
</script>

<template>
  <div v-if="!jade.activeContact" id="wx-list-view" class="wx-list-view">
    <div
      v-for="[name, data] in jade.entries"
      :key="name"
      class="wx-list-item"
      :data-name="name"
      @pointerdown="startPress(name, $event)"
      @pointerup="endPress"
      @pointerleave="endPress"
      @click="openContact(name)"
    >
      <div class="wx-unread-dot" :class="{ show: contactPreview(name, data).unread }"></div>
      <div class="wx-avatar-container" @click.stop>
        <img
          v-if="portraits.getUrl(name, data.性别)"
          :src="portraits.getUrl(name, data.性别)"
          class="portrait-img"
          :alt="name"
          @click="ui.openImageModal(portraits.getUrl(name, data.性别))"
        />
        <div v-else class="portrait-img dy-jade-avatar-fallback">?</div>
        <button class="wx-avatar-custom-btn" type="button" title="自定义头像" @click="ui.openPortraitEditor(name)">🎨设置</button>
      </div>
      <div class="wx-list-info">
        <div class="dy-jade-list-header"><div class="wx-list-name">{{ name }}</div><div class="dy-card-meta">{{ contactPreview(name, data).time }}</div></div>
        <div class="wx-list-preview" :class="{ 'dy-mana-text': contactPreview(name, data).unread }">{{ contactPreview(name, data).label }}</div>
      </div>
    </div>
    <p v-if="!jade.entries.length" class="dy-empty-state dy-centered-empty">暂无玉简传讯记录。</p>
  </div>

  <JadeChatView v-else @back="back" />
</template>
