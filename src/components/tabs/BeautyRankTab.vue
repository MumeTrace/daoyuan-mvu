<script setup lang="ts">
import { useLoreSearch } from "../../composables/useLoreSearch";
import { usePortraitSearch } from "../../composables/usePortraitSearch";
import PortraitAvatar from "../shared/PortraitAvatar.vue";
import BeautyForum from "../beauty-forum.vue";

const searchState = usePortraitSearch();
const lore = useLoreSearch();

function keydown(event: KeyboardEvent): void {
  if (event.key !== "Enter") return;
  event.preventDefault();
  searchState.search();
}
</script>
<template>
  <div class="info-card dy-portrait-search-card">
    <div class="info-title"><span>仙姿寻影（全图鉴立绘检索）</span><span>🔍</span></div>
    <div class="portrait-search-row">
      <input
        v-model="searchState.query.value"
        class="reply-input"
        type="search"
        placeholder="搜名字，或输“随机”抽卡..."
        @keydown="keydown"
      />
      <button class="reply-button" type="button" @click="searchState.search">搜索</button>
    </div>
    <div v-if="searchState.searched.value" class="dy-portrait-search-results dy-portrait-search-results--inline">
      <article v-for="result in searchState.results.value" :key="result.name" class="info-card dy-search-result-card">
        <div class="info-title">
          <button type="button" @click="lore.openCharacterLore(result.name)">{{ result.name }}</button>
          <span>查阅结果</span>
        </div>
        <PortraitAvatar :name="result.name" :gender="result.gender" applause />
      </article>
      <p v-if="!searchState.results.value.length" class="danger-text dy-centered-empty">未找到包含【{{ searchState.query.value }}】的立绘记录。</p>
    </div>
  </div>
  <div id="beauty-rank-vue-root" class="dy-beauty-root">
    <BeautyForum data-dy-beauty-inline="1" />
  </div>
</template>
