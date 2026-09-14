<script setup lang="ts">
import type { DataRecord } from "../../types/stat-data";
import CardDiscard from "../shared/CardDiscard.vue";
import { text } from "../tabs/view-helpers";
defineProps<{ name: string; data: DataRecord }>();
</script>
<template>
  <div class="quest-item dy-world-event" :data-event="name">
    <CardDiscard kind="event" :name="name" />
    <div class="info-title"><span class="danger-text">【{{ text(data.类型) }} · {{ text(data.阶段, "起") }}】 {{ name }}</span><span class="dy-card-meta">📍{{ text(data.地点) }}</span></div>
    <div class="info-text">{{ text(data.描述, "") }}</div>
  </div>
</template>
