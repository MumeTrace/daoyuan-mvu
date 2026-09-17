import { xuantianLore } from "../../../data/lore-xuantian";
import type { Point, RegionKey, AtlasRegion, AtlasMarker, AtlasDefinition } from "./atlas-types";
export type { Point, RegionKey, AtlasRegion, AtlasMarker } from "./atlas-types";

// Shared borders are generated ONCE, then reversed by the neighbouring region.
// This avoids hairline gaps and overlapping hit areas at every zoom level.
function coast(points: readonly Point[], seed: number, roughness = 3): Point[] {
  const result: Point[] = [];
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]!, b = points[i]!;
    const dx = b[0] - a[0], dy = b[1] - a[1], length = Math.hypot(dx, dy);
    const steps = Math.max(1, Math.ceil(length / 7));
    for (let j = 0; j < steps; j++) {
      const t = j / steps;
      const n = j === 0 ? 0 : (Math.sin((i * 91 + j * 37 + seed) * 12.9898) * 43758.5453 % 1) * roughness;
      result.push([a[0] + dx * t - dy / length * n, a[1] + dy * t + dx / length * n]);
    }
  }
  result.push(points[points.length - 1]!);
  return result;
}
const reverse = (points: Point[]) => [...points].reverse();
// Smooth each shared edge independently so reversing it preserves the exact
// same border; sub-pixel coast detail does not become a sawtooth when zoomed out.
const coordinate = (point: Point) => `${point[0].toFixed(2)},${point[1].toFixed(2)}`;
const midpoint = (a: Point, b: Point): Point => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
const path = (...edges: Point[][]) => `M ${coordinate(edges[0]![0]!)} ${edges.map(edge => {
  if (edge.length < 2) return "";
  const segments = [`L ${coordinate(edge[0]!)} L ${coordinate(midpoint(edge[0]!, edge[1]!))}`];
  for (let i = 1; i < edge.length - 1; i++) segments.push(`Q ${coordinate(edge[i]!)} ${coordinate(midpoint(edge[i]!, edge[i + 1]!))}`);
  segments.push(`L ${coordinate(edge[edge.length - 1]!)}`);
  return segments.join(" ");
}).join(" ")} Z`;

