<script setup lang="ts">
import { computed, ref } from "vue";
import { useJadeStore } from "../../stores/jade-messenger";
import { useJadeLoreStore, type JadeLoreEntry } from "../../stores/jade-lore";
import { useSettingsStore } from "../../stores/settings";
import { useStatusDialogStore } from "../../stores/status-dialog";

const jade = useJadeStore();
const lore = useJadeLoreStore();
const settings = useSettingsStore();
const statusDialog = useStatusDialogStore();
const expanded = ref<Record<string, boolean>>({});
const saveMessage = ref("");
const saveTone = ref<"success" | "error">("success");
const selectedUids = computed(() => {
  return new Set((settings.loreSelections[jade.activeContact] ?? []).map((entry) => String(entry.uid)));
});

function entryName(entry: JadeLoreEntry): string {
  if (entry.comment) return entry.comment;
  if (Array.isArray(entry.key)) return entry.key.join(", ") || "未命名条目";
  return String(entry.key || "未命名条目");
}

function toggleSelection(entry: JadeLoreEntry, event: Event): void {
  const input = event.currentTarget as HTMLInputElement;
  const checked = input.checked;
  const current = settings.loreSelections[jade.activeContact] ?? [];
  const uid = String(entry.uid ?? "");
  const next = checked
    ? [...current.filter((item) => item.uid !== uid), { uid, content: String(entry.content ?? "") }]
    : current.filter((item) => item.uid !== uid);
  const saved = settings.saveLoreSelection(jade.activeContact, next);
  saveTone.value = saved ? "success" : "error";
  saveMessage.value = saved ? "勾选已自动保存。" : "保存失败，请检查本地存储后重试。";
  if (!saved) input.checked = !checked;
}

async function saveChecked(): Promise<void> {
  const current = settings.loreSelections[jade.activeContact] ?? [];
  const saved = settings.saveLoreSelection(jade.activeContact, current);
  saveTone.value = saved ? "success" : "error";
  saveMessage.value = saved ? "世界书勾选已保存至本地。" : "世界书勾选保存失败。";
  await statusDialog.showAlert(saveMessage.value, {
    title: saved ? "保存完成" : "保存失败",
    tone: saved ? "default" : "danger",
  });
}

function toggleEntry(entry: JadeLoreEntry): void {
  const key = String(entry.uid ?? `${entry.lbName}:${entryName(entry)}`);
  expanded.value[key] = !expanded.value[key];
}
</script>
<template>
  <div class="dy-prompt-section">
    <div class="dy-prompt-heading-row">
      <strong>📚 角色知识注入 (世界书)</strong>
      <button class="reply-button dy-lore-save-button" type="button" @click="saveChecked">💾 保存勾选</button>
    </div>
    <p>勾选需要让对方在当前传讯中知晓的设定；勾选后会自动保存，世界书不可用时会保留原有选择。</p>
    <p v-if="saveMessage" class="dy-lore-save-status" :data-tone="saveTone">{{ saveMessage }}</p>
    <input id="wx-lore-search" v-model="lore.query" class="reply-input dy-full-input" type="search" placeholder="搜索条目名称或内容..." />
    <div id="wx-lorebook-list" class="dy-lorebook-list">
      <div v-if="lore.loading" class="dy-mana-text">{{ lore.status }}</div>
      <div v-else-if="lore.error" class="danger-text">{{ lore.error }}</div>
      <div v-else-if="!lore.filteredEntries.length" class="dy-empty-state">{{ lore.status || "未找到匹配的世界书条目。" }}</div>
      <div v-for="entry in lore.filteredEntries" v-else :key="String(entry.uid ?? `${entry.lbName}:${entryName(entry)}`)" class="dy-lore-entry">
        <label>
          <input class="yujian-lore-checkbox" type="checkbox" :value="String(entry.uid ?? '')" :checked="selectedUids.has(String(entry.uid))" @change="toggleSelection(entry, $event)" />
          <span><strong>{{ entryName(entry) }}</strong><small>来源: {{ entry.lbName }}</small></span>
          <button type="button" title="展开/折叠内容" @click.prevent="toggleEntry(entry)">{{ expanded[String(entry.uid ?? `${entry.lbName}:${entryName(entry)}`)] ? "▲" : "▼" }}</button>
        </label>
        <div v-if="expanded[String(entry.uid ?? `${entry.lbName}:${entryName(entry)}`)]" class="dy-lore-content">{{ entry.content }}</div>
      </div>
    </div>
  </div>
</template>
