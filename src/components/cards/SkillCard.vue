<script setup lang="ts">
import { computed } from "vue";
import type { DataRecord } from "../../types/stat-data";
import CardDiscard from "../shared/CardDiscard.vue";
import ProgressTooltip from "../shared/ProgressTooltip.vue";
import { text } from "../tabs/view-helpers";

const props = defineProps<{ name: string; data: DataRecord }>();
const ranks = ["天", "地", "玄", "黄", "凡"] as const;
const rankClasses: Partial<Record<(typeof ranks)[number], string>> = {
  天: "rank-heaven",
  地: "rank-earth",
  玄: "rank-mystic",
  黄: "rank-yellow",
};
const rank = computed(() => {
  const type = text(props.data.类型, "");
  const typeRank = ranks.find((candidate) => type.includes(candidate));
  if (typeRank) return typeRank;

  const nameAndRealm = `${props.name}${text(props.data.境界, "")}`;
  const explicitRank = ranks.find(
    (candidate) => nameAndRealm.includes(`${candidate}阶`) || nameAndRealm.includes(`${candidate}品`),
  );
  if (explicitRank) return explicitRank;

  return ranks.find((candidate) => props.name.includes(candidate)) ?? "";
});
const rankClass = computed(() => rank.value ? rankClasses[rank.value] ?? "" : "");
</script>

<template>
  <div class="skill-card" :class="rankClass" :data-skill="name">
    <CardDiscard kind="skill" :name="name" />
    <div class="skill-info">
      <div class="skill-header"><span class="skill-name">{{ name }}</span><span class="skill-type">{{ text(data.类型) }}</span></div>
      <div class="card-stats-grid">
        <span class="stat-label">境界/层数</span><span>{{ text(data.境界, "未入门") }}</span>
        <span class="stat-label">熟练度</span><ProgressTooltip :value="text(data.熟练度, '0')" />
      </div>
      <div class="skill-description">{{ text(data.描述, "") }}</div>
    </div>
  </div>
</template>
