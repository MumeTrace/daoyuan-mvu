<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted } from "vue";
import { useHeroStore } from "../../stores/hero";
import { useUiStore } from "../../stores/ui";
import { useImageLibraryStore } from "../../stores/image-library";
import { usePersonaStore } from "../../stores/persona";
import StatBar from "../shared/StatBar.vue";

const hero = useHeroStore();
const ui = useUiStore();
const images = useImageLibraryStore();
const persona = usePersonaStore();

const luckNames = computed(() => {
  const luck = hero.data.气运;
  if (luck && typeof luck === "object" && !Array.isArray(luck)) {
    return Object.keys(luck).join("、") || "无";
  }
  return String(luck || "无");
});

function openFaction(): void {
  const name = String(hero.data.宗门 || "无");
  const contribution = String(hero.data.宗门贡献 || 0);
  ui.openFactionModal("【宗门信息】", `所属宗门：${name}\n\n宗门贡献：${contribution}`, images.getSectMapUrl(name));
}

onMounted(() => persona.start());
onBeforeUnmount(() => {
  persona.stop();
});
</script>

<template>
  <aside id="status-panel-vue-root" class="status-panel" :class="{ 'near-death': hero.hp <= 10 }">
  <div class="avatar-wrapper">
    <div class="avatar-frame"><div class="user_avatar" :style="persona.avatarStyle"></div></div>
    <div class="rank-tag">{{ hero.data.境界 || "凡人" }}</div>
    <button v-if="ui.editMode" class="jiuqi-hero-button" type="button" @click="ui.openJiuqiEditor(['主角'])">✎ 修改主角</button>
  </div>
  <div class="stat-group">
    <StatBar label="生命" :current="hero.data.生命" value-id="hp-value" bar-id="hp-bar" fill-class="fill-hp" />
    <StatBar label="精血" :current="hero.data.精血" value-id="blood-value" bar-id="blood-bar" fill-class="fill-hp" />
    <StatBar label="灵力" :current="hero.data.灵力" value-id="mp-value" bar-id="mp-bar" fill-class="fill-mp" />
    <StatBar label="修为" :current="hero.data.修为" value-id="exp-value" bar-id="exp-bar" fill-class="fill-exp" />
    <StatBar label="神识" :current="hero.data.神识" value-id="san-value" bar-id="san-bar" fill-class="fill-san" />
    <StatBar label="道心" :current="hero.data.道心" value-id="daoxin-value" bar-id="daoxin-bar" fill-class="fill-daoxin" />

    <div class="stat-row dy-detail-row"><div class="stat-label"><span>神念</span><span id="san-status" class="rare-text dy-detail-value">{{ hero.data.神念 || "无" }}</span></div></div>
    <button class="stat-row luck-stat-row dy-sidebar-button dy-detail-row" type="button" @click="ui.setActiveModal('luck')">
      <span class="stat-label"><span title="点击查看气运详情">气运</span><span id="luck-value" class="rare-text dy-detail-value">{{ luckNames }}</span></span>
    </button>
    <div class="stat-row dy-detail-row"><div class="stat-label"><span>灵根</span><span id="spirit-root-value" class="rare-text dy-detail-value">{{ hero.data.灵根 || "无" }}</span></div></div>
    <button id="clan-row" class="stat-row luck-stat-row dy-sidebar-button dy-detail-row" type="button" @click="openFaction">
      <span class="stat-label"><span title="点击查看宗门详情">宗门</span><span id="clan-value" class="rare-text dy-detail-value">{{ hero.data.宗门 || "无" }}</span></span>
    </button>
    <div class="stat-row dy-detail-row"><div class="stat-label"><span>状态</span><span id="status-effects" class="rare-text dy-detail-value">{{ hero.data.状态 || "无异常" }}</span></div></div>
  </div>
  </aside>
</template>
