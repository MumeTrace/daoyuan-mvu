import type { MapFaction, MapLocation } from "../../../data/lore-xuantian";

export type Point = readonly [number, number];
export type RegionKey = "north" | "west" | "center" | "east" | "south";
export interface AtlasRegion { key: RegionKey; path: string; color: string; label: Point; location: MapLocation }
export interface AtlasMarker {
  id: string; point: Point; name: string; kind: "faction" | "secret";
  region?: RegionKey; faction?: MapFaction; location?: MapLocation; aliases?: string[];
  placementNote?: string;
}
export interface AtlasDefinition {
  id: "xuantian" | "xianjie";
  title: string;
  subtitle: string;
  regions: AtlasRegion[];
  markers: AtlasMarker[];
  annotations: Array<{ text: string; point: Point; vertical?: boolean }>;
  connections?: Array<[Point, Point]>;
}
