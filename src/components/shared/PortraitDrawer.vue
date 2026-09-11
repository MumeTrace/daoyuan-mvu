<script setup lang="ts">
import { computed, getCurrentInstance, onBeforeUnmount, onMounted, ref } from "vue";
import { usePortraitPool } from "../../composables/usePortraitPool";

const props = defineProps<{ name: string; opensUp?: boolean }>();
const emit = defineEmits<{ selected: [] }>();
const instanceId = `portrait-drawer-${getCurrentInstance()?.uid ?? props.name}`;
const open = ref(false);
const pool = usePortraitPool(() => props.name);
const options = computed(() => pool.options.value);
const active = computed(() => pool.active.value);

function isRemoteIcon(icon: string): boolean {
  return /^https?:\/\//i.test(icon);
}

function toggle(): void {
  const next = !open.value;
  if (next) {
    globalThis.dispatchEvent?.(new CustomEvent("daoyuan:portrait-drawer-open", { detail: instanceId }));
  }
  open.value = next;
}

function select(poolId: string): void {
  pool.select(poolId);
  open.value = false;
  emit("selected");
}

function closeOther(event: Event): void {
  const detail = (event as CustomEvent<unknown>).detail;
  if (detail !== instanceId) open.value = false;
}

function close(): void {
  open.value = false;
}

onMounted(() => {
  globalThis.addEventListener?.("daoyuan:portrait-drawer-open", closeOther);
  document.addEventListener("click", close);
});

onBeforeUnmount(() => {
  globalThis.removeEventListener?.("daoyuan:portrait-drawer-open", closeOther);
  document.removeEventListener("click", close);
});
</script>

<template>
  <div
    v-if="active"
    class="portrait-pool-selector"
    :class="{ 'is-open': open, 'opens-up': opensUp }"
    @click.stop
  >
    <button
      class="portrait-pool-toggle"
      type="button"
      title="选择立绘卡池"
      aria-haspopup="menu"
      :aria-expanded="open"
      @click="toggle"
    >
      <img v-if="isRemoteIcon(active.icon)" class="portrait-pool-icon-image" :src="active.icon" alt="" />
      <span v-else class="portrait-pool-icon-text">{{ active.icon }}</span>
      <span class="portrait-pool-toggle-label">{{ active.name }}</span>
      <span class="portrait-pool-arrow">▾</span>
    </button>
    <div class="portrait-pool-menu" role="menu">
      <button
        v-for="option in options"
        :key="option.id"
        class="portrait-pool-option"
        :class="{ 'is-active': option.active }"
        type="button"
        role="menuitem"
        @click="select(option.id)"
      >
        <img v-if="isRemoteIcon(option.icon)" class="portrait-pool-icon-image" :src="option.icon" alt="" />
        <span v-else class="portrait-pool-icon-text">{{ option.icon }}</span>
        <span>{{ option.name }}</span>
      </button>
    </div>
  </div>
</template>
