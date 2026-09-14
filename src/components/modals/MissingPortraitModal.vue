<script setup lang="ts">
import { computed } from "vue";
import { getThemeUi } from "../../features/portraits/theme-ui";
import { useUiStore } from "../../stores/ui";

const ui = useUiStore();
const theme = computed(() => getThemeUi(ui.portraitMissingTheme));

function configure(): void {
  ui.openPortraitEditor(ui.portraitMissingName, ui.portraitMissingTheme);
}

function openPortraitNotice(): void {
  ui.openNotice("立绘更新");
}
</script>

<template>
  <div v-if="ui.activeModal === 'portrait-missing'" class="dy-missing-portrait-overlay" @click.self="ui.closeModal">
    <section class="dy-missing-portrait-dialog" role="dialog" aria-modal="true" aria-label="暂无立绘提醒">
      <div class="dy-missing-portrait-icon">🖼️</div>
      <h3>尚未收录{{ theme.name }}立绘</h3>
      <p><strong>「{{ ui.portraitMissingName }}」</strong>暂无“{{ theme.name }}”立绘。</p>
      <p class="dy-missing-portrait-hint">可为该角色自定义配置{{ theme.name }}立绘，或前往公告获取最新立绘。</p>
      <div class="dy-missing-portrait-actions">
        <button class="dy-missing-portrait-custom" type="button" @click="configure">🎨 自定义{{ theme.name }}</button>
        <button class="dy-missing-portrait-notice" type="button" @click="openPortraitNotice">📜 前往公告</button>
        <button class="dy-missing-portrait-cancel" type="button" @click="ui.closeModal">取消</button>
      </div>
    </section>
  </div>
</template>
