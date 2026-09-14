import { getImageLibraryState } from "./store.ts";
import type { ImageLibraryEntity, ImageLibraryImage } from "./types.ts";
export function getImageEntity(name: string): ImageLibraryEntity | null {
  const entities = getImageLibraryState().entities;
  const key = String(name || "").trim();
  return key && Object.hasOwn(entities, key) ? entities[key] ?? null : null;
}
export function getEntityType(name: string): ImageLibraryEntity["type"] | null { return getImageEntity(name)?.type ?? null; }
export function getCharacterEntity(name: string): ImageLibraryEntity | null { const entity = getImageEntity(name); return entity?.type === "character" ? entity : null; }
export function getSectEntity(name: string): ImageLibraryEntity | null { const entity = getImageEntity(name); return entity?.type === "sect" ? entity : null; }
export function getImagesByTheme(name: string, theme: string): ImageLibraryImage[] { return getImageEntity(name)?.images.filter((image) => image.theme === theme) ?? []; }
export function groupCharacterImagesByTheme(name: string): Map<string, ImageLibraryImage[]> {
  const groups = new Map<string, ImageLibraryImage[]>();
  getCharacterEntity(name)?.images.forEach((image) => groups.set(image.theme, [...(groups.get(image.theme) ?? []), image]));
  return groups;
}
export function getSectMapImages(name: string): ImageLibraryImage[] { return getSectEntity(name)?.images.filter((image) => image.theme === "map") ?? []; }
export function getAllCharacterNames(): string[] { return Object.entries(getImageLibraryState().entities).filter(([, entity]) => entity.type === "character").map(([name]) => name); }
