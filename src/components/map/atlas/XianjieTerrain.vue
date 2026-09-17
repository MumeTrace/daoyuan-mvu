<script setup lang="ts">
import type { AtlasRegion, Point } from "./atlas-types";
defineProps<{ regions: AtlasRegion[]; uid: string }>();
// Decorative geography from the worldbook; never additional clickable locations.
const woods: Point[] = [[1100,345],[1150,320],[1230,346],[1281,390],[1310,431],[1134,502],[1190,534],[1280,574],[1225,635],[1340,501]];
const swords: Point[] = [[205,390],[270,326],[329,366],[382,464],[212,541],[345,586],[277,615]];
const boneRidges: Point[] = [[472,222],[550,270],[634,267],[847,274],[940,248],[1004,204]];
const volcanoes: Point[] = [[543,728],[633,843],[862,870],[951,793],[1030,820]];
</script>

<template>
  <g class="immortal-terrain" pointer-events="none" aria-hidden="true">
    <defs>
      <clipPath v-for="region in regions" :id="`${uid}-terrain-${region.key}`" :key="region.key"><path :d="region.path" /></clipPath>
      <symbol :id="`${uid}-tree`" viewBox="0 0 50 60"><path d="M25 55V14M25 35 12 25M25 43 40 29"/><path d="M25 2C18 5 12 11 15 18 1 20 2 36 14 38 15 49 32 48 36 39 49 40 52 25 40 20 42 9 32 4 25 2Z"/></symbol>
      <symbol :id="`${uid}-sword`" viewBox="0 0 40 75"><path d="M20 2 14 42 20 50 26 42ZM7 49H33M20 49V69M14 69H26"/></symbol>
      <symbol :id="`${uid}-mountain`" viewBox="0 0 80 40"><path d="M0 38 20 12 32 27 44 1 80 38M20 12 25 30M44 1 49 16 42 13 34 32"/></symbol>
      <symbol :id="`${uid}-volcano`" viewBox="0 0 80 55"><path d="M0 53 24 20 33 24 44 20 80 53M24 20 33 15 44 20M34 29 29 41 40 48M35 10Q20 0 34 -8"/></symbol>
    </defs>
    <g :clip-path="`url(#${uid}-terrain-north)`" class="terrain-north">
      <path class="river-glow" d="M430 166Q510 128 569 174T685 186Q722 164 780 180T914 207Q973 225 1030 185"/>
      <path class="river" d="M430 166Q510 128 569 174T685 186Q722 164 780 180T914 207Q973 225 1030 185"/>
      <use v-for="(point,i) in boneRidges" :key="i" :href="`#${uid}-mountain`" :x="point[0]" :y="point[1]" width="65" height="34"/>
      <text x="690" y="280">白骨山脉</text><text x="525" y="161">弱水</text>
    </g>
    <g :clip-path="`url(#${uid}-terrain-west)`" class="terrain-west">
      <use v-for="(point,i) in swords" :key="i" :href="`#${uid}-sword`" :x="point[0]" :y="point[1]" width="30" height="62"/>
      <path d="M175 310 175 357 167 363 167 389M185 305 185 352 177 359 177 390M162 328H193M162 341H193"/>
      <text x="251" y="666">庚金剑峰 · 边防重地</text>
    </g>
    <g :clip-path="`url(#${uid}-terrain-center)`" class="terrain-center">
      <path class="cloud" d="M565 378Q550 361 570 357Q575 330 599 343Q617 329 628 352Q650 347 648 366H692M820 597Q808 579 826 574Q834 548 855 563Q879 550 890 573Q914 567 919 590H940M568 574Q586 552 609 563T673 565"/>
      <g transform="translate(716 467)"><path d="M-34 0H34M-42 -5 -23 -13H23L42 -5ZM-26 -14 -16 -25H16L26 -14ZM-10 -27 0 -39 10 -27M-24 0V25H24V0M-10 25V8H10V25M-30 26H30"/></g>
      <path class="law" d="M583 525H749L773 501H899M609 530H745L774 505H867"/>
      <path d="M836 476V514H853V476ZM839 482H850M839 489H850M839 496H850"/>
      <text x="731" y="363">祥云宫阙 · 天道中枢</text>
    </g>
    <g :clip-path="`url(#${uid}-terrain-east)`" class="terrain-east">
      <use v-for="(point,i) in woods" :key="i" :href="`#${uid}-tree`" :x="point[0]" :y="point[1]" width="34" height="46"/>
      <text x="1117" y="638">原始仙林 · 万木之乡</text>
    </g>
    <g class="terrain-buzhou"><path d="M1005 349 994 370 1002 364 1015 381M1016 541 1004 561 1016 553 1033 575M1004 576 991 598 1004 588 1017 610M1003 616 990 640 1004 630 1017 650"/></g>
    <g :clip-path="`url(#${uid}-terrain-south)`" class="terrain-south">
      <g class="suns"><circle cx="698" cy="703" r="9"/><circle cx="747" cy="698" r="13"/><circle cx="796" cy="703" r="9"/><path d="M731 698H724M770 698H763M747 677V670M747 719V726"/></g>
      <use v-for="(point,i) in volcanoes" :key="i" :href="`#${uid}-volcano`" :x="point[0]" :y="point[1]" width="64" height="44"/>
      <path class="lava" d="M725 780 711 803 726 822 713 842 749 879M907 711 878 750 900 772 883 798M520 783 545 801 533 820"/>
      <text x="739" y="868">赤土焦原 · 不灭仙火</text>
    </g>
  </g>
</template>

<style scoped>
.immortal-terrain{fill:none;stroke-width:1.2;stroke-linejoin:round;stroke-linecap:round}
.immortal-terrain text{stroke:none;fill:currentColor;font-size:15px;letter-spacing:3px;opacity:.65}
.terrain-north{color:#b5d1e8;stroke:#c6d8ea66}.river{stroke:#a3daf48a;stroke-width:2}.river-glow{stroke:#90cff31a;stroke-width:10}
.terrain-west{color:#d5dde6;stroke:#dbe3ec60}.terrain-center{color:#e7cffa;stroke:#ead4f084}.terrain-center .cloud{stroke:#e5d8f153}.terrain-center .law{stroke:#e7d4b854}
.terrain-east{color:#c0e1cc;stroke:#c7e2ca54;fill:#b9deca0b}.terrain-buzhou{stroke:#d1d3ba77}
.terrain-south{color:#f2c4ac;stroke:#efbc9c6b}.lava{stroke:#f0b19477;stroke-width:2}.suns{stroke:#f4d1b598;fill:#ffd5a917}
</style>
