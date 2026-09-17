import type { AtlasDefinition, Point } from "./atlas-types";

export interface AtlasPosition { atlasId: AtlasDefinition["id"]; name: string; point: Point; kind: "region" | "marker"; id: string }

/** Display-only tolerant parsing, never changes the AI's world variable. */
export function cleanMapLocation(raw: string): string {
  const normalized = raw.normalize("NFKC");
  // Bracketed scene prose is not a location. Unclosed brackets also end the path.
  return normalized.replace(/\[[\s\S]*?\]|【[\s\S]*?】|\([^)]*\)/g, " ")
    .replace(/[\[【(][\s\S]*$/, "").trim();
}
const compact = (text: string) => text.replace(/[\s·•—_－/\\，,。.:：>＞|｜-]+/g, "");

export function resolveAtlasPosition(raw: string, atlases: AtlasDefinition[]): AtlasPosition | null {
  const clean = cleanMapLocation(raw);
  if (!clean || /^(未知|不明|未接入|无|暂无|null|undefined)$/i.test(clean)) return null;
  const text = compact(clean);
  const explicit = /九天仙界|仙界/.test(clean) ? "xianjie" : /玄天界/.test(clean) ? "xuantian" : null;
  if (/玄天界/.test(clean) && /九天仙界|仙界/.test(clean)) return null;
  const candidates: Array<AtlasPosition & { weight: number; region: string; token: string }> = [];
  const namedRegionCount = atlases.flatMap(atlas => atlas.regions.filter(region => text.includes(compact(region.location.name)))).length;
  if (namedRegionCount > 1) return null;
  let conflict = false;
  for (const atlas of atlases) {
    if (explicit && atlas.id !== explicit) continue;
    const namedRegions = atlas.regions.filter(region => text.includes(compact(region.location.name)));
    for (const marker of atlas.markers) {
      const names = [marker.name, ...(marker.aliases ?? [])].map(compact).filter(name => name && text.includes(name));
      if (!names.length) continue;
      if (marker.region && namedRegions.length && !namedRegions.some(region => region.key === marker.region)) {
        // A contained shorter name (e.g. 天庭 inside 天庭前线) is not a separate destination.
        if (!atlas.markers.some(other => other !== marker && other.name.includes(marker.name) && text.includes(compact(other.name)))) conflict = true;
        continue;
      }
      const token = names.sort((a, b) => b.length - a.length)[0]!;
      candidates.push({ atlasId: atlas.id, name: marker.name, point: marker.point, kind: "marker", id: marker.id,
        region: marker.region ?? "", weight: token.length, token });
    }
  }
  // Two equally specific distinct matches are ambiguous; do not guess or center-fallback.
  if (conflict) return null;
  const distinct = candidates.filter(candidate => !candidates.some(other => other !== candidate && other.token.length > candidate.token.length && other.token.includes(candidate.token)));
  distinct.sort((a, b) => b.weight - a.weight);
  if (distinct.length) {
    const first = distinct[0]!;
    if (distinct.some(other => other.atlasId !== first.atlasId || (other.region && first.region && other.region !== first.region))) return null;
    if (distinct[1]?.weight === first.weight) return null;
    return first;
  }
  const regions = atlases.filter(atlas => !explicit || atlas.id === explicit).flatMap(atlas => atlas.regions
    .filter(region => text.includes(compact(region.location.name)))
    .map(region => ({ atlasId: atlas.id, name: region.location.name, point: region.label, kind: "region" as const, id: region.key })));
  return regions.length === 1 ? regions[0]! : null;
}
