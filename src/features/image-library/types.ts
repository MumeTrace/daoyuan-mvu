import type { DataRecord } from "../../types/stat-data";
export interface ImageLibraryImage extends DataRecord { url: string; theme: string; tags: string[] }
export interface ImageLibraryEntity extends DataRecord { type: "character" | "sect"; images: ImageLibraryImage[] }
export interface ParsedImageLibrary { schemaVersion: 2; data: { entities: Record<string, ImageLibraryEntity> } }
export interface ImageLibraryState { schemaVersion: number | null; entities: Record<string, ImageLibraryEntity>; loaded: boolean; source: string | null }
