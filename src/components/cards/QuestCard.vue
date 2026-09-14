<script setup lang="ts">
import type { DataRecord } from "../../types/stat-data";
import CardDiscard from "../shared/CardDiscard.vue";
import { text } from "../tabs/view-helpers";
defineProps<{ name: string; data: DataRecord }>();
</script>
<template>
  <div class="quest-item" :data-quest="name">
    <CardDiscard kind="quest" :name="name" />
    <div class="info-title"><span>{{ name }}</span><span class="danger-text dy-card-meta">难度: {{ text(data.难度) }}</span></div>
    <div class="info-text"><b>目标:</b> {{ text(data.目标, "") }}<br /><b>机缘:</b> <span class="dy-gold-text">{{ text(data.机缘, "") }}</span><br /><i class="dy-quote">“{{ text(data.引言, "") }}”</i></div>
  </div>
</template>
