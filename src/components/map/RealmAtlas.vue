<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, useId, watch } from "vue";
import type { MapFaction, MapLocation } from "../../data/lore-xuantian";
import type { AtlasDefinition, AtlasMarker, Point } from "./atlas/atlas-types";
import type { AtlasPosition } from "./atlas/location-match";
import { useAtlasViewport } from "./atlas/useAtlasViewport";
import AtlasRelief from "./atlas/AtlasRelief.vue";
import AtlasIcon from "./atlas/AtlasIcon.vue";
import XianjieTerrain from "./atlas/XianjieTerrain.vue";
import { acquireOverlayHost, overlayHostTarget } from "../../bridge/overlay-host";

const props = defineProps<{ atlas: AtlasDefinition; opened: boolean; position: AtlasPosition | null }>();
const emit = defineEmits<{ location: [location: MapLocation]; faction: [faction: MapFaction]; 'update:opened': [value: boolean] }>();
const atlasRegions = computed(() => props.atlas.regions);
const atlasMarkers = computed(() => props.atlas.markers);
const hasSecrets = computed(() => atlasMarkers.value.some(marker => marker.kind === "secret"));
const here = computed(() => props.position?.atlasId === props.atlas.id ? props.position : null);
const svg = ref<SVGSVGElement | null>(null);
const uid = `atlas-${useId().replace(/[^a-z0-9-]/gi, "")}`;
const viewport = useAtlasViewport(svg);
const { transform, dragging, scale } = viewport;
const selected = ref("");
const hovered = ref("");
const query = ref("");
const indexOpen = ref(false);
const showSecrets = ref(true);
const expanded = ref(false);
const hostLimited = ref(false);
let releaseHost: (() => void) | undefined;
watch(expanded, value => { if (!value) { releaseHost?.(); releaseHost = undefined; } });
onBeforeUnmount(() => releaseHost?.());
watch(() => props.opened, opened => { if (!opened) expanded.value = false; });
const portraitViewport = ref(false);
const fitAll = ref(false);
async function focusPoint(point: Point) { fitAll.value = false; await nextTick(); viewport.focus(point); }
function focusRegion(region: AtlasDefinition['regions'][number]) { void focusPoint(region.label); }
async function zoomMap(factor: number) {
  if (expanded.value && fitAll.value && factor > 1) { fitAll.value = false; await nextTick(); }
  viewport.zoom(factor);
}
let observer: ResizeObserver | undefined;
watch(svg, (element) => {
  observer?.disconnect();
  if (!element) return;
  observer = new ResizeObserver(entries => {
    const size = entries[0]?.contentRect;
    if (size) portraitViewport.value = size.width < size.height;
  });
  observer.observe(element);
}, { flush: "post" });
onBeforeUnmount(() => observer?.disconnect());
const expandButton = ref<HTMLButtonElement | null>(null);
async function toggleExpanded() {
  if (!expanded.value) {
    const host = acquireOverlayHost(svg.value?.closest<HTMLElement>(".dy-atlas") ?? null);
    releaseHost = host.release;
    hostLimited.value = !host.hostWide;
  }
  expanded.value = !expanded.value;
  fitAll.value = false;
  await nextTick();
  if (expanded.value) svg.value?.focus({ preventScroll: true });
  else expandButton.value?.focus({ preventScroll: true });
}
function resetMap() { fitAll.value = true; viewport.reset(); }
function toggleOpened() {
  if (props.opened) expanded.value = false;
  emit('update:opened', !props.opened);
}
function mapKey(event: KeyboardEvent) {
  if (event.key === "Home" && event.target === svg.value) { event.preventDefault(); resetMap(); }
  else viewport.key(event);
}
const results = computed(() => atlasMarkers.value.filter(marker => marker.name.includes(query.value.trim())));
const visibleMarkers = computed(() => atlasMarkers.value.filter(marker => showSecrets.value || marker.kind !== "secret"));
function openMarker(marker: AtlasMarker, event?: MouseEvent) {
  if (event && !viewport.allowClick(event)) return;
  selected.value = marker.id;
  if (marker.faction) emit("faction", marker.faction);
  else if (marker.location) emit("location", marker.location);
}
async function chooseIndex(marker: AtlasMarker) {
  indexOpen.value = false;
  if (marker.kind === "secret") showSecrets.value = true;
  await focusPoint(marker.point);
  openMarker(marker);
}
function openRegion(location: MapLocation, event?: MouseEvent) {
  if (!event || viewport.allowClick(event)) emit("location", location);
}
const stars = Array.from({ length: 65 }, (_, i) => ({ x: (i * 347 + 41) % 1490, y: (i * 173 + 37) % 950, r: i % 7 === 0 ? 1.5 : 0.7 }));
</script>

