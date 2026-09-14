<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from "vue";
import { usePortraitStore } from "../../stores/portraits";

const portraits = usePortraitStore();
const visible = ref(false);
let hideTimer: ReturnType<typeof globalThis.setTimeout> | undefined;

watch(
  () => portraits.cycleNoticeRevision,
  (revision) => {
    if (revision < 1) return;
    visible.value = true;
    if (hideTimer !== undefined) globalThis.clearTimeout(hideTimer);
    hideTimer = globalThis.setTimeout(() => {
      visible.value = false;
      hideTimer = undefined;
    }, 2500);
  },
);

onBeforeUnmount(() => {
  if (hideTimer !== undefined) globalThis.clearTimeout(hideTimer);
});
</script>

<template>
  <Transition name="dy-portrait-cycle-toast">
    <aside
      v-if="visible"
      id="dy-portrait-toast"
      class="dy-portrait-cycle-toast"
      role="status"
      aria-live="assertive"
    >
      <strong>⚠️ 当前状态没有可替换的立绘</strong>
      <span>需配置多张图片才能进行轮切哦</span>
    </aside>
  </Transition>
</template>

<style scoped>
.dy-portrait-cycle-toast {
  position: fixed;
  top: max(72px, env(safe-area-inset-top));
  left: 50%;
  z-index: 9999999;
  display: grid;
  width: min(88vw, 390px);
  padding: 12px 22px;
  border: 1px solid var(--accent-blood);
  border-radius: 10px;
  background: linear-gradient(145deg, rgba(25, 10, 15, 0.97), rgba(15, 5, 10, 0.99));
  box-shadow: 0 5px 20px rgba(255, 77, 77, 0.32);
  color: var(--text-main);
  text-align: center;
  letter-spacing: 1px;
  pointer-events: none;
  transform: translateX(-50%);
  box-sizing: border-box;
}

.dy-portrait-cycle-toast strong {
  color: var(--accent-blood);
  font-size: 1.05em;
}

.dy-portrait-cycle-toast span {
  margin-top: 3px;
  color: var(--text-dim);
  font-size: 0.84em;
}

.dy-portrait-cycle-toast-enter-active,
.dy-portrait-cycle-toast-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}

.dy-portrait-cycle-toast-enter-from,
.dy-portrait-cycle-toast-leave-to {
  opacity: 0;
  transform: translate(-50%, -8px);
}
</style>
