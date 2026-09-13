<script setup lang="ts">
import { computed } from "vue";
import { useLoreSearch } from "../../composables/useLoreSearch";
import type { DataRecord } from "../../types/stat-data";
import CardDiscard from "../shared/CardDiscard.vue";
import CollapsibleSection from "../shared/CollapsibleSection.vue";
import PortraitAvatar from "../shared/PortraitAvatar.vue";
import ProgressTooltip from "../shared/ProgressTooltip.vue";
import { text } from "../tabs/view-helpers";

const props = defineProps<{ kind: "partner" | "npc" | "pet"; name: string; data: DataRecord }>();
const cardClass = computed(() => (props.kind === "npc" ? "npc-card" : "partner-card"));
const lore = useLoreSearch();
const secondary = computed(() => {
  if (props.kind === "npc") return text(props.data.头衔, "");
  return `${text(props.data.种族)} · ${text(props.data.性别)}`;
});
const numericRows = computed(() => {
  const rows = [
    ["生命", props.data.生命, "fill-hp"],
    ["灵力", props.data.灵力, "fill-mp"],
    ["修为", props.data.修为, "fill-exp"],
  ];
  if (props.kind !== "pet") rows.push(["道心", props.data.道心, "fill-daoxin"]);
  if (props.kind === "partner" && Number(props.data.亲密 || 0) > 0) rows.push(["亲密", props.data.亲密, "fill-san"]);
  if (props.kind === "npc") rows.push(["好感", props.data.好感, Number(props.data.好感 || 0) > 50 ? "fill-san" : "fill-hp"]);
  if (props.kind === "pet") rows.push(["亲密度", props.data.亲密度, "fill-san"]);
  return rows;
});
const textRows = computed(() => {
  if (props.kind === "npc") return [["性别", props.data.性别], ["性格", props.data.性格], ["关系阶段", props.data.关系阶段]];
  if (props.kind === "pet") return [["性格", props.data.性格], ["容貌外观", props.data.容貌外观], ["神通", props.data.神通], ["状态", props.data.状态], ["心声", props.data.心声]];
  return [["性格", props.data.性格], ["外观", props.data.外观], ["身高", props.data.身高], ["背景", props.data.背景], ["神通", props.data.神通], ["状态", props.data.状态], ["心声", props.data.心声]];
});

</script>

<template>
  <div :class="cardClass" v-bind="{ [`data-${kind}`]: name }">
    <CardDiscard :kind="kind" :name="name" />
    <CollapsibleSection :storage-key="`${kind}:${name}`" :legacy-storage-key="name">
      <template #header>
        <button
          :class="[kind === 'npc' ? 'npc-name' : 'partner-name', 'dy-lore-name']"
          type="button"
          title="点击探查天机"
          @click.stop="lore.openCharacterLore(name)"
        >{{ name }}</button>
        <span :class="kind === 'npc' ? 'npc-title' : 'partner-species'">{{ secondary }}</span>
      </template>
      <div class="card-stats-grid dy-character-grid">
        <span class="stat-label">境界</span><span class="rare-text">{{ text(data.境界) }}</span>
        <template v-for="row in numericRows" :key="String(row[0])">
          <span class="stat-label">{{ row[0] }}</span><ProgressTooltip :value="String(row[1] ?? 0)" :fill-class="String(row[2])" />
        </template>
        <template v-for="row in textRows" :key="String(row[0])">
          <span class="stat-label">{{ row[0] }}</span><span>{{ text(row[1], row[0] === '状态' ? '正常' : row[0] === '关系阶段' ? '陌生' : '未知') }}</span>
        </template>
      </div>
      <div v-if="kind === 'npc' && data.描述" class="npc-description">{{ data.描述 }}</div>
      <PortraitAvatar :name="name" :gender="data.性别" :applause="kind !== 'pet'" />
    </CollapsibleSection>
  </div>
</template>
