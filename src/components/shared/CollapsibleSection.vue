<script setup lang="ts">
import { onMounted, ref, watch } from "vue";
import { readStorageJson, writeStorageJson } from "../../bridge/storage";

const props = defineProps<{ storageKey: string; legacyStorageKey?: string }>();
const collapsed = ref(false);
const STORAGE_KEY = "dy_collapse";

onMounted(() => {
  const state = readStorageJson<Record<string, boolean>>(STORAGE_KEY, {});
  if (Object.prototype.hasOwnProperty.call(state, props.storageKey)) {
    collapsed.value = Boolean(state[props.storageKey]);
    return;
  }
  if (props.legacyStorageKey && Object.prototype.hasOwnProperty.call(state, props.legacyStorageKey)) {
    collapsed.value = Boolean(state[props.legacyStorageKey]);
    state[props.storageKey] = collapsed.value;
    writeStorageJson(STORAGE_KEY, state);
  }
});

watch(collapsed, (value) => {
  const state = readStorageJson<Record<string, boolean>>(STORAGE_KEY, {});
  state[props.storageKey] = value;
  writeStorageJson(STORAGE_KEY, state);
});
</script>

<template>
  <div :class="{ 'is-collapsed': collapsed }">
    <div
      class="dy-collapse-trigger"
      role="button"
      tabindex="0"
      :aria-expanded="!collapsed"
      :title="collapsed ? '点击展开' : '点击收起'"
      @click="collapsed = !collapsed"
      @keydown.enter.prevent="collapsed = !collapsed"
      @keydown.space.prevent="collapsed = !collapsed"
    >
      <slot name="header"></slot>
    </div>
    <div class="card-collapse-body"><slot></slot></div>
  </div>
</template>

<style scoped src="../../styles/components/collapsible-section.css"></style>
