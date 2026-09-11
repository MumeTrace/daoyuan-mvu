<script setup lang="ts">
import { computed } from "vue";
import { useInventoryStore } from "../../stores/inventory";
import { useUiStore } from "../../stores/ui";
import CardDiscard from "../shared/CardDiscard.vue";
import { text } from "../tabs/view-helpers";

const inventory = useInventoryStore();
const ui = useUiStore();
const luckEntries = computed(() => Object.entries(inventory.luck));

</script>

<template>
  <div v-if="ui.activeModal === 'luck'" id="luck-modal-overlay" class="luck-modal-overlay dy-luck-modal-overlay" @click.self="ui.closeModal">
    <div class="luck-modal-content">
      <button id="luck-modal-close" class="luck-modal-close" type="button" aria-label="关闭" @click="ui.closeModal">×</button>
      <div class="luck-modal-header">✨ 气运加身 ✨</div>
      <div id="luck-modal-body" class="luck-modal-body">
        <div v-for="[name, data] in luckEntries" :key="name" class="luck-item" :data-luck="name">
          <CardDiscard kind="luck" :name="name" />
          <div class="dy-artifact-header"><strong>{{ name }}</strong><span>{{ text(data.类型) }}</span></div>
          <div class="info-text">{{ text(data.效果, "未知效果") }}</div>
          <div class="dy-luck-status"><span>状态: {{ text(data.使用状态) }}</span><span>压制: {{ text(data.压制状态, "正常") }}</span></div>
        </div>
        <div v-if="!luckEntries.length" class="dy-empty-state dy-centered-empty">凡夫俗子，暂无气运加身。</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dy-luck-modal-overlay { display: flex; }
</style>
