import { xianjieLore } from "../../../data/lore-xianjie";
import type { AtlasDefinition, AtlasRegion, AtlasMarker, Point, RegionKey } from "./atlas-types";

// Worldbook: five cardinal domains meet at Juntian; Buzhou Mountains bound
// Qinghua to the east; Taibai guards the time-space sea to the west.
// Boundaries/coordinates are illustrative, not measured geography.
const northEdge: Point[] = [[475,330],[548,316],[588,344],[663,310],[724,329],[791,298],[853,320],[922,298],[1010,335]];
const eastEdge: Point[] = [[1010,335],[995,389],[1024,446],[1006,503],[1030,552],[994,608],[1000,657]];
const southEdge: Point[] = [[1000,657],[935,638],[881,667],[825,647],[757,678],[696,651],[638,675],[566,644],[482,656]];
const westEdge: Point[] = [[482,656],[500,601],[469,548],[493,496],[474,443],[497,388],[475,330]];
const islands: Array<{ key: RegionKey; color: string; label: Point; points: Point[] }> = [
  { key: "center", color: "#796b91", label: [749,418], points: [...northEdge,...eastEdge.slice(1),...southEdge.slice(1),...westEdge.slice(1,-1)] },
  { key: "north", color: "#435e79", label: [751,145], points: [...northEdge,[1091,282],[1118,237],[1085,211],[1111,175],[1044,172],[1009,129],[958,138],[922,104],[874,118],[842,79],[778,88],[736,58],[686,83],[627,68],[600,99],[547,83],[521,124],[461,120],[435,159],[373,145],[351,191],[394,229],[372,260],[426,283]] },
  { key: "west", color: "#788494", label: [297,420], points: [...westEdge.slice().reverse(),[416,694],[363,682],[337,716],[291,683],[249,703],[231,664],[189,651],[211,611],[163,585],[179,544],[132,531],[155,486],[117,451],[148,416],[126,378],[167,365],[151,317],[195,302],[188,261],[235,281],[274,248],[321,272],[372,260],[426,283]] },
  { key: "east", color: "#5c8276", label: [1202,410], points: [...eastEdge.slice().reverse(),[1091,282],[1118,237],[1160,266],[1192,243],[1224,289],[1270,274],[1289,317],[1335,324],[1320,369],[1371,389],[1352,431],[1395,465],[1368,494],[1385,544],[1350,553],[1357,599],[1313,611],[1320,651],[1277,643],[1259,692],[1221,671],[1189,712],[1151,684],[1097,705],[1057,671]] },
  { key: "south", color: "#976d78", label: [748,746], points: [...southEdge.slice().reverse(),[1057,671],[1097,705],[1067,744],[1102,776],[1069,798],[1091,842],[1050,851],[1035,887],[984,866],[942,900],[899,877],[861,918],[812,900],[764,934],[726,904],[678,919],[646,887],[599,907],[575,875],[522,884],[514,841],[472,835],[481,797],[436,779],[455,742],[416,694]] },
];

function contour(points: Point[]): string {
  const jagged: Point[] = [];
  points.forEach((a, i) => {
    const b = points[(i + 1) % points.length]!;
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const length = Math.hypot(dx, dy);
    const steps = Math.max(4, Math.ceil(length / 6));
    for (let j = 0; j < steps; j++) {
      const t = j / steps;
      const orientation = dx > 0 || (dx === 0 && dy > 0) ? 1 : -1;
      const offset = orientation * Math.sin(t * Math.PI) * (Math.sin((a[0] + dx * t) * .71 + (a[1] + dy * t) * .53) * 3);
      jagged.push([a[0] + dx * t - dy / length * offset, a[1] + dy * t + dx / length * offset]);
    }
  });
  return `M${jagged.map(point => point.join(",")).join(" L")}Z`;
}
const regions: AtlasRegion[] = islands.map(island => ({ ...island, path: contour(island.points), location: xianjieLore[island.key]! }));
const positions: Record<string, Point> = {
  天庭: [649,488], 云上瑶池: [784,566], 阴煞宗: [580,190], 散仙秘境: [733,211], 地府入口: [872,185],
  剑修联盟: [208,464], 真灵世家: [273,535], 天庭前线: [210,356],
  玉灵宫: [1108,457], 万妖古界: [1232,504], 先天仙灵域: [1128,557],
  太古王族: [581,788], 极乐宗: [816,819],
};
const aliases: Record<string, string[]> = {
  天庭: ["凌霄仙阙", "天规神碑"], 阴煞宗: ["灵冥渊"], 太古王族: ["太古神都"], 极乐宗: ["极乐玉溪"],
  云上瑶池: ["九天瑶池"], 散仙秘境: ["散仙秘境群"],
  玉灵宫: ["玉灵仙山"], 先天仙灵域: ["万药仙圃"], 真灵世家: ["真灵古穴"], 天庭前线: ["界碑古关", "陨仙古战场"],
};
const markers: AtlasMarker[] = regions.flatMap(region => region.location.factions.map((faction, i) => ({
  id: `${region.key}:${faction.name}`, name: faction.name, kind: "faction" as const, region: region.key, faction,
  point: positions[faction.name] ?? [region.label[0] - 80, region.label[1] + 45 + i * 38] as Point,
  aliases: aliases[faction.name] ?? [],
})));
export const xianjieAtlas: AtlasDefinition = {
  id: "xianjie", title: "九天仙界", subtitle: "五大仙域", regions, markers,
  annotations: [{ text: "时空乱流海", point: [76,348], vertical: true }, { text: "不周山脉", point: [1006,426], vertical: true }],

};
