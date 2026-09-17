<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from "vue";
import { useStatusDialogStore } from "../../stores/status-dialog";

const dialog = useStatusDialogStore();
const panel = ref<HTMLElement | null>(null);
const input = ref<HTMLInputElement | null>(null);
const icon = computed(() => dialog.active?.tone === "danger" ? "⚠" : dialog.active?.tone === "warning" ? "⚠" : "✦");

watch(() => dialog.active, (active) => {
  if (!active) return;
  void nextTick(() => {
    if (active.kind === "prompt") input.value?.focus();
    else panel.value?.focus();
  });
});

function onKeydown(event: KeyboardEvent): void {
  if (!dialog.active) return;
  if (event.key === "Escape") dialog.cancel();
  if (event.key === "Enter" && dialog.active.kind === "prompt" && (input.value?.getRootNode() as Document | ShadowRoot | undefined)?.activeElement === input.value) {
    event.preventDefault();
    dialog.accept();
  }
}

globalThis.addEventListener?.("keydown", onKeydown);
onBeforeUnmount(() => globalThis.removeEventListener?.("keydown", onKeydown));
</script>

<template>
  <div
    v-if="dialog.active"
    class="dy-status-dialog-overlay"
    :class="`dy-status-dialog-overlay--${dialog.active.tone}`"
    @click.self="dialog.cancel"
    @keydown.stop="onKeydown"
  >
    <section
      ref="panel"
      class="dy-status-dialog"
      :class="`dy-status-dialog--${dialog.active.kind}`"
      role="dialog"
      aria-modal="true"
      :aria-label="dialog.active.title"
      tabindex="-1"
    >
      <header class="dy-status-dialog-header">
        <div class="dy-status-dialog-icon" aria-hidden="true">{{ icon }}</div>
        <h2>{{ dialog.active.title }}</h2>
      </header>
      <p class="dy-status-dialog-message">{{ dialog.active.message }}</p>
      <input
        v-if="dialog.active.kind === 'prompt'"
        ref="input"
        v-model="dialog.inputValue"
        class="dy-status-dialog-input"
        type="text"
        autocomplete="off"
      />
      <label v-if="dialog.active.checkboxLabel" class="dy-status-dialog-checkbox">
        <input v-model="dialog.checkboxValue" type="checkbox" />
        <span>{{ dialog.active.checkboxLabel }}</span>
      </label>
      <p v-if="dialog.active.checkboxNote" class="dy-status-dialog-checkbox-note">
        {{ dialog.active.checkboxNote }}
      </p>
      <div class="dy-status-dialog-actions">
        <button v-if="dialog.active.kind !== 'alert'" class="dy-status-dialog-cancel" type="button" @click="dialog.cancel">
          {{ dialog.active.cancelText }}
        </button>
        <button class="dy-status-dialog-confirm" type="button" @click="dialog.accept">
          {{ dialog.active.confirmText }}
        </button>
      </div>
    </section>
  </div>
</template>

<style scoped src="../../styles/components/status-dialog.css"></style>
