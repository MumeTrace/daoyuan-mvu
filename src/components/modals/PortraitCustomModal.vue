<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { getThemeUi } from "../../features/portraits/theme-ui";
import { usePortraitStore } from "../../stores/portraits";
import { useUiStore } from "../../stores/ui";
import { safeImageUrl } from "../../utils/safe-url";

const ui = useUiStore();
const portraits = usePortraitStore();
interface UrlRow { id: number; value: string }
let nextUrlRowId = 0;
const createUrlRow = (value = ""): UrlRow => ({ id: ++nextUrlRowId, value });
const urls = ref<UrlRow[]>([createUrlRow()]);
const error = ref("");
const fileName = ref("未选择文件...");
const confirmAction = ref<"current" | "all" | null>(null);
const saving = ref(false);
const preview = computed(() => urls.value.map((row) => safeImageUrl(row.value)).find(Boolean) ?? "");
const themeUi = computed(() => getThemeUi(ui.portraitEditorTheme));
const hasCustom = computed(() => Boolean(portraits.preferences.customImages[ui.portraitEditorName]?.[ui.portraitEditorTheme]?.length));

watch(() => [ui.activeModal, ui.portraitEditorName, ui.portraitEditorTheme], ([modal]) => {
  if (modal !== "portrait-editor") return;
  portraits.reload();
  const current = portraits.themeUrls(ui.portraitEditorName, ui.portraitEditorTheme);
  urls.value = (current.length ? current : [""]).map(createUrlRow);
  error.value = "";
  fileName.value = "未选择文件...";
  confirmAction.value = null;
  saving.value = false;
});

function addUrl(): void { urls.value.push(createUrlRow()); }
function removeUrl(index: number): void {
  urls.value.splice(index, 1);
  if (!urls.value.length) urls.value.push(createUrlRow());
}
function fileChanged(event: Event): void {
  const file = (event.currentTarget as HTMLInputElement).files?.[0];
  if (!file) return;
  if (!file.type.startsWith("image/")) { error.value = "请选择有效的图片文件。"; return; }
  if (file.size > 5 * 1024 * 1024) { error.value = "图片文件不能超过 5MB，建议使用图床链接。"; return; }
  fileName.value = `📷 ${file.name} (${(file.size / 1024).toFixed(1)}KB)`;
  const reader = new FileReader();
  reader.onload = () => {
    const first = urls.value[0] ?? createUrlRow();
    if (!urls.value.length) urls.value.push(first);
    first.value = typeof reader.result === "string" ? reader.result : "";
    error.value = "";
  };
  reader.onerror = () => { error.value = "读取本地图片失败。"; };
  reader.readAsDataURL(file);
}
function sync(): void {
  globalThis.dispatchEvent?.(new CustomEvent("daoyuan_portraits_changed"));
}
async function save(): Promise<void> {
  const entered = urls.value.map((row) => row.value.trim()).filter(Boolean);
  const valid = entered.map((url) => safeImageUrl(url)).filter(Boolean);
  if (!valid.length) { error.value = "请至少填写一个有效图片地址或选择本地图片。"; return; }
  if (valid.length !== entered.length) { error.value = "部分图片地址无效；仅支持 http/https 图床链接或本地图片。"; return; }
  saving.value = true;
  error.value = "";
  try {
    const saved = await portraits.setCustomImages(
      ui.portraitEditorName,
      ui.portraitEditorTheme,
      valid,
    );
    if (!saved) {
      error.value = "保存立绘失败，请检查浏览器存储空间后重试。";
      return;
    }
    portraits.setActiveTheme(ui.portraitEditorName, ui.portraitEditorTheme);
    sync();
    ui.closeModal();
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : "保存立绘失败。";
  } finally {
    saving.value = false;
  }
}
function requestReset(action: "current" | "all"): void { confirmAction.value = action; }
function cancelReset(): void { confirmAction.value = null; }
async function confirmReset(): Promise<void> {
  saving.value = true;
  error.value = "";
  try {
    const reset = confirmAction.value === "all"
      ? await portraits.resetAllCustomImages()
      : await portraits.setCustomImages(
          ui.portraitEditorName,
          ui.portraitEditorTheme,
          [],
        );
    if (!reset) {
      error.value = "重置立绘失败，请重试。";
      return;
    }
    sync();
    ui.closeModal();
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : "重置立绘失败。";
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <div v-if="ui.activeModal === 'portrait-editor'" class="portrait-custom-modal show" @click.self="ui.closeModal">
    <section class="portrait-custom-dialog" role="dialog" aria-modal="true" aria-label="自定义立绘">
      <button class="btn-rst-all" type="button" @click="requestReset('all')">⚠️ 重置全员</button>
      <h3>✨ 设定{{ themeUi.name }}灵容 · {{ ui.portraitEditorName }}</h3>

      <div v-if="preview" class="portrait-preview-wrapper dy-preview-visible">
        <img class="portrait-preview show" :src="preview" alt="立绘预览" />
      </div>

      <div class="portrait-file-row">
        <label class="portrait-file-label">📁 本地图片<input type="file" accept="image/*" hidden @change="fileChanged" /></label>
        <span class="portrait-file-name" :class="{ selected: fileName !== '未选择文件...' }">{{ fileName }}</span>
      </div>

      <label class="portrait-url-label">图床 URL 地址</label>
      <div class="portrait-url-list">
        <div v-for="(row, index) in urls" :key="row.id" class="url-input-row">
          <input v-model="row.value" type="url" :aria-label="`第 ${index + 1} 个图床链接`" placeholder="粘贴图床链接..." />
          <button v-if="urls.length > 1" class="btn-remove-url" type="button" :aria-label="`删除第 ${index + 1} 个图床链接`" @click="removeUrl(index)">✖</button>
        </div>
      </div>
      <button class="btn-add-url" type="button" @click="addUrl">➕ 添加多张立绘</button>
      <p class="portrait-custom-hint">💡 已列出当前抽屉的全部图床链接；空白栏位会自动忽略，并按输入顺序保存。</p>
      <p v-if="error" class="danger-text portrait-custom-error">{{ error }}</p>

      <div class="btn-row">
        <button class="btn-confirm" type="button" :disabled="saving" @click="save">{{ saving ? "保存中..." : "✅ 确认保存" }}</button>
        <button v-if="hasCustom" class="btn-reset" type="button" :disabled="saving" @click="requestReset('current')">🔄 恢复默认</button>
        <button class="btn-cancel" type="button" :disabled="saving" @click="ui.closeModal">取消</button>
      </div>

      <div v-if="confirmAction" class="portrait-reset-confirm" role="alertdialog" aria-modal="true">
        <div class="portrait-reset-confirm-card">
          <h4>⚠️ {{ confirmAction === 'all' ? '确认重置全员立绘？' : `确认恢复${themeUi.name}默认立绘？` }}</h4>
          <p v-if="confirmAction === 'all'">将清除所有角色、所有抽屉的自定义立绘设置，此操作无法撤销。</p>
          <p v-else>将清除「{{ ui.portraitEditorName }}」当前抽屉的自定义设置，恢复云端默认立绘。</p>
          <div>
            <button type="button" :disabled="saving" @click="cancelReset">取消</button>
            <button class="danger" type="button" :disabled="saving" @click="confirmReset">{{ saving ? "处理中..." : "确定重置" }}</button>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
