<script setup lang="ts">
import { computed } from "vue";
import type { AtlasDefinition, Point, RegionKey } from "./atlas-types";
const props = defineProps<{ atlas: AtlasDefinition; uid: string }>();
// Unnamed cartographic relief: environment cues, not extra lore or travel routes.
const bands = computed(() => props.atlas.id === "xuantian" ? [
  { region: "north", points: [[437,213],[508,243],[582,210],[637,241],[713,260],[780,244],[865,267],[930,240],[1040,285],[1143,305]] },
  { region: "east", points: [[1060,390],[1057,438],[1073,486],[1045,536],[1085,582],[1110,643]] },
  { region: "south", points: [[453,710],[504,689],[570,727],[628,701],[683,747],[762,718],[823,759],[904,742],[977,784]] },
] : [
  { region: "north", points: [[441,251],[508,269],[582,259],[657,285],[732,269],[806,293],[879,263],[971,280],[1048,239]] },
  { region: "west", points: [[230,291],[267,349],[251,422],[281,470],[248,538],[293,580],[321,650]] },
  { region: "east", points: [[1020,366],[1035,419],[1018,469],[1038,521],[1019,565],[1052,637]] },
  { region: "south", points: [[477,778],[542,807],[613,771],[672,823],[738,808],[793,856],[878,837],[942,856],[1030,822]] },
]);
function ridgeline(points: number[][], offset: number) {
  const shifted = points.map(([x,y],i) => [x!, y! + offset + Math.sin(i * 2.3) * Math.abs(offset) * .4]);
  return shifted.map((point,i) => {
    if (!i) return `M${point.join(',')}`;
    const previous = shifted[i-1]!, before = shifted[Math.max(0,i-2)]!, after = shifted[Math.min(shifted.length-1,i+1)]!;
    return `C${previous[0]!+(point[0]!-before[0]!)/6},${previous[1]!+(point[1]!-before[1]!)/6} ${point[0]!-(after[0]!-previous[0]!)/6},${point[1]!-(after[1]!-previous[1]!)/6} ${point.join(',')}`;
  }).join(' ');
}
const forests = computed(() => {
  const points: Point[] = props.atlas.id === "xuantian"
    ? [[1210,386],[1318,418],[1177,461],[1248,537],[1190,610],[1346,549],[1140,535]]
    : [[1140,348],[1250,354],[1300,444],[1170,480],[1255,564],[1189,610],[1327,519]];
  return points.flatMap(([x,y], i) => Array.from({ length: 6 }, (_, j) => ({ x: x + Math.sin(j * 2.4 + i) * 21, y: y + Math.cos(j * 3 + i) * 16, r: 6 + (i+j)%5 })));
});
const clip = (key: RegionKey | string) => `url(#${props.uid}-relief-${key})`;
</script>

<template>
  <g class="atlas-relief" pointer-events="none" aria-hidden="true">
    <defs><clipPath v-for="region in atlas.regions" :key="region.key" :id="`${uid}-relief-${region.key}`"><path :d="region.path"/></clipPath></defs>
    <g v-for="band in bands" :key="band.region" :clip-path="clip(band.region)" class="relief-ridge">
      <path :d="`${ridgeline(band.points, 0)} ${ridgeline([...band.points].reverse(), 27).replace('M','L')} Z`" class="relief-slope"/>
      <path v-for="offset in [-9,0,11,25]" :key="offset" :d="ridgeline(band.points, offset)" :class="{ 'relief-crest': offset === 0 }"/>
    </g>
    <g :clip-path="clip('east')" class="relief-forest"><circle v-for="(tree,i) in forests" :key="i" :cx="tree.x" :cy="tree.y" :r="tree.r"/></g>
    <g v-if="atlas.id === 'xuantian'" :clip-path="clip('west')" class="relief-dunes">
      <path v-for="n in 10" :key="n" :d="`M140 ${300+n*27} Q230 ${260+n*27} 310 ${317+n*27} T460 ${300+n*27}`"/>
      <path d="M228 406 252 373 276 406 294 382 313 412M252 373 261 404M294 382 298 403" class="relief-crest"/>
    </g>
    <g v-if="atlas.id === 'xuantian'" :clip-path="clip('center')" class="relief-valley">
      <path d="M542 391Q616 376 622 459T711 515Q733 538 746 589"/>
      <path d="M631 468Q718 480 750 462T899 484"/>
      <ellipse cx="587" cy="532" rx="22" ry="10"/>
    </g>
    <g v-if="atlas.id === 'xuantian'" :clip-path="clip('south')" class="relief-volcanic">
      <path d="M483 756 516 724 549 756M847 787 882 752 920 790M632 840 667 803 700 841M882 752 877 763 888 773 887 784M667 803 661 817 670 829"/>
      <ellipse cx="747" cy="798" rx="39" ry="17"/><ellipse cx="747" cy="798" rx="46" ry="23"/>
    </g>
  </g>
</template>

<style scoped>
.atlas-relief{fill:none;stroke-width:1;stroke-linejoin:round;stroke-linecap:round}
.relief-ridge{stroke:#ecedf01b}.relief-ridge .relief-crest{stroke:#f1e9e445;stroke-width:1.2}.relief-ridge .relief-slope{fill:#10182715;stroke:none}
.relief-forest{stroke:#d2f1dc16;fill:#103e2e1c}.relief-dunes{stroke:#f4ddb72e;stroke-width:1.1}.relief-dunes .relief-crest{stroke:#f7e2bd57}
.relief-valley{stroke:#bee5ed69;stroke-width:1.8}.relief-valley ellipse{fill:#87b5cd2b;stroke:#d0e8f333}.relief-volcanic{stroke:#fad3bd55;fill:#b35a6617}
</style>
