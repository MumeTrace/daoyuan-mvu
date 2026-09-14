import type { DataRecord } from "../../types/stat-data";
function affection(stats: DataRecord = {}): number { return Number.parseFloat(String(stats.亲密 ?? stats.好感 ?? stats.亲密度 ?? stats.好感度 ?? 0)); }
export function canUsePortraitTheme(theme: string, images: unknown[], characterStats: DataRecord = {}): boolean { return Array.isArray(images) && images.length > 0 && (theme !== "special" || affection(characterStats) > 90); }