<template>
  <Teleport :to="overlayHostTarget || 'body'" :disabled="!expanded">
  <section class="dy-atlas" :class="{ 'dy-atlas-expanded': expanded, 'dy-atlas-celestial': atlas.id === 'xianjie', 'is-overview': fitAll }" :data-atlas="atlas.id" :aria-label="`${atlas.title}交互地图`" @keydown.esc.stop="expanded && toggleExpanded()">
    <header class="dy-atlas-heading">
      <div class="dy-atlas-seal" aria-hidden="true">{{ atlas.id === 'xianjie' ? '仙' : '舆' }}</div>
      <div class="dy-atlas-heading-copy"><small>道渊 · 寰宇志</small><div><h2>{{ atlas.title }}</h2><span>{{ atlas.subtitle }}</span></div></div>
      <i></i>
      <button type="button" :aria-label="`${opened ? '折叠' : '打开'}${atlas.title}地图`" :aria-expanded="opened" @click="toggleOpened"><span>{{ opened ? '收起' : '展开' }}</span><AtlasIcon name="chevron" :class="{ 'is-open': opened }"/></button>
    </header>
    <div v-if="opened" class="dy-atlas-frame">
      <div class="dy-atlas-top-tools">
        <div class="dy-atlas-tool-group">
          <button type="button" aria-label="⌕ 地图索引" :aria-expanded="indexOpen" @click="indexOpen = !indexOpen"><AtlasIcon name="search"/><span>地图索引</span></button>
          <button v-if="hasSecrets" type="button" :aria-label="`△ 秘境${showSecrets ? '已显示' : '已隐藏'}`" :aria-pressed="showSecrets" @click="showSecrets = !showSecrets"><AtlasIcon name="layers"/><span>秘境</span><b class="dy-atlas-toggle-dot"></b></button>
        </div>
        <span class="dy-atlas-map-count">五方地域<span> / </span>{{ atlasMarkers.length }} 处地点</span>
        <div class="dy-atlas-tool-group">
          <button v-if="here" type="button" :title="`当前位置：${here.name}`" aria-label="定位当前位置" @click="focusPoint(here.point)"><AtlasIcon name="pin"/><span class="dy-atlas-tool-label">定位</span></button>
          <button ref="expandButton" type="button" :aria-label="expanded ? '收起地图' : '展开地图'" :aria-expanded="expanded" @click="toggleExpanded"><AtlasIcon :name="expanded ? 'fold' : 'expand'"/><span class="dy-atlas-tool-label">{{ expanded ? '退出全屏' : '全屏浏览' }}</span></button>
        </div>
      </div>
      <div class="dy-atlas-canvas">
      <svg ref="svg" class="dy-atlas-svg" :class="{ 'is-dragging': dragging }" viewBox="0 0 1500 960" :preserveAspectRatio="expanded && portraitViewport && !fitAll ? 'xMidYMid slice' : 'xMidYMid meet'" tabindex="0"
        role="group" :aria-label="`可拖动缩放的${atlas.title}地图，方向键移动，加减键缩放，Home复位`"
        @pointerdown="viewport.down" @pointermove="viewport.move" @pointerup="viewport.up" @pointercancel="viewport.up"
        @lostpointercapture="viewport.up" @wheel="viewport.wheel" @keydown="mapKey">
        <defs>
          <radialGradient :id="`${uid}-sea`"><stop stop-color="#202a3b"/><stop offset=".65" stop-color="#141c2b"/><stop offset="1" stop-color="#0e1421"/></radialGradient>
          <linearGradient v-for="region in atlasRegions" :key="`gradient-${region.key}`" :id="`${uid}-fill-${region.key}`" x1="0" y1="0" x2=".7" y2="1">
            <stop :stop-color="`color-mix(in srgb, ${region.color} 85%, #dbe3ed)`"/>
            <stop offset=".55" :stop-color="region.color"/>
            <stop offset="1" :stop-color="`color-mix(in srgb, ${region.color} 88%, #23304a)`" />
          </linearGradient>
          <linearGradient :id="`${uid}-wash`" x2="0.25" y2="1"><stop stop-color="#e5e8ed" stop-opacity=".16"/><stop offset=".55" stop-color="#ffffff" stop-opacity="0"/><stop offset="1" stop-color="#090f25" stop-opacity=".14"/></linearGradient>
          <filter :id="`${uid}-grain`" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".65" numOctaves="2" seed="8"/><feColorMatrix type="saturate" values="0"/></filter>
          <pattern :id="`${uid}-contours`" width="240" height="150" patternUnits="userSpaceOnUse" patternTransform="rotate(-18)"><path d="M-50 100 Q10 40 80 78 T260 54 M-45 112 Q15 52 86 89 T267 64 M-41 123 Q18 66 88 100 T272 77" fill="none" stroke="#eee2d5" stroke-opacity=".055" stroke-width="1"/></pattern>
          <clipPath :id="`${uid}-land`"><path v-for="region in atlasRegions" :key="region.key" :d="region.path"/></clipPath>
        </defs>
        <rect width="1500" height="960" :fill="`url(#${uid}-sea)`"/>
        <g class="dy-atlas-stars" aria-hidden="true"><circle v-for="(star, i) in stars" :key="i" :cx="star.x" :cy="star.y" :r="star.r" fill="#aab9cf" opacity=".4"/><ellipse cx="750" cy="480" rx="720" ry="410"/><ellipse cx="750" cy="480" rx="790" ry="540"/><path d="M55 940 930 0 M550 960 1430 0"/></g>
        <g :transform="transform">
          <g class="dy-atlas-shore" pointer-events="none" aria-hidden="true"><path v-for="region in atlasRegions" :key="region.key" :d="region.path"/></g>
          <g v-if="atlas.connections" class="dy-atlas-skyways" pointer-events="none" aria-hidden="true">
            <path v-for="(edge, i) in atlas.connections" :key="i" :d="`M${edge[0].join(',')} L${edge[1].join(',')}`" />
            <ellipse cx="750" cy="480" rx="320" ry="220" /><ellipse cx="750" cy="480" rx="365" ry="260" />
          </g>
          <g v-for="region in atlasRegions" :key="region.key" class="dy-atlas-region" :class="{ 'is-hovered': hovered === region.key }"
            role="button" tabindex="0" :aria-label="`查看${region.location.name}介绍`" :data-region="region.key"
            @mouseenter="hovered = region.key" @mouseleave="hovered = ''" @click="openRegion(region.location, $event)"
            @keydown.enter.stop.prevent="openRegion(region.location)" @keydown.space.stop.prevent="openRegion(region.location)">
            <title>{{ region.location.name }} · 点击查看介绍与舆图</title>
            <path :d="region.path" :fill="`url(#${uid}-fill-${region.key})`" class="dy-atlas-land"/>
            <path :d="region.path" :fill="`url(#${uid}-wash)`" class="dy-atlas-wash"/>
          </g>
          <g :clip-path="`url(#${uid}-land)`" pointer-events="none" aria-hidden="true">
            <rect width="1500" height="960" fill="transparent" opacity=".055" :filter="`url(#${uid}-grain)`"/>
            <rect width="1500" height="960" :fill="`url(#${uid}-contours)`"/>
          </g>
          <AtlasRelief :atlas="atlas" :uid="uid"/>
          <g class="dy-atlas-geography" pointer-events="none" aria-hidden="true">
            <text v-for="annotation in atlas.annotations" :key="annotation.text" :x="annotation.point[0]" :y="annotation.point[1]" :writing-mode="annotation.vertical ? 'tb' : undefined">{{ annotation.text }}</text>
          </g>
          <XianjieTerrain v-if="atlas.id === 'xianjie'" :regions="atlasRegions" :uid="uid" />
          <g v-for="region in atlasRegions" :key="`label-${region.key}`" class="dy-atlas-region-label" :transform="`translate(${region.label.join(' ')})`" pointer-events="none">
            <text class="dy-atlas-region-name" text-anchor="middle">{{ region.location.name }}</text>
            <path d="M-25 17H-5M5 17H25M0 14 3 17 0 20 -3 17Z" />
          </g>
          <g v-for="marker in visibleMarkers" :key="marker.id" :transform="`translate(${marker.point[0]} ${marker.point[1]})`"
            class="dy-atlas-marker" :class="{ 'is-selected': selected === marker.id, 'is-secret': marker.kind === 'secret', 'is-monster': marker.faction?.type === 'monster' }"
            role="button" tabindex="0" :aria-label="`查看${marker.name}`" :data-marker="marker.id"
            @click.stop="openMarker(marker, $event)" @keydown.enter.stop.prevent="openMarker(marker)" @keydown.space.stop.prevent="openMarker(marker)">
            <title>{{ marker.name }}{{ marker.kind === 'secret' ? ' · 秘境与特殊地点' : '' }}{{ marker.placementNote ? ` · ${marker.placementNote}` : '' }}</title>
            <rect class="dy-atlas-marker-hit" x="-14" y="-17" :width="marker.name.length * (marker.kind === 'secret' ? 17 : 19) + 38" height="33" rx="7"/>
            <path v-if="marker.kind === 'secret'" d="M0 -6 6 4 -6 4Z" class="dy-atlas-symbol"/>
            <path v-else d="M0 -7 6 0 0 7 -6 0Z" class="dy-atlas-symbol"/>
            <text x="17" y="6">{{ marker.name }}</text>
            <text v-if="marker.placementNote" class="dy-atlas-placement-note" x="17" y="24">游移 · 非固定驻地</text>
          </g>
          <g v-if="here" class="dy-atlas-gps" :data-location="here.name" :transform="`translate(${here.point[0]} ${here.point[1] - 13})`" role="img" :aria-label="`当前位置：${here.name}`" pointer-events="none">
            <title>当前位置：{{ here.name }}{{ here.kind === 'region' ? '（地域范围）' : '' }}</title>
            <ellipse cx="0" cy="13" rx="15" ry="5" />
            <path d="M0 8 C-7 -1 -14 -9 -14 -17 A14 14 0 1 1 14 -17 C14 -9 7 -1 0 8Z" />
            <circle cx="0" cy="-17" r="5" />
          </g>
        </g>
        <g class="dy-atlas-compass" transform="translate(1435 74)" pointer-events="none" aria-hidden="true"><text y="-29" text-anchor="middle">北</text><path d="M0 -20 5 -5 18 0 5 5 0 20 -5 5 -18 0 -5 -5Z"/><path d="M0 -20V20M-18 0H18"/></g>
      </svg>
      </div>
      <div v-if="indexOpen" class="dy-atlas-index">
        <label>查找宗门、势力与秘境<input v-model="query" type="search" placeholder="输入名称…" aria-label="查找地图地点" /></label>
        <div class="dy-atlas-index-results"><button v-for="marker in results" :key="marker.id" type="button" @click="chooseIndex(marker)">{{ marker.name }}<small>{{ marker.kind === 'secret' ? '秘境' : '势力' }}</small></button><p v-if="!results.length">未找到匹配地点</p></div>
      </div>
      <div class="dy-atlas-dock">
      <div class="dy-atlas-legend" aria-hidden="true"><span>◇ 宗门 / 势力</span><span>♢ 妖族</span><span v-if="hasSecrets">△ 秘境</span></div>
      <div class="dy-atlas-controls"><button type="button" aria-label="缩小地图" :disabled="scale <= 1" @click="zoomMap(.8)">−</button><span>{{ Math.round(scale * 100) }}%</span><button type="button" aria-label="放大地图" :disabled="scale >= 5" @click="zoomMap(1.25)">＋</button><button type="button" aria-label="复位地图" title="显示完整地图" @click="resetMap">⛶</button></div>
      </div>
    </div>
    <nav v-if="opened" class="dy-atlas-region-nav" aria-label="地域快速定位"><span>五域速览</span><button v-for="region in atlasRegions" :key="region.key" type="button" :aria-label="`定位${region.location.name}`" @click="focusRegion(region)"><b :style="{ background: region.color }"></b>{{ region.location.name }}</button></nav>
    <p v-if="opened" class="dy-atlas-hint">{{ expanded && hostLimited ? '宿主跨域限制：当前只能在可访问的窗口内展开。' : '' }}{{ expanded && portraitViewport && !fitAll ? '拖动探索五域 · 双指缩放 · 右下角复位查看全图' : '拖动探索 · 滚轮 / 双指缩放 · 点击地域或宗门查看详情' }}<span v-if="here"> · 当前位置：{{ here.name }}</span></p>
  </section>
  </Teleport>
</template>

<style scoped src="./atlas/atlas.css"></style>
