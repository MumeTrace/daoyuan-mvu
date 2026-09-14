<script setup lang="ts">
import { computed } from "vue";
import { numericValue } from "../../stores/helpers";

const props = defineProps<{
  label: string;
  current?: unknown;
  valueId: string;
  barId: string;
  fillClass: string;
}>();

const currentValue = computed(() => numericValue(props.current ?? 0));
const displayValue = computed(() => Math.max(0, Math.min(100, currentValue.value)));
const percentageLabel = computed(() => {
  const value = displayValue.value;
  return Number.isInteger(value) ? `${value}%` : `${value.toFixed(1)}%`;
});
</script>

<template>
  <div class="stat-row">
    <div class="stat-label">
      <span>{{ label }}</span>
      <span :id="valueId">{{ Math.round(displayValue) }}/100</span>
    </div>
    <div class="tip-hover stat-progress-tip" :data-tip="percentageLabel" :aria-label="`${label} ${percentageLabel}`">
      <div class="progress-bg">
        <div
          :id="barId"
          class="progress-fill"
          :class="fillClass"
          :style="{ width: `${displayValue}%` }"
        ></div>
      </div>
    </div>
  </div>
</template>
