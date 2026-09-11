<script setup lang="ts">
import { computed, ref } from "vue";
import { useHeroStore } from "../../stores/hero";
import { useInventoryStore } from "../../stores/inventory";
import { useWorldStore } from "../../stores/world";
import CardDiscard from "../shared/CardDiscard.vue";
import ProgressTooltip from "../shared/ProgressTooltip.vue";
import { percent, text } from "./view-helpers";

const hero = useHeroStore();
const inventory = useInventoryStore();
const world = useWorldStore();
const activeSection = ref(0);
const sections = [
  ["储物袋", "🎒"],
  ["器物", "⚔️"],
  ["炼丹", "💊"],
  ["炼器", "🔨"],
] as const;

const danger = computed(() => {
  const level = text(world.world.危机程度, "无");
  if (level.includes("致命")) return { level, color: "#ff1a1a", icon: "☠️", className: "danger-fatal" };
  if (level.includes("高")) return { level, color: "var(--accent-blood)", icon: "🚨", className: "danger-high" };
  if (level.includes("中")) return { level, color: "var(--accent-exp)", icon: "⚠️", className: "" };
  if (level.includes("低")) return { level, color: "var(--accent-mana)", icon: "💧", className: "" };
  return { level, color: "var(--accent-san)", icon: "🍃", className: "" };
});

function nextSection(): void {
  activeSection.value = (activeSection.value + 1) % sections.length;
}
</script>

<template>
  <div class="info-card">
    <div class="info-title"><span>当前所在</span><span>📍</span></div>
    <div class="info-text">{{ text(hero.data.所在界, "玄天界") }} · {{ text(world.world.当前地点) }}</div>
  </div>

  <div class="info-card dy-danger-card" :class="danger.className" :style="{ borderColor: danger.color }">
    <div class="info-title" :style="{ color: danger.color }">
      <span>天机推演</span><span class="dy-danger-icon">{{ danger.icon }}</span>
    </div>
    <div class="info-text">
      当前时间: {{ text(world.world.当前时间) }}<br />
      危机程度: <strong :style="{ color: danger.color }">{{ danger.level }}</strong>
    </div>
  </div>

  <div class="info-card dy-inventory-card">
    <div class="info-title dy-switch-header">
      <span>{{ sections[activeSection]?.[0] }}</span>
      <button class="dy-section-switch" type="button" title="点击切换分类" @click="nextSection">
        <span>切换</span><span>{{ sections[activeSection]?.[1] }}</span>
      </button>
    </div>

    <div v-show="activeSection === 0" id="inventory-content" class="info-text">
      <div v-for="(item, name) in inventory.items" :key="name" class="inventory-item" :data-item="name">
        <CardDiscard kind="item" :name="name" />
        <span>{{ name }}</span>
        <span class="dy-item-meta">x{{ text(item.数量, "0") }}</span>
        <span v-if="item.描述" class="dy-item-description">- {{ item.描述 }}</span>
      </div>
      <span v-if="!Object.keys(inventory.items).length">空空如也</span>
    </div>

    <div v-show="activeSection === 1" id="artifact-content" class="info-text">
      <div v-for="(item, name) in inventory.artifacts" :key="name" class="artifact-item" :data-artifact="name">
        <CardDiscard kind="artifact" :name="name" />
        <div class="dy-artifact-header"><strong>{{ name }}</strong><span>{{ text(item.等级) }} · {{ text(item.类型) }}</span></div>
        <div v-if="item.描述" class="dy-item-description">{{ item.描述 }}</div>
        <div class="dy-inline-stat"><span>状态: {{ text(item.状态, "正常") }}</span><ProgressTooltip :value="percent(item.损耗度)" fill-class="fill-hp" /></div>
      </div>
      <span v-if="!Object.keys(inventory.artifacts).length">空空如也</span>
    </div>

    <div v-show="activeSection === 2" id="alchemy-content" class="info-text dy-craft-panel">
      <div class="dy-artifact-header"><strong>炼丹造诣</strong><span>{{ text(inventory.alchemy.阶级, "未入门") }}</span></div>
      <div class="dy-inline-stat"><span>熟练度</span><ProgressTooltip :value="percent(inventory.alchemy.熟练度)" /></div>
      <div class="dy-inline-stat"><span>成功率</span><ProgressTooltip :value="percent(inventory.alchemy.成功率)" fill-class="fill-san" /></div>
      <div>炼制次数: {{ text(inventory.alchemy.次数, "0") }} 次</div>
    </div>

    <div v-show="activeSection === 3" id="forge-content" class="info-text dy-craft-panel">
      <div class="dy-artifact-header"><strong>炼器造诣</strong><span>{{ text(inventory.forging.阶级, "未入门") }}</span></div>
      <div class="dy-inline-stat"><span>熟练度</span><ProgressTooltip :value="percent(inventory.forging.熟练度)" /></div>
      <div class="dy-inline-stat"><span>成功率</span><ProgressTooltip :value="percent(inventory.forging.成功率)" fill-class="fill-san" /></div>
      <div>炼制次数: {{ text(inventory.forging.次数, "0") }} 次</div>
    </div>
  </div>
</template>