const nw = coast([[495,285],[474,260],[453,263],[438,233],[405,225]], 1);
const nc = coast([[495,285],[530,270],[559,278],[577,252],[615,253],[647,274],[678,261],[693,286],[730,294],[754,313],[783,299],[828,312],[855,287],[883,270],[909,295],[941,285],[965,332],[1007,356],[1028,400]], 2);
const ne = coast([[1028,400],[1050,371],[1089,362],[1114,370],[1134,342],[1167,344],[1194,320]], 3);
const wc = coast([[495,285],[481,316],[496,342],[470,369],[475,398],[449,425],[458,454],[436,480],[455,505],[445,529],[468,556],[448,579]], 4);
const ce = coast([[1028,400],[1011,431],[1030,458],[1012,483],[1020,514],[999,542],[1000,568]], 5);
const cs = coast([[448,579],[478,591],[499,615],[537,600],[561,616],[596,617],[621,644],[648,624],[678,647],[714,629],[741,615],[777,629],[810,617],[841,639],[876,620],[908,629],[941,601],[961,574],[1000,568]], 6);
const ws = coast([[448,579],[459,617],[435,646],[419,667]], 7);
const es = coast([[1000,568],[1032,557],[1062,583],[1056,619],[1082,641],[1090,675]], 8);
const north = coast([[405,225],[383,202],[401,180],[398,157],[423,164],[438,192],[478,217],[503,204],[518,164],[502,146],[533,118],[530,92],[553,81],[574,104],[608,106],[627,80],[660,82],[684,67],[686,27],[711,43],[730,31],[750,66],[759,96],[790,105],[805,99],[833,121],[863,109],[888,140],[920,129],[945,146],[974,118],[991,141],[1016,138],[1033,160],[1058,155],[1064,183],[1090,197],[1095,171],[1116,161],[1135,184],[1118,216],[1140,233],[1134,256],[1155,267],[1174,252],[1196,275],[1222,267],[1235,287],[1216,308],[1194,320]], 9, 4);
const west = coast([[419,667],[396,650],[386,610],[365,617],[345,646],[315,618],[293,620],[290,590],[268,581],[249,548],[220,557],[202,530],[176,537],[169,502],[140,484],[133,452],[109,465],[90,439],[104,407],[130,403],[129,378],[146,355],[130,339],[145,321],[181,325],[215,300],[229,272],[255,248],[251,223],[225,211],[211,183],[187,182],[180,160],[160,169],[152,151],[165,135],[191,137],[209,155],[247,169],[271,188],[303,181],[324,203],[350,197],[379,221],[405,225]], 10, 4);
const east = coast([[1194,320],[1221,307],[1241,326],[1264,332],[1285,306],[1290,271],[1279,251],[1291,234],[1311,244],[1322,272],[1346,271],[1355,299],[1341,329],[1356,349],[1352,374],[1381,390],[1406,387],[1418,406],[1405,434],[1429,455],[1435,482],[1420,503],[1437,518],[1424,542],[1405,538],[1390,578],[1371,576],[1355,605],[1331,598],[1315,630],[1290,625],[1271,661],[1252,655],[1228,685],[1197,674],[1180,700],[1156,688],[1136,710],[1112,697],[1090,675]], 11, 4);
const south = coast([[1090,675],[1075,702],[1055,711],[1044,744],[1065,761],[1062,783],[1090,795],[1100,822],[1129,841],[1120,860],[1093,854],[1068,841],[1040,845],[1020,821],[994,831],[966,805],[944,822],[917,815],[899,851],[877,854],[864,838],[843,861],[811,865],[791,842],[768,857],[741,852],[723,875],[716,906],[738,927],[719,936],[691,918],[666,924],[651,897],[624,883],[623,864],[599,861],[585,837],[557,837],[538,813],[509,818],[487,793],[460,803],[443,785],[421,789],[415,762],[387,766],[366,744],[380,720],[381,698],[409,694],[419,667]], 12, 4);

export const atlasRegions: AtlasRegion[] = [
  { key: "north", path: path(north, reverse(ne), reverse(nc), nw), color: "#526f8b", label: [755,190], location: xuantianLore.north! },
  { key: "west", path: path(reverse(ws), reverse(wc), nw, reverse(west)), color: "#978064", label: [298,380], location: xuantianLore.west! },
  { key: "center", path: path(nc, ce, reverse(cs), reverse(wc)), color: "#746b89", label: [741,387], location: xuantianLore.center! },
  { key: "east", path: path(ne, east, reverse(es), reverse(ce)), color: "#587b6e", label: [1222,431], location: xuantianLore.east! },
  { key: "south", path: path(cs, es, south, reverse(ws)), color: "#996c6a", label: [722,726], location: xuantianLore.south! },
];

