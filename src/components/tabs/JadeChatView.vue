<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import { useJadeStore } from "../../stores/jade-messenger";
import { useUiStore } from "../../stores/ui";
import { usePortraitStore } from "../../stores/portraits";
import { useStatusDialogStore } from "../../stores/status-dialog";
import type { DataRecord } from "../../types/stat-data";
import { text } from "./view-helpers";

const emit = defineEmits<{ back: [] }>();
const jade = useJadeStore();
const ui = useUiStore();
const portraits = usePortraitStore();
const statusDialog = useStatusDialogStore();
const detailOpen = ref(false);
const reply = ref("");
const messagesRoot = ref<HTMLElement | null>(null);
const replyInput = ref<HTMLTextAreaElement | null>(null);
const activeData = computed<DataRecord>(() => jade.contacts[jade.activeContact] ?? {});
const history = computed(() => {
  const source = activeData.value.历史记录;
  if (!source || typeof source !== "object" || Array.isArray(source)) return [];
  return Object.entries(source as Record<string, DataRecord>);
});
const activePortrait = computed(() => portraits.getUrl(jade.activeContact, activeData.value.性别));

function resizeReplyInput(): void {
  const element = replyInput.value;
  if (!element) return;
  element.style.height = "auto";
  element.style.height = `${Math.min(element.scrollHeight, 120)}px`;
}

async function send(): Promise<void> {
  const content = reply.value.trim();
  if (!content || !jade.activeContact || jade.generating) return;
  reply.value = "";
  try { await jade.sendMessage(jade.activeContact, content); }
  catch { /* The user message is already persisted; avoid restoring a duplicate draft. */ }
}

watch(() => [jade.activeContact, history.value.length], () => {
  void nextTick(() => {
    if (messagesRoot.value) messagesRoot.value.scrollTop = messagesRoot.value.scrollHeight;
  });
}, { immediate: true });

watch(reply, () => {
  void nextTick(resizeReplyInput);
}, { immediate: true });

async function removeMessage(messageId: string): Promise<void> {
  const accepted = await statusDialog.confirm(
    "确定删除这条传讯吗？",
    { title: "删除传讯", confirmText: "确认删除", tone: "danger" },
  );
  if (!accepted) return;
  await jade.deleteMessage(jade.activeContact, messageId);
}

async function retry(messageId: string): Promise<void> {
  const accepted = await statusDialog.confirm(
    "确定重新生成并替换这条回复吗？原回复会保留到新回复成功后。",
    { title: "重新生成传讯", confirmText: "重新生成并替换", tone: "warning" },
  );
  if (!accepted) return;
  await jade.retryMessage(jade.activeContact, messageId);
}
</script>

<template>
  <div id="wx-chat-view" class="wx-chat-view dy-vue-chat">
    <div id="wx-chat-bg" class="wx-chat-bg" :style="activePortrait ? { backgroundImage: `url(${JSON.stringify(activePortrait)})` } : { backgroundImage: 'none' }"></div>
    <div class="wx-chat-header">
      <button class="wx-back-btn" type="button" @click="emit('back')">❮ 返回</button>
      <button id="wx-chat-title" class="wx-chat-title" type="button" @click="detailOpen = !detailOpen">{{ jade.activeContact }}</button>
      <button class="wx-api-btn" type="button" title="玉简设定" @click="ui.setActiveModal('jade-settings')">⚙️</button>
      <div id="wx-detail-modal" class="wx-detail-modal" :class="{ show: detailOpen }">
        <div class="wx-detail-item"><span>境界</span><span class="rare-text">{{ text(activeData.境界) }}</span></div>
        <div class="wx-detail-item"><span>性别</span><span>{{ text(activeData.性别) }}</span></div>
        <div class="wx-detail-item"><span>关系</span><span class="dy-gold-text">{{ text(activeData.关系, "陌生") }}</span></div>
        <div class="wx-detail-item"><span>好感度</span><span class="dy-san-text">{{ text(activeData.好感度, "0") }}</span></div>
      </div>
    </div>
    <div id="wx-chat-messages" ref="messagesRoot" class="wx-chat-messages">
      <div v-for="[messageId, record] in history" :key="messageId" class="wx-msg-row" :class="record.发送者 === '我' ? 'wx-msg-right' : 'wx-msg-left'">
        <div class="wx-msg-sender">{{ text(record.发送者) }} <span>{{ text(record.时间, "") }}</span></div>
        <div class="wx-msg-bubble">{{ text(record.内容, "") }}</div>
        <div class="wx-msg-actions">
          <button class="wx-msg-action-btn" type="button" @click="removeMessage(messageId)">🗑️删除</button>
          <button v-if="record.发送者 !== '我'" class="wx-msg-action-btn" type="button" :disabled="jade.generating" @click="retry(messageId)">🔄重试</button>
        </div>
      </div>
      <div v-if="jade.generating" class="wx-msg-row wx-msg-left dy-streaming-message" aria-live="polite">
        <div class="wx-msg-sender">{{ jade.activeContact }} <span>传讯中</span></div>
        <div class="wx-msg-bubble">{{ jade.streamingReply || "正在凝聚神念…" }}<span class="dy-stream-caret" aria-hidden="true"></span></div>
      </div>
      <div v-if="!history.length" class="dy-empty-chat">暂无传讯记录</div>
    </div>
    <div class="wx-chat-input-area"><div class="message-reply-container">
      <textarea id="wx-reply-input" ref="replyInput" v-model="reply" class="reply-input" rows="1" :disabled="jade.generating" :placeholder="`输入传讯给 ${jade.activeContact}... (Enter发送, Shift+Enter换行)`" @input="resizeReplyInput" @keydown.enter.exact.prevent="send"></textarea>
      <button v-if="jade.generating" id="wx-reply-btn" class="reply-button dy-stop-generation" type="button" @click="jade.stopGeneration">■ 停止</button>
      <button v-else id="wx-reply-btn" class="reply-button" type="button" :disabled="!reply.trim()" @click="send">发送</button>
    </div></div>
    <p v-if="jade.lastError" class="danger-text dy-chat-error">{{ jade.lastError }}</p>
  </div>
</template>
