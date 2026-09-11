<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import { useUiStore } from "../../stores/ui";
import { useImageLibraryStore } from "../../stores/image-library";
import type { MapFaction, MapLocation } from "../../data/lore-xuantian";
import { safeImageUrl } from "../../utils/safe-url";

const props = defineProps<{ location: MapLocation | null }>();
const ui = useUiStore();
const images = useImageLibraryStore();
const panel = ref<HTMLDivElement | null>(null);
const fallbackImages: Record<string, string> = {
  中央神州: "https://i.postimg.cc/ZRsNB0GJ/file-00000000530c71fb8318e70cba79f051.png",
  南离火洲: "https://i.postimg.cc/YqYJ3Fb3/file-00000000dbf071f9b154d385edddaf59.png",
  西漠佛国: "https://i.postimg.cc/Hn5P6G4j/file-000000005d2071faa17cf1da25fa8370.png",
  东极青木域: "https://i.postimg.cc/qRDmJJQz/file-0000000008f071faa98ae08365b8a7ee.png",
  北冥雪原: "https://i.postimg.cc/7Lsc6nZL/file-00000000ddb471fd89b3a466de6ccfc3.png",
};
const accent = computed(() => {
  const color = props.location?.color || "--accent-gold";
  return color.startsWith("#") ? color : `var(${color})`;
});
const imageUrl = computed(() => safeImageUrl(props.location ? fallbackImages[props.location.name] || "" : ""));

function factionClass(faction: MapFaction): string {
  if (faction.type === "human") return "tag-human";
  if (faction.type === "demon") return "tag-demon";
  if (faction.type === "monster") return "tag-monster";
  return "tag-neutral";
}

function openFaction(faction: MapFaction): void {
  ui.openFactionModal(`【${faction.name}】`, faction.note || "暂无详细信息", images.getSectMapUrl(faction.name));
}

watch(
  () => props.location,
  (location) => {
    if (!location) return;
    void nextTick(() => panel.value?.scrollIntoView({ behavior: "smooth", block: "nearest" }));
  },
);
</script>

<template>
  <div ref="panel" class="location-detail-panel" :class="{ active: location }">
    <div class="info-card" :style="{ borderColor: accent }">
      <div class="info-title" :style="{ color: accent }">
        <span>{{ location?.name || "请选择区域" }}</span>
        <span class="dy-card-meta">{{ location?.realm || "探索" }}</span>
      </div>
      <div class="info-text">
        <p>{{ location?.desc || "点击地图上的节点查看势力分布与环境详情。" }}</p>
        <div v-if="location && imageUrl" class="map-loc-img-wrapper">
          <img :src="imageUrl" :alt="location.name" title="点击放大查看" @click="ui.openImageModal(imageUrl)" />
        </div>
        <div v-if="location" class="map-loc-factions">
          <button
            v-for="faction in location.factions"
            :key="faction.name"
            class="faction-tag"
            :class="factionClass(faction)"
            type="button"
            :title="faction.note || ''"
            @click="openFaction(faction)"
          >{{ faction.name }}</button>
          <span v-if="!location.factions.length" class="dy-card-meta">此处尚无势力记载</span>
        </div>
      </div>
    </div>
  </div>
</template>
