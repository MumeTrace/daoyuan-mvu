import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const cache = new Map();
function loadTs(file) {
  const absolute = path.resolve(file);
  if (cache.has(absolute)) return cache.get(absolute);
  const module = { exports: {} };
  cache.set(absolute, module.exports);
  const source = ts.transpileModule(fs.readFileSync(absolute, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const localRequire = id => id.startsWith('.') ? loadTs(path.resolve(path.dirname(absolute), `${id}.ts`)) : require(id);
  new Function('require', 'module', 'exports', source)(localRequire, module, module.exports);
  return module.exports;
}
const { xuantianLore } = loadTs('src/data/lore-xuantian.ts');
const { atlasRegions, atlasMarkers, createAtlasMarkers } = loadTs('src/components/map/atlas/xuantian-atlas.ts');
const { xuantianAtlas } = loadTs('src/components/map/atlas/xuantian-atlas.ts');
const { xianjieAtlas } = loadTs('src/components/map/atlas/xianjie-atlas.ts');
const { resolveAtlasPosition, cleanMapLocation } = loadTs('src/components/map/atlas/location-match.ts');
assert.equal(atlasRegions.length, 5);
assert.equal(new Set(atlasMarkers.map(marker => marker.id)).size, atlasMarkers.length);
let factions = 0, secrets = 0, guardians = 0;
for (const [key, location] of Object.entries(xuantianLore)) {
  const region = atlasRegions.find(item => item.key === key);
  if (region) {
    assert.equal(region.location, location, 'Map and modals must share the authoritative lore object');
    assert.ok(region.path.startsWith('M ') && region.path.endsWith(' Z'));
    assert.ok(!/NaN|undefined|Infinity/.test(region.path));
    for (const faction of location.factions) {
      const marker = atlasMarkers.find(item => item.id === `${key}:${faction.name}`);
      assert.ok(marker, `Missing faction: ${faction.name}`);
      assert.equal(marker.faction, faction);
      factions++;
    }
  } else {
    const marker = atlasMarkers.find(item => item.id === key);
    assert.equal(marker?.location, location, `Missing special location: ${location.name}`);
    guardians += marker.location.factions.length;
    assert.ok(marker.location.factions.every(faction => faction.kind === 'guardian'), 'Guardians must be explicitly routed to portraits, not sect maps');
    secrets++;
  }
}
assert.equal(secrets, 9);
assert.equal(guardians, 9);
assert.deepEqual(Object.values(xuantianLore).flatMap(location => location.factions.filter(faction => faction.kind === 'guardian').map(faction => faction.name)),
  ['紫澪', '绯萝', '霜甄', '月珑', '虚渊', '蜃娆', '幽姬', '辛绫', '玄曦']);
assert.equal(xianjieAtlas.regions.length, 5);
assert.equal(xianjieAtlas.markers.length, 13);
assert.ok(xianjieAtlas.regions.every(region => !atlasRegions.some(other => other.path === region.path)));
for (const region of xianjieAtlas.regions) for (const faction of region.location.factions) {
  assert.ok(xianjieAtlas.markers.some(marker => marker.faction === faction));
}
const resolve = raw => resolveAtlasPosition(raw, [xuantianAtlas, xianjieAtlas]);
for (const [raw, expected] of [
  ['中央神州·大周仙朝神都洛阳·南市水街·保和堂药铺·[药铺里提起广寒宫]', '大周仙朝'],
  ['玄天界 / 蜀 山 剑 门 > 山门', '蜀山剑门'], ['九天仙界：太白仙域 / 界碑古关', '天庭前线'],
  ['仙界·天庭前线', '天庭前线'], ['北冥雪原·琉璃净月宫·净月瑶池', '琉璃净月宫'],
  ['中央神州·未知小巷', '中央神州'], ['九天仙界·凌霄仙阙', '天庭'],
]) assert.equal(resolve(raw)?.name, expected, raw);
for (const raw of ['', '未知', 'AI新编的秘境', '无名小村 [听说蜀山剑门]', '玄天界·九天仙界', '西漠佛国·广寒宫', '蜀山剑门与广寒宫之间', '中央神州·北冥雪原']) {
  assert.equal(resolve(raw), null, `Must not guess: ${raw}`);
}
assert.ok(!cleanMapLocation('药铺·[正在谈论广寒宫').includes('广寒宫'));
assert.ok(atlasMarkers.some(marker => marker.name === '血神宫'));
assert.ok(atlasMarkers.some(marker => marker.name === '黑金阁'));
for (const marker of atlasMarkers) assert.ok(marker.point.every(Number.isFinite));
// Worldbook cardinal relationships, not invented exact distances or scale.
const point = name => atlasMarkers.find(marker => marker.name === name).point;
assert.ok(point('昆仑道门')[0] < point('蜀山剑门')[0] && point('蜀山剑门')[0] < point('大周仙朝')[0]);
assert.ok(point('星道宗')[1] < point('符韵门')[1] && point('符韵门')[1] < point('大周仙朝')[1]);
assert.ok(point('青玉宗')[0] < point('大周仙朝')[0] && point('青玉宗')[1] > point('大周仙朝')[1]);
assert.ok(point('桃花宗')[1] > point('万法宗')[1]);
assert.ok(point('南梁古国')[0] > point('大周仙朝')[0] && point('南梁古国')[1] > point('大周仙朝')[1]);
assert.ok(point('灵墟宗')[0] > point('万法宗')[0]);
assert.ok(atlasMarkers.find(marker => marker.name === '天机阁').placementNote);
const extended = structuredClone(xuantianLore);
extended.center.factions.push({ name: '测试新增宗门', type: 'neutral' });
extended.extra = { ...extended.north, name: '测试新增秘境' };
assert.ok(createAtlasMarkers(extended).some(marker => marker.name === '测试新增宗门'));
assert.ok(createAtlasMarkers(extended).some(marker => marker.name === '测试新增秘境'));

// Keep the independent 3D implementation and the untouched immortal realm entry.
const worldMap = fs.readFileSync('src/components/map/WorldMap.vue', 'utf8');
for (const feature of ['dy_map3d_warned', 'toggle3d', 'confirm3d', 'map-3d-iframe', 'requestFullscreen', 'xianjieAtlas', 'ui.openImageModal(mapImage)']) {
  assert.ok(worldMap.includes(feature), `Missing legacy entry: ${feature}`);
}
assert.ok(!worldMap.includes(':lore="xuantianLore"'), 'Old Xuantian node diagram should be replaced');
assert.ok(worldMap.includes('@location="ui.openMapLocation"'));
console.log(`World map validated: 5 regions, ${factions} direct factions, ${secrets} special locations, ${guardians} guardians; fallback placement and legacy entries retained.`);
