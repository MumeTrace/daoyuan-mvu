<script setup lang="ts">
import { useLoreSearch } from "../../composables/useLoreSearch";
import { usePortraitSearch } from "../../composables/usePortraitSearch";
import { useUiStore } from "../../stores/ui";
import PortraitAvatar from "../shared/PortraitAvatar.vue";

const ui = useUiStore();
const searchState = usePortraitSearch();
const lore = useLoreSearch();
function keydown(event: KeyboardEvent): void {
  if (event.key === "Enter") { event.preventDefault(); searchState.search(); }
}
</script>

<template>
  <div v-if="ui.activeModal === 'portrait-search'" class="dy-portrait-search-overlay" @click.self="ui.closeModal">
    <section class="dy-portrait-search-dialog" role="dialog" aria-modal="true">
      <button class="luck-modal-close" type="button" aria-label="关闭" @click="ui.closeModal">×</button>
      <h2>🔍 仙姿寻影</h2>
      <div class="portrait-search-row">
        <input v-model="searchState.query.value" class="reply-input" type="search" placeholder="搜名字，或输“随机”抽卡..." @keydown="keydown" />
        <button class="reply-button" type="button" :disabled="searchState.loading.value" @click="searchState.search">
          {{ searchState.loading.value ? "检索中…" : "搜索" }}
        </button>
      </div>
      <div class="dy-portrait-search-results">
        <p v-if="searchState.loading.value" class="dy-centered-empty">正在检索本卡与已安装工坊扩展…</p>
        <article v-for="result in searchState.results.value" :key="result.name" class="info-card dy-search-result-card">
          <div class="info-title"><button type="button" @click="lore.openCharacterLore(result.name)">{{ result.name }}</button><span>{{ result.sourceLabel }}</span></div>
          <PortraitAvatar :name="result.name" :gender="result.gender" applause />
        </article>
        <p v-if="searchState.error.value" class="danger-text dy-centered-empty">{{ searchState.error.value }}</p>
        <p v-if="searchState.searched.value && !searchState.loading.value && !searchState.results.value.length" class="danger-text dy-centered-empty">未在本卡、已安装工坊扩展或图片库中找到【{{ searchState.query.value }}】。</p>
      </div>
    </section>
  </div>
</template>
