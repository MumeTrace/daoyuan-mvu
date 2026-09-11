<script setup lang="ts">
import { ref, watch } from "vue";
import { loadJadeLorebooks } from "../../composables/useJadeLorebooks";
import { useJadeStore } from "../../stores/jade-messenger";
import { useSettingsStore } from "../../stores/settings";
import { useStatusDialogStore } from "../../stores/status-dialog";
import { useUiStore } from "../../stores/ui";
import LorebookPicker from "./LorebookPicker.vue";

const jade = useJadeStore();
const settings = useSettingsStore();
const ui = useUiStore();
const statusDialog = useStatusDialogStore();
const selectedPreset = ref("");

watch(() => ui.activeModal, (modal) => {
  if (modal === "jade-settings") void loadJadeLorebooks(jade.activeContact);
});

function applyPreset(): void {
  if (selectedPreset.value) settings.applyPreset(selectedPreset.value);
}
async function savePreset(): Promise<void> {
  const name = await statusDialog.prompt(
    "请输入预设名称；同名预设会被覆盖。",
    selectedPreset.value,
    { title: "保存传讯预设", confirmText: "保存", tone: "default" },
  );
  if (name === null) return;
  if (!name.trim()) {
    await statusDialog.showAlert("预设名称不能为空。", { title: "保存失败", tone: "warning" });
    return;
  }
  if (!settings.savePreset(name)) {
    await statusDialog.showAlert("预设未能写入本地存储，请检查可用空间后重试。", { title: "保存失败", tone: "danger" });
    return;
  }
  selectedPreset.value = name.trim();
  await statusDialog.showAlert(`预设“${selectedPreset.value}”已保存。`, { title: "保存成功" });
}
async function deletePreset(): Promise<void> {
  if (!selectedPreset.value) {
    await statusDialog.showAlert("请先选择一个要删除的预设。", { title: "删除提示", tone: "warning" });
    return;
  }
  const accepted = await statusDialog.confirm(
    `确定删除预设“${selectedPreset.value}”吗？`,
    { title: "删除传讯预设", confirmText: "确认删除", tone: "danger" },
  );
  if (!accepted) return;
  const deletedName = selectedPreset.value;
  if (!settings.deletePreset(deletedName)) {
    await statusDialog.showAlert("预设未能删除，请检查本地存储后重试。", { title: "删除失败", tone: "danger" });
    return;
  }
  selectedPreset.value = "";
  await statusDialog.showAlert(`预设“${deletedName}”已删除。`, { title: "删除成功" });
}
async function save(): Promise<void> {
  if (!settings.saveJade()) {
    await statusDialog.showAlert("基础设定未能写入本地存储，请检查可用空间后重试。", { title: "保存失败", tone: "danger" });
    return;
  }
  ui.closeModal();
  await statusDialog.showAlert("玉简基础设定已保存。", { title: "保存成功" });
}
async function fetchModels(): Promise<void> {
  try { await settings.fetchModels(); } catch { /* error is shown inline */ }
}
</script>

<template>
  <div v-if="ui.activeModal === 'jade-settings'" class="luck-modal-overlay dy-jade-settings-overlay" @click.self="ui.closeModal">
    <div class="luck-modal-content dy-jade-prompt-content">
      <div class="luck-modal-header">✨ 玉简传讯设定 ✨</div>
      <button class="luck-modal-close" type="button" aria-label="关闭" @click="ui.closeModal">×</button>
      <div class="luck-modal-body dy-jade-prompt-body">
        <div class="dy-prompt-section dy-preset-section">
          <strong class="dy-preset-label">预设</strong>
          <div class="dy-preset-row">
            <select v-model="selectedPreset" class="reply-input dy-preset-select" aria-label="预设配置方案" title="选择预设配置方案" @change="applyPreset">
              <option value="">-- 当前手动配置 --</option>
              <option v-for="(_, name) in settings.presets" :key="name" :value="name">{{ name }}</option>
            </select>
            <button class="reply-button dy-preset-action dy-preset-save" type="button" @click="savePreset">保存</button>
            <button class="reply-button dy-preset-action dy-danger-button" type="button" @click="deletePreset">删除</button>
          </div>
        </div>
        <div class="dy-prompt-section">
          <strong>附加设定 / 规则</strong>
          <p>发送传讯时，以下内容会作为系统提示词附加。</p>
          <textarea v-model="settings.jade.customPrompt" class="dy-prompt-textarea" rows="4" placeholder="输入玉简传讯的附加设定或规则..."></textarea>
        </div>
        <LorebookPicker />
        <div class="dy-prompt-section">
          <strong>自定义 API 配置（兼容 OpenAI）</strong>
          <p>配置后优先使用自定义 API；留空则使用酒馆内建生成。</p>
          <label>基础 URL<input v-model.trim="settings.jade.apiBaseUrl" class="reply-input dy-full-input" type="text" placeholder="例如: https://api.example.com/v1" /></label>
          <label>API 密钥<input v-model.trim="settings.jade.apiKey" class="reply-input dy-full-input" type="password" placeholder="sk-..." /></label>
          <div class="dy-model-row">
            <label>模型名称<input v-model.trim="settings.jade.apiModel" class="reply-input dy-full-input" type="text" /></label>
            <button class="reply-button" type="button" :disabled="settings.loadingModels" @click="fetchModels">{{ settings.loadingModels ? "获取中..." : "获取模型" }}</button>
          </div>
          <select v-if="settings.models.length" v-model="settings.jade.apiModel" class="reply-input dy-full-input dy-model-select">
            <option value="">-- 选择模型 --</option><option v-for="model in settings.models" :key="model" :value="model">{{ model }}</option>
          </select>
          <p v-if="settings.modelError" class="danger-text">{{ settings.modelError }}</p>
        </div>
        <div class="dy-prompt-section">
          <strong>📜 最近一次原始返回日志</strong>
          <textarea class="dy-prompt-textarea dy-debug-log" rows="4" readonly :value="settings.debugLog" placeholder="暂无日志..."></textarea>
        </div>
        <button class="reply-button dy-save-settings" type="button" @click="save">保存基础设定</button>
      </div>
    </div>
  </div>
</template>