const factionPositions: Record<string, Point> = {
  // Cardinal directions from 地点：中央神州 and individual faction entries.
  // Conflicting distance figures are NOT treated as a consistent map scale.
  大周仙朝: [750,438], 南梁古国: [826,555], 蜀山剑门: [617,438], 昆仑道门: [492,438],
  桃花宗: [867,598], 万法宗: [906,515], 合欢宗: [651,514], 天机阁: [573,337],
  星道宗: [718,307], 湮丹宗: [738,591], 灵墟宗: [937,450], 青玉宗: [533,558],
  符韵门: [718,345], 阵天宗: [797,483], 广寒宫: [729,229], 蛟龙一族: [955,193],
  太阳神宫: [871,778], 尸魔宗: [712,669], 黑金阁: [936,706], 万魂殿: [545,763], 血神宫: [716,812],
  神猿族: [1097,493], 九尾天狐族: [1268,493], 五色孔雀族: [1176,578], 柳蛇族: [1168,355], 大雷音寺: [294,444],
};
const secretPositions: Record<string, Point> = {
  special_east: [1370,688], s_youlin: [455,700], s_gengjin: [244,285], s_liuli: [597,151],
  s_wuxing: [930,365], s_shahai: [220,589], s_yunsheng: [1304,212], s_huangquan: [935,862], s_tianyuan: [1020,83],
};
const secretRegions: Partial<Record<string, RegionKey>> = {
  special_east: "east", s_youlin: "south", s_gengjin: "west", s_liuli: "north",
  s_wuxing: "center", s_shahai: "west", s_yunsheng: "east", s_huangquan: "south",
};

// Data-driven fallbacks keep future additions reachable even before cartographic placement.
export function createAtlasMarkers(lore = xuantianLore): AtlasMarker[] {
  const markers: AtlasMarker[] = [];
  for (const region of atlasRegions) {
    const location = lore[region.key];
    if (!location) continue;
    location.factions.forEach((faction, index) => markers.push({
      id: `${region.key}:${faction.name}`, name: faction.name, kind: "faction", region: region.key, faction,
      point: factionPositions[faction.name] ?? [region.label[0] - 95 + index % 2 * 160, region.label[1] + 65 + Math.floor(index / 2) * 38],
      placementNote: faction.name === "天机阁" ? "驻地游移不定，此标记仅为资料入口，不代表固定驻地。" : undefined,
    }));
  }
  for (const [key, location] of Object.entries(lore)) {
    if (atlasRegions.some(region => region.key === key)) continue;
    markers.push({ id: key, name: location.name, kind: "secret", location, region: secretRegions[key],
      point: secretPositions[key] ?? [location.x * 15, location.y * 9.5] });
  }
  return markers;
}
export const atlasMarkers = createAtlasMarkers();

// Explicit place aliases from the existing faction/location descriptions, not fuzzy character matching.
const aliases: Record<string, string[]> = {
  大周仙朝: ["神都洛阳", "洛阳"], 昆仑道门: ["昆仑神山"], 蜀山剑门: ["蜀山群峰"],
  桃花宗: ["落英山脉", "十里桃林"], 万法宗: ["万法天仪"], 合欢宗: ["百花谷", "极极宫"],
  天机阁: ["蜃楼飞阁"], 星道宗: ["摘星悬岛"], 湮丹宗: ["杏临谷"], 灵墟宗: ["灵兽原"],
  青玉宗: ["青音湖"], 符韵门: ["云符山"], 阵天宗: ["千阵岭"], 广寒宫: ["广寒玉宫"],
  太阳神宫: ["太阳火殿"], 尸魔宗: ["葬仙坡"], 血神宫: ["猩红血海"], 万魂殿: ["阴风山脉", "万鬼窟"],
  柳蛇族: ["碧玉温泉"], 神猿族: ["万妖山脉"], 九尾天狐族: ["沂云森林"], 五色孔雀族: ["五色谷"],
  大雷音寺: ["须弥金顶", "须弥山"], 蓬莱仙岛: ["渊涯谷"],
};
atlasMarkers.forEach(marker => { marker.aliases = aliases[marker.name] ?? []; });
export const xuantianAtlas: AtlasDefinition = {
  id: "xuantian", title: "玄天界", subtitle: "五域舆图", regions: atlasRegions, markers: atlasMarkers,
  annotations: [
    { text: "绝迹冰谷", point: [1040,290] }, { text: "叹息沙海", point: [181,530] },
    { text: "无尽山脉", point: [1058,430], vertical: true }, { text: "烬骨荒原", point: [1080,788] },
    { text: "星 海", point: [100,747] }, { text: "天 外 海", point: [1300,830] },
  ],
};
