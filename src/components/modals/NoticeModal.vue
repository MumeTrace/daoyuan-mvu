<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from "vue";
import { useImageLibraryStore } from "../../stores/image-library";
import { useNoticeStore } from "../../stores/notice";
import { useStatusDialogStore } from "../../stores/status-dialog";
import { useUiStore } from "../../stores/ui";
import { sanitizeNoticeHtmlCompat } from "../../utils/sanitize";

const notice = useNoticeStore();
const ui = useUiStore();
const statusDialog = useStatusDialogStore();
const images = useImageLibraryStore();
const activeTab = ref("版本更新");
const tabs = computed(() => Object.keys(notice.tabs).length ? Object.keys(notice.tabs) : ["版本更新", "立绘更新", "其他"]);
const content = computed(() => notice.tabs[activeTab.value] || "暂无内容");
const safeContent = computed(() => sanitizeNoticeHtmlCompat(content.value));
type NoticeActionName = "version" | "wiki" | "sync";
const activatingAction = ref<NoticeActionName | null>(null);
let actionPulseTimer: ReturnType<typeof globalThis.setTimeout> | undefined;

function pulseNoticeAction(action: NoticeActionName): void {
  if (actionPulseTimer !== undefined) globalThis.clearTimeout(actionPulseTimer);
  activatingAction.value = null;
  requestAnimationFrame(() => {
    activatingAction.value = action;
    actionPulseTimer = globalThis.setTimeout(() => {
      activatingAction.value = null;
      actionPulseTimer = undefined;
    }, 420);
  });
}

onUnmounted(() => {
  if (actionPulseTimer !== undefined) globalThis.clearTimeout(actionPulseTimer);
});

watch(() => [ui.activeModal, ui.noticeTab], ([modal, tab]) => {
  if (modal === "notice" && typeof tab === "string") activeTab.value = tab;
}, { immediate: true });

async function openRelease(): Promise<void> {
  const accepted = await statusDialog.confirm(
    "本卡禁止商用、二传、倒卖；\n原创发布于 Discord 奖励社区，作者：玖神。",
    {
      title: "原创发布提醒",
      confirmText: "我已知晓并继续",
      cancelText: "取消",
      tone: "danger",
    },
  );
  if (!accepted) return;
  notice.markVersionRead();
  globalThis.open?.("https://discord.com/channels/1134557553011998840/1460952153827971172", "_blank", "noopener,noreferrer");
}
async function onReleaseClick(): Promise<void> {
  pulseNoticeAction("version");
  await openRelease();
}

function onWikiClick(): void {
  pulseNoticeAction("wiki");
}

async function refreshPortraits(): Promise<void> {
  const refreshed = await images.refresh();
  if (refreshed) {
    notice.markPortraitRead();
    await statusDialog.showAlert("图片库已同步完成。", { title: "同步完成" });
    return;
  }
  await statusDialog.showAlert(images.error || "图片库同步失败，请稍后重试。", {
    title: "同步失败",
    tone: "danger",
  });
}
async function onPortraitSyncClick(): Promise<void> {
  pulseNoticeAction("sync");
  await refreshPortraits();
}
</script>

<template>
  <div v-if="ui.activeModal === 'notice'" class="dy-notice-overlay" @click.self="ui.closeModal">
    <section class="dy-notice-dialog" role="dialog" aria-modal="true" aria-label="云端信符">
      <button class="luck-modal-close" type="button" aria-label="关闭" @click="ui.closeModal">×</button>
      <h2>📜 云端信符</h2>
      <nav class="dy-notice-tabs" aria-label="公告分类">
        <button v-for="tab in tabs" :key="tab" type="button" :class="{ active: activeTab === tab }" @click="activeTab = tab">{{ tab }}</button>
      </nav>
      <div class="dy-notice-content">
        <p v-if="notice.loading" class="dy-mana-text">正在接收云端信符…</p>
        <p v-else-if="notice.error" class="danger-text">{{ notice.error }}</p>
        <div v-else class="dy-notice-text" v-html="safeContent"></div>
      </div>
      <footer class="dy-notice-footer">
        <small>传讯时间：{{ notice.date || "未知" }}</small>
        <div class="dy-notice-actions">
          <button class="dy-notice-action dy-notice-action--version" type="button" :class="{ 'dy-update-attention': notice.versionUnread, 'is-activating': activatingAction === 'version' }" @click="onReleaseClick">🚀 最新版本：{{ notice.version || "未知" }}</button>
          <a class="dy-notice-action dy-notice-action--wiki" :class="{ 'is-activating': activatingAction === 'wiki' }" href="https://daoyuan.mayuworld.com/" target="_blank" rel="noopener noreferrer" @click="onWikiClick">📖 查阅道渊 Wiki 图鉴</a>
          <button class="dy-notice-action dy-notice-action--sync" type="button" :class="{ 'dy-update-attention': notice.portraitUnread, 'is-activating': activatingAction === 'sync' }" @click="onPortraitSyncClick">🖼️ 同步最新图片库</button>
        </div>
      </footer>
    </section>
  </div>
</template>
