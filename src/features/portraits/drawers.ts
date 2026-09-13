import { getDaoyuanStorage } from "../../bridge/storage-runtime.ts";
import {
  resetThemeUiConfiguration,
  setThemeUiConfiguration,
  type ThemeUiConfiguration,
} from "./theme-ui.ts";

export const PORTRAIT_DRAWERS_URL =
  "https://raw.githubusercontent.com/YttriumCarbide/Daoyuan/main/portrait-drawers.json";
export const PORTRAIT_DRAWERS_CACHE_KEY =
  "daoyuan_portrait_drawers_cache_v1";
export const SUPPORTED_PORTRAIT_DRAWERS_SCHEMA_VERSION = 1 as const;

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function normalizePoolId(poolId: unknown): string {
  const normalized = String(poolId ?? "").trim().toLowerCase();
  return normalized === "normal" ? "default" : normalized;
}

export function parsePortraitDrawers(raw: unknown): ThemeUiConfiguration {
  const parsed = typeof raw === "string" ? JSON.parse(raw) as unknown : raw;
  const source = record(parsed);
  if (!source) throw new Error("立绘抽屉配置不是有效对象");
  if (Number(source.schemaVersion) !== SUPPORTED_PORTRAIT_DRAWERS_SCHEMA_VERSION) {
    throw new Error(
      `不支持的立绘抽屉配置版本：${String(source.schemaVersion ?? "缺失")}`,
    );
  }

  const sourcePools = record(source.pools);
  if (!sourcePools) throw new Error("立绘抽屉配置缺少 pools");

  const pools: ThemeUiConfiguration["pools"] = {};
  for (const [rawPoolId, rawPool] of Object.entries(sourcePools)) {
    const poolId = normalizePoolId(rawPoolId);
    const pool = record(rawPool);
    if (!poolId || !pool) {
      throw new Error(`立绘抽屉“${rawPoolId}”配置无效`);
    }
    if (pools[poolId]) {
      throw new Error(`立绘抽屉 ID 重复：${rawPoolId}`);
    }

    const name = String(pool.name ?? "").trim();
    const icon = String(pool.icon ?? "").trim();
    if (!name || !icon) {
      throw new Error(`立绘抽屉“${rawPoolId}”缺少 name 或 icon`);
    }

    const order = Number(pool.order);
    pools[poolId] = {
      name,
      icon,
      ...(Number.isFinite(order) ? { order } : {}),
    };
  }
  if (!Object.keys(pools).length) {
    throw new Error("立绘抽屉配置没有卡池数据");
  }

  const aliases: Record<string, string> = {};
  if (source.aliases !== undefined) {
    const sourceAliases = record(source.aliases);
    if (!sourceAliases) throw new Error("立绘抽屉 aliases 配置无效");
    for (const [rawAlias, rawTarget] of Object.entries(sourceAliases)) {
      const alias = normalizePoolId(rawAlias);
      const target = normalizePoolId(rawTarget);
      if (!alias || !target) {
        throw new Error("立绘抽屉 aliases 包含空 ID");
      }
      aliases[alias] = target;
    }
  }

  return {
    schemaVersion: SUPPORTED_PORTRAIT_DRAWERS_SCHEMA_VERSION,
    pools,
    aliases,
  };
}

function readPortraitDrawersCache(): ThemeUiConfiguration | null {
  const saved = getDaoyuanStorage().getItem(PORTRAIT_DRAWERS_CACHE_KEY);
  return saved ? parsePortraitDrawers(saved) : null;
}

function writePortraitDrawersCache(data: ThemeUiConfiguration): void {
  getDaoyuanStorage().setItem(PORTRAIT_DRAWERS_CACHE_KEY, JSON.stringify(data));
}

function clearPortraitDrawersCache(): void {
  getDaoyuanStorage().removeItem(PORTRAIT_DRAWERS_CACHE_KEY);
}

async function fetchPortraitDrawers(): Promise<unknown> {
  const separator = PORTRAIT_DRAWERS_URL.includes("?") ? "&" : "?";
  const response = await fetch(
    `${PORTRAIT_DRAWERS_URL}${separator}t=${Date.now()}`,
    { cache: "no-store" },
  );
  if (!response.ok) {
    throw new Error(`立绘抽屉配置请求异常：${response.status}`);
  }
  return await response.json() as unknown;
}

function applyConfiguration(configuration: ThemeUiConfiguration): void {
  setThemeUiConfiguration(configuration);
  globalThis.dispatchEvent?.(
    new CustomEvent("daoyuan_portraits_changed"),
  );
}

export async function refreshPortraitDrawers(): Promise<ThemeUiConfiguration> {
  const parsed = parsePortraitDrawers(await fetchPortraitDrawers());
  try {
    writePortraitDrawersCache(parsed);
  } catch (error) {
    console.warn(
      "[道渊状态栏] 立绘抽屉配置缓存写入失败，本次继续使用远程配置:",
      error,
    );
  }
  applyConfiguration(parsed);
  return parsed;
}

export async function initializePortraitDrawers(
  options: { autoFetch?: boolean } = {},
): Promise<boolean> {
  try {
    const cached = readPortraitDrawersCache();
    if (cached) {
      applyConfiguration(cached);
      return true;
    }
  } catch (error) {
    console.warn(
      "[道渊状态栏] 立绘抽屉配置缓存无效，准备重新同步:",
      error,
    );
    clearPortraitDrawersCache();
  }

  resetThemeUiConfiguration();
  if (options.autoFetch === false) return false;

  try {
    await refreshPortraitDrawers();
    return true;
  } catch (error) {
    console.warn(
      "[道渊状态栏] 立绘抽屉配置同步失败，继续使用内置名称和图标:",
      error,
    );
    return false;
  }
}
