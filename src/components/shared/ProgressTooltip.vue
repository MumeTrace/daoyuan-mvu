<script setup lang="ts">
import { computed } from "vue";
import { numericValue } from "../../stores/helpers";

const props = withDefaults(
  defineProps<{ value?: number | string; fillClass?: string }>(),
  { value: 0, fillClass: "fill-exp" },
);

const percent = computed(() => Math.max(0, Math.min(100, numericValue(props.value))));
const label = computed(() =>
  Number.isInteger(percent.value) ? `${percent.value}%` : `${percent.value.toFixed(1)}%`,
);
</script>

<template>
  <div class="tip-hover" :data-tip="label">
    <div class="progress-bg">
      <div class="progress-fill" :class="fillClass" :style="{ width: `${percent}%` }"></div>
    </div>
  </div>
</template>
