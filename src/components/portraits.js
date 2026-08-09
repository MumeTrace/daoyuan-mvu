import { renderDaoyuanApplause } from "./applause.js";

/* 预设的人物立绘映射表 (已转为云端加载) */
var charPortraits = window.charPortraits = {};
var charPortraitsFemale = window.charPortraitsFemale = {};
window.specialPortraits = {};
var defaultCharPortraits = window.defaultCharPortraits = {};
var defaultCharPortraitsFemale = window.defaultCharPortraitsFemale = {};
var defaultSpecialPortraits = window.defaultSpecialPortraits = {};

const PORTRAIT_CACHE_KEY = "daoyuan_portraits_cache";
const PORTRAIT_DRAWERS_CACHE_KEY = "daoyuan_portrait_drawers_cache";
const PORTRAIT_INDEX_KEY = "daoyuan_portrait_indices";
const PORTRAIT_EXPLICIT_CUSTOM_KEY = "daoyuan_explicit_custom_portraits";
const PORTRAIT_ACTIVE_POOL_KEY = "daoyuan_active_portrait_pools";
const PORTRAIT_MIGRATION_VERSION_KEY =
  "daoyuan_portrait_storage_migration_version";
const PORTRAIT_MIGRATION_VERSION = 1;
const PORTRAIT_URL =
  "https://raw.githubusercontent.com/YttriumCarbide/Daoyuan/main/portraits.json";
const PORTRAIT_DRAWERS_URL =
  "https://raw.githubusercontent.com/YttriumCarbide/Daoyuan/main/portrait-drawers.json";
const LEGACY_PORTRAIT_CUSTOM_KEYS = {
  normal: "daoyuan_custom_portraits",
  female: "daoyuan_custom_portraits_female",
  special: "daoyuan_custom_portraits_special",
};
const FALLBACK_PORTRAIT_DRAWERS = {
  schemaVersion: 1,
  pools: {
    normal: {
      name: "普通",
      icon: "常",
      order: 10,
      sourceKey: "charPortraits",
    },
    female: {
      name: "性转",
      icon: "♀",
      order: 20,
      sourceKey: "charPortraitsFemale",
    },
    special: {
      name: "心动",
      icon: "💖",
      order: 30,
      sourceKey: "specialPortraits",
    },
  },
  aliases: {},
};

let portraitDrawerConfig = window.portraitDrawerConfig =
  FALLBACK_PORTRAIT_DRAWERS;
let defaultPortraitPools = window.defaultPortraitPools = {};
let portraitPools = window.portraitPools = {};
let publishedPortraitPoolIds = window.publishedPortraitPoolIds = new Set();
if (typeof window.dyPortraitDrawerUpdateAvailable !== "boolean") {
  window.dyPortraitDrawerUpdateAvailable = false;
}
if (typeof window.dyPortraitCacheMissing !== "boolean") {
  window.dyPortraitCacheMissing = false;
}

function getPortraitStorage() {
  return window.DaoyuanStatusStorage || window.localStorage;
}

const portraitJsonReadCache = new Map();

function readCachedPortraitJson(key, fallback = {}) {
  try {
    const saved = getPortraitStorage().getItem(key);
    const cached = portraitJsonReadCache.get(key);
    if (cached && cached.raw === saved) return cached.value;
    if (!saved) {
      portraitJsonReadCache.set(key, { raw: saved, value: fallback });
      return fallback;
    }
    const parsed = JSON.parse(saved);
    const value =
      typeof parsed === "object" && parsed !== null ? parsed : fallback;
    portraitJsonReadCache.set(key, { raw: saved, value });
    return value;
  } catch (e) {
    console.warn("[道渊] 读取立绘本地数据失败:", key, e);
    return fallback;
  }
}

function readPortraitJson(key, fallback = {}) {
  try {
    const saved = getPortraitStorage().getItem(key);
    if (!saved) return fallback;
    const parsed = JSON.parse(saved);
    return typeof parsed === "object" && parsed !== null ? parsed : fallback;
  } catch (e) {
    console.warn("[道渊] 读取立绘本地数据失败:", key, e);
    return fallback;
  }
}

function writePortraitJson(key, value) {
  getPortraitStorage().setItem(key, JSON.stringify(value));
  portraitJsonReadCache.delete(key);
}

function getPortraitCustomKey(poolId) {
  return `daoyuan_custom_portraits_pool_${poolId}`;
}

function getDrawerPool(poolId) {
  return portraitDrawerConfig.pools[poolId] || null;
}

function resolvePortraitPoolId(poolId) {
  const aliases = portraitDrawerConfig.aliases || {};
  let resolved = poolId || "normal";
  const visited = new Set();
  while (aliases[resolved] && !visited.has(resolved)) {
    visited.add(resolved);
    resolved = aliases[resolved];
  }
  return portraitDrawerConfig.pools[resolved] ? resolved : "normal";
}

function parsePortraitDrawerConfig(raw) {
  const data = typeof raw === "string" ? JSON.parse(raw) : raw;
  if (!data || typeof data !== "object" || !data.pools) {
    throw new Error("立绘抽屉配置不是有效对象");
  }
  const pools = {};
  const sourceKeys = new Set();
  const orders = new Set();
  for (const [poolId, value] of Object.entries(data.pools)) {
    if (!/^[a-z][a-z0-9_-]*$/.test(poolId)) {
      throw new Error(`抽屉 ID 不合法：${poolId}`);
    }
    if (!value || typeof value !== "object") {
      throw new Error(`抽屉配置无效：${poolId}`);
    }
    const sourceKey = String(value.sourceKey || "").trim();
    if (!sourceKey || !/^[A-Za-z][A-Za-z0-9_]*$/.test(sourceKey)) {
      throw new Error(`抽屉 sourceKey 不合法：${poolId}`);
    }
    if (sourceKeys.has(sourceKey)) {
      throw new Error(`抽屉 sourceKey 重复：${sourceKey}`);
    }
    sourceKeys.add(sourceKey);
    const order = Number.isFinite(Number(value.order)) ? Number(value.order) : 999;
    if (orders.has(order)) throw new Error(`抽屉 order 重复：${order}`);
    orders.add(order);
    pools[poolId] = {
      name: String(value.name || poolId).trim() || poolId,
      icon: String(value.icon || "🖼️").trim() || "🖼️",
      order,
      sourceKey,
    };
  }
  if (!pools.normal) throw new Error("抽屉配置缺少 normal");
  const aliases = {};
  if (data.aliases && typeof data.aliases === "object") {
    for (const [oldId, newId] of Object.entries(data.aliases)) {
      if (typeof newId === "string" && pools[newId]) aliases[oldId] = newId;
    }
  }
  return {
    schemaVersion: Number(data.schemaVersion) || 1,
    pools,
    aliases,
  };
}

function getPortraitDrawerSignature(config) {
  const normalized = parsePortraitDrawerConfig(config);
  return JSON.stringify({
    schemaVersion: normalized.schemaVersion,
    pools: Object.entries(normalized.pools)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([poolId, pool]) => [poolId, pool]),
    aliases: Object.entries(normalized.aliases || {}).sort(([left], [right]) =>
      left.localeCompare(right),
    ),
  });
}

window.checkRemotePortraitDrawerUpdate = async function () {
  try {
    const response = await fetch(PORTRAIT_DRAWERS_URL + "?t=" + Date.now());
    if (!response.ok) {
      throw new Error(`抽屉配置请求异常：${response.status}`);
    }
    const remoteConfig = parsePortraitDrawerConfig(await response.text());
    window.dyPortraitDrawerUpdateAvailable =
      getPortraitDrawerSignature(remoteConfig) !==
      getPortraitDrawerSignature(portraitDrawerConfig);
  } catch (e) {
    console.warn("[道渊状态栏] 检查抽屉配置更新失败:", e);
  }
  if (typeof window.updateNoticeHeaderAttention === "function") {
    window.updateNoticeHeaderAttention();
  }
  return window.dyPortraitDrawerUpdateAvailable;
};

function normalizePortraitMap(obj) {
  if (typeof obj !== "object" || obj === null) return {};
  const result = {};
  for (const [name, value] of Object.entries(obj)) {
    if (typeof value !== "string") continue;
    const urls = value
      .split("|")
      .map((url) => url.trim())
      .filter(
        (url) => url.startsWith("http") || url.startsWith("data:image"),
      );
    if (urls.length > 0) result[name] = urls.join("|");
  }
  return result;
}

function splitPortraitUrls(value) {
  return String(value || "")
    .split("|")
    .map((url) => url.trim())
    .filter(Boolean);
}

function getDefaultPortraitValue(name, mode) {
  const poolId = resolvePortraitPoolId(mode);
  return (defaultPortraitPools[poolId] || {})[name] || "";
}

function isCyclicRotation(left, right) {
  const a = splitPortraitUrls(left);
  const b = splitPortraitUrls(right);
  if (a.length === 0 || a.length !== b.length) return false;
  return a.some((_, offset) =>
    a.every((url, index) => url === b[(index + offset) % b.length]),
  );
}

function getExplicitCustomState() {
  return readPortraitJson(PORTRAIT_EXPLICIT_CUSTOM_KEY, {});
}

function setExplicitCustom(name, mode, enabled) {
  const state = getExplicitCustomState();
  const poolId = resolvePortraitPoolId(mode);
  state[poolId] = state[poolId] || {};
  if (enabled) state[poolId][name] = true;
  else delete state[poolId][name];
  writePortraitJson(PORTRAIT_EXPLICIT_CUSTOM_KEY, state);
}

function reconcileLegacyPortraitOverrides(defaultsByMode) {
  const explicit = getExplicitCustomState();

  Object.keys(portraitDrawerConfig.pools).forEach((mode) => {
    const storageKey = getPortraitCustomKey(mode);
    const custom = normalizePortraitMap(readPortraitJson(storageKey, {}));
    const defaults = defaultsByMode[mode] || {};
    let customChanged = false;

    Object.entries(custom).forEach(([name, value]) => {
      if (explicit[mode] && explicit[mode][name]) return;
      if (defaults[name] && isCyclicRotation(value, defaults[name])) {
        delete custom[name];
        customChanged = true;
      }
    });

    if (customChanged) writePortraitJson(storageKey, custom);
  });
}

function parsePortraitCache(raw, drawers = portraitDrawerConfig) {
  if (!raw) return null;
  const data = typeof raw === "string" ? JSON.parse(raw) : raw;
  if (typeof data !== "object" || data === null) {
    throw new Error("立绘库不是有效对象");
  }
  const pools = {};
  const publishedPoolIds = [];
  for (const [poolId, config] of Object.entries(drawers.pools)) {
    pools[poolId] = normalizePortraitMap(data[config.sourceKey]);
    if (Object.keys(pools[poolId]).length > 0) {
      publishedPoolIds.push(poolId);
    }
  }
  return { raw: data, pools, publishedPoolIds };
}

function getPortraitIndexState() {
  return readPortraitJson(PORTRAIT_INDEX_KEY, {});
}

function getPortraitIndex(name, mode, length) {
  if (length <= 0) return 0;
  const savedState = readCachedPortraitJson(PORTRAIT_INDEX_KEY, {});
  const poolId = resolvePortraitPoolId(mode);
  const stored = Number((savedState[poolId] || {})[name]);
  return Number.isInteger(stored) && stored >= 0 ? stored % length : 0;
}

function setPortraitIndex(name, mode, index) {
  const state = getPortraitIndexState();
  const poolId = resolvePortraitPoolId(mode);
  state[poolId] = state[poolId] || {};
  state[poolId][name] = index;
  writePortraitJson(PORTRAIT_INDEX_KEY, state);
  notifyPortraitConsumers();
}

function getIndexedPortrait(value, name, mode) {
  const urls = splitPortraitUrls(value);
  return urls[getPortraitIndex(name, mode, urls.length)];
}

function getCustomPortraitMap(poolId) {
  return normalizePortraitMap(
    readPortraitJson(getPortraitCustomKey(resolvePortraitPoolId(poolId)), {}),
  );
}

function writeCustomPortraitMap(poolId, value) {
  const resolved = resolvePortraitPoolId(poolId);
  writePortraitJson(getPortraitCustomKey(resolved), value);
  const legacyKey = LEGACY_PORTRAIT_CUSTOM_KEYS[resolved];
  if (legacyKey) writePortraitJson(legacyKey, value);
}

function migrateLegacyPortraitStorage() {
  for (const [poolId, legacyKey] of Object.entries(
    LEGACY_PORTRAIT_CUSTOM_KEYS,
  )) {
    if (!portraitDrawerConfig.pools[poolId]) continue;
    const legacy = normalizePortraitMap(readPortraitJson(legacyKey, {}));
    const current = getCustomPortraitMap(poolId);
    const merged = { ...legacy, ...current };
    if (JSON.stringify(merged) !== JSON.stringify(current)) {
      writePortraitJson(getPortraitCustomKey(poolId), merged);
    }
  }
  const aliases = portraitDrawerConfig.aliases || {};
  const explicit = getExplicitCustomState();
  const indices = getPortraitIndexState();
  const active = readPortraitJson(PORTRAIT_ACTIVE_POOL_KEY, {});
  for (const [oldId, nextId] of Object.entries(aliases)) {
    const newId = resolvePortraitPoolId(nextId);
    const oldCustom = normalizePortraitMap(
      readPortraitJson(getPortraitCustomKey(oldId), {}),
    );
    if (Object.keys(oldCustom).length) {
      writeCustomPortraitMap(newId, {
        ...oldCustom,
        ...getCustomPortraitMap(newId),
      });
    }
    if (explicit[oldId]) {
      explicit[newId] = { ...explicit[oldId], ...(explicit[newId] || {}) };
    }
    if (indices[oldId]) {
      indices[newId] = { ...indices[oldId], ...(indices[newId] || {}) };
    }
  }
  for (const [name, poolId] of Object.entries(active)) {
    if (aliases[poolId]) active[name] = resolvePortraitPoolId(poolId);
  }
  writePortraitJson(PORTRAIT_EXPLICIT_CUSTOM_KEY, explicit);
  writePortraitJson(PORTRAIT_INDEX_KEY, indices);
  writePortraitJson(PORTRAIT_ACTIVE_POOL_KEY, active);
  getPortraitStorage().setItem(
    PORTRAIT_MIGRATION_VERSION_KEY,
    String(PORTRAIT_MIGRATION_VERSION),
  );
}

function syncLegacyPortraitGlobals() {
  defaultCharPortraits = window.defaultCharPortraits =
    defaultPortraitPools.normal || {};
  defaultCharPortraitsFemale = window.defaultCharPortraitsFemale =
    defaultPortraitPools.female || {};
  defaultSpecialPortraits = window.defaultSpecialPortraits =
    defaultPortraitPools.special || {};
  charPortraits = window.charPortraits = portraitPools.normal || {};
  charPortraitsFemale = window.charPortraitsFemale = portraitPools.female || {};
  window.specialPortraits = portraitPools.special || {};
}

function rebuildPortraitPools() {
  const next = {};
  for (const poolId of Object.keys(portraitDrawerConfig.pools)) {
    next[poolId] = {
      ...(defaultPortraitPools[poolId] || {}),
      ...getCustomPortraitMap(poolId),
    };
  }
  portraitPools = window.portraitPools = next;
  syncLegacyPortraitGlobals();
  notifyPortraitConsumers();
}

function notifyPortraitConsumers() {
  if (typeof window.bumpBeautyForumPortraitRevision === "function") {
    window.bumpBeautyForumPortraitRevision();
  }
  try {
    window.dispatchEvent(new CustomEvent("daoyuan_portraits_changed"));
  } catch (e) {}
}

function refreshPortraitAttentionState() {
  if (typeof window.updateNoticeHeaderAttention === "function") {
    window.updateNoticeHeaderAttention();
  }
}

function getCharacterPortraitStat(name) {
  let stat = {};
  try {
    stat = window.getAllVariables().stat_data || {};
  } catch (e) {}
  return (
    (stat.道侣 && stat.道侣[name]) ||
    (stat.人物 && stat.人物[name]) ||
    (stat.灵宠 && stat.灵宠[name]) ||
    (stat.绝色榜 && stat.绝色榜[name]) ||
    {}
  );
}

function getCharacterAffection(name) {
  const person = getCharacterPortraitStat(name);
  return parseFloat(
    person.亲密 || person.好感 || person.亲密度 || person.好感度 || 0,
  );
}

function isPortraitPoolVisible(name, poolId) {
  const resolved = resolvePortraitPoolId(poolId);
  if (resolved === "normal") return true;
  const hasPortrait = Boolean(getPortraitPoolValue(name, resolved));
  if (!publishedPortraitPoolIds.has(resolved) && !hasPortrait) return false;
  if (resolved === "female") return hasPortrait;
  if (resolved === "special") {
    return hasPortrait && getCharacterAffection(name) > 90;
  }
  return true;
}

function getVisiblePortraitPools(name) {
  return Object.entries(portraitDrawerConfig.pools)
    .filter(([poolId]) => isPortraitPoolVisible(name, poolId))
    .sort((left, right) => left[1].order - right[1].order);
}

function getSavedActivePortraitPool(name) {
  const state = readCachedPortraitJson(PORTRAIT_ACTIVE_POOL_KEY, {});
  const saved = state[name];
  if (!saved) return "";
  const resolved = resolvePortraitPoolId(saved);
  return isPortraitPoolVisible(name, resolved) ? resolved : "";
}

window.getActivePortraitPool = function (name, gender) {
  const saved = getSavedActivePortraitPool(name);
  if (saved) return saved;
  if (getCustomPortraitMap("normal")[name]) return "normal";
  const effectiveGender = gender || getCharacterPortraitStat(name).性别;
  if (
    effectiveGender &&
    /^女/.test(effectiveGender) &&
    isPortraitPoolVisible(name, "female")
  ) {
    return "female";
  }
  return "normal";
};

window.setActivePortraitPool = function (name, poolId) {
  const resolved = resolvePortraitPoolId(poolId);
  if (!isPortraitPoolVisible(name, resolved)) return false;
  const state = readPortraitJson(PORTRAIT_ACTIVE_POOL_KEY, {});
  state[name] = resolved;
  writePortraitJson(PORTRAIT_ACTIVE_POOL_KEY, state);
  notifyPortraitConsumers();
  return true;
};

function getPortraitPoolValue(name, poolId) {
  const resolved = resolvePortraitPoolId(poolId);
  const runtimeValue = (portraitPools[resolved] || {})[name];
  if (runtimeValue) return runtimeValue;

  const sharedRuntimeValue = (window.portraitPools?.[resolved] || {})[name];
  if (sharedRuntimeValue) return sharedRuntimeValue;

  const customValue = getCustomPortraitMap(resolved)[name];
  if (customValue) return customValue;

  const legacyCustomKey = LEGACY_PORTRAIT_CUSTOM_KEYS[resolved];
  if (legacyCustomKey) {
    const legacyCustomValue = normalizePortraitMap(
      readPortraitJson(legacyCustomKey, {}),
    )[name];
    if (legacyCustomValue) return legacyCustomValue;
  }

  const sourceKey = getDrawerPool(resolved)?.sourceKey;
  const legacyRuntimeValue = sourceKey
    ? normalizePortraitMap(window[sourceKey])[name]
    : "";
  if (legacyRuntimeValue) return legacyRuntimeValue;

  return (
    (defaultPortraitPools[resolved] || {})[name] ||
    (window.defaultPortraitPools?.[resolved] || {})[name] ||
    ""
  );
}

function renderPortraitDrawerIcon(icon) {
  if (/^https?:\/\//i.test(icon)) {
    const image = document.createElement("img");
    image.className = "portrait-pool-icon-image";
    image.src = icon;
    image.alt = "";
    return image;
  }
  const span = document.createElement("span");
  span.className = "portrait-pool-icon-text";
  span.textContent = icon;
  return span;
}

function refreshVisiblePortraitSearch() {
  const input = document.getElementById("portrait-search-input");
  const result = document.getElementById("portrait-search-result");
  if (
    input &&
    input.value.trim() &&
    result &&
    result.style.display !== "none" &&
    typeof window.searchAndShowPortrait === "function"
  ) {
    window.searchAndShowPortrait();
  }
}

async function syncRemotePortraitCaches() {
  const cacheBust = "?t=" + Date.now();
  const fetchText = async (url, label) => {
    const response = await fetch(url + cacheBust);
    if (!response.ok) throw new Error(`${label}请求异常：${response.status}`);
    return response.text();
  };
  const [portraitResult, drawerResult] = await Promise.allSettled([
    fetchText(PORTRAIT_URL, "立绘库"),
    fetchText(PORTRAIT_DRAWERS_URL, "抽屉配置"),
  ]);

  let nextDrawers = portraitDrawerConfig;
  let drawerUpdated = false;
  let portraitUpdated = false;
  const errors = [];

  if (drawerResult.status === "fulfilled") {
    try {
      nextDrawers = parsePortraitDrawerConfig(drawerResult.value);
      getPortraitStorage().setItem(
        PORTRAIT_DRAWERS_CACHE_KEY,
        JSON.stringify(nextDrawers),
      );
      drawerUpdated = true;
    } catch (e) {
      errors.push("抽屉配置：" + e.message);
    }
  } else {
    errors.push("抽屉配置：" + drawerResult.reason.message);
  }

  if (portraitResult.status === "fulfilled") {
    try {
      const incoming = parsePortraitCache(portraitResult.value, nextDrawers);
      const portraitCount = Object.values(incoming.pools).reduce(
        (total, pool) => total + Object.keys(pool).length,
        0,
      );
      if (portraitCount === 0) {
        throw new Error("远程立绘库为空或格式不正确");
      }
      getPortraitStorage().setItem(
        PORTRAIT_CACHE_KEY,
        JSON.stringify(incoming.raw),
      );
      portraitUpdated = true;
    } catch (e) {
      errors.push("立绘库：" + e.message);
    }
  } else {
    errors.push("立绘库：" + portraitResult.reason.message);
  }

  if (!portraitUpdated && !drawerUpdated) {
    throw new Error(errors.join("；"));
  }

  return { portraitUpdated, drawerUpdated, errors };
}

window.loadRemotePortraits = async function (options = {}) {
  const { autoFetch = true, suppressPrompt = false } = options;
  let hasCache = false;
  try {
    const cachedDrawers = getPortraitStorage().getItem(
      PORTRAIT_DRAWERS_CACHE_KEY,
    );
    portraitDrawerConfig = window.portraitDrawerConfig = cachedDrawers
      ? parsePortraitDrawerConfig(cachedDrawers)
      : parsePortraitDrawerConfig(FALLBACK_PORTRAIT_DRAWERS);
  } catch (e) {
    console.warn("[道渊状态栏] 读取立绘抽屉缓存失败，使用内置配置:", e);
    portraitDrawerConfig = window.portraitDrawerConfig =
      parsePortraitDrawerConfig(FALLBACK_PORTRAIT_DRAWERS);
  }

  try {
    const cached = getPortraitStorage().getItem(PORTRAIT_CACHE_KEY);
    if (cached) {
      const parsed = parsePortraitCache(cached);
      defaultPortraitPools = window.defaultPortraitPools = parsed.pools;
      publishedPortraitPoolIds = window.publishedPortraitPoolIds = new Set(
        parsed.publishedPoolIds,
      );
      migrateLegacyPortraitStorage();
      reconcileLegacyPortraitOverrides(defaultPortraitPools);
      rebuildPortraitPools();
      console.log("[道渊状态栏] 本地缓存立绘配置加载成功");
      window.dyPortraitCacheMissing = false;
      refreshPortraitAttentionState();
      hasCache = true;
    }
  } catch (e) {
    console.error("[道渊状态栏] 读取本地立绘缓存失败:", e);
    window.dyPortraitCacheMissing = true;
    refreshPortraitAttentionState();
  }

  if (!hasCache && autoFetch) {
    try {
      const syncResult = await syncRemotePortraitCaches();
      return window.loadRemotePortraits({
        autoFetch: false,
        suppressPrompt: syncResult.portraitUpdated,
      });
    } catch (e) {
      console.warn("[道渊状态栏] 首次自动同步立绘失败，等待手动同步:", e);
      window.dyPortraitCacheMissing = true;
      refreshPortraitAttentionState();
    }
  }

  if (!hasCache) {
    const hasPrompted = getPortraitStorage().getItem(
      "daoyuan_portraits_prompted",
    );
    if (!hasPrompted && !suppressPrompt) {
      getPortraitStorage().setItem("daoyuan_portraits_prompted", "1");
      setTimeout(() => {
        const pm = document.createElement("div");
        pm.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);z-index:999999;display:flex;justify-content:center;align-items:center;backdrop-filter:blur(5px);";
        pm.innerHTML = `
          <div style="background:linear-gradient(145deg,rgba(25,20,30,0.95),rgba(15,10,15,0.98));border:1px solid var(--accent-gold);border-radius:12px;width:80%;max-width:350px;padding:25px;box-shadow:0 0 40px rgba(255,215,0,0.2);text-align:center;animation:fadeIn 0.3s ease;">
            <div style="color:var(--accent-gold);font-size:1.3em;font-weight:bold;margin-bottom:15px;letter-spacing:1px;">✨ 欢迎使用道渊状态栏</div>
            <div style="color:var(--text-main);font-size:0.95em;line-height:1.6;margin-bottom:20px;">
              检测到您是首次加载，本地尚未缓存角色立绘。<br><br>
              <span style="color:var(--text-dim);font-size:0.9em;">系统已尝试自动同步。若当前网络未拉取成功，<br>请点击下方按钮手动同步最新立绘库！</span>
            </div>
            <div style="display:flex;flex-direction:column;gap:10px;">
              <button id="dy-prompt-sync-btn" style="padding:10px 20px;background:linear-gradient(145deg, rgba(100,180,255,0.15), rgba(100,180,255,0.05));border:1px solid rgba(100,180,255,0.4);border-radius:24px;color:#64b4ff;cursor:pointer;font-size:1em;font-weight:bold;transition:all 0.3s ease;box-shadow:0 2px 15px rgba(100,180,255,0.1);">
                🖼️ 立即手动同步
              </button>
              <button id="dy-prompt-close-btn" style="padding:8px 20px;background:transparent;border:none;color:var(--text-dim);cursor:pointer;font-size:0.9em;text-decoration:underline;">
                稍后再说 (也可在公告栏中同步)
              </button>
            </div>
          </div>
        `;
        document.body.appendChild(pm);
        document.getElementById("dy-prompt-close-btn").onclick = () => pm.remove();
        document.getElementById("dy-prompt-sync-btn").onclick = function() {
          if (window.forceUpdateRemotePortraits) {
            window.forceUpdateRemotePortraits(this).then(() => {
              setTimeout(() => pm.remove(), 1000);
            });
          }
        };
      }, 1000); // 延迟 1 秒弹出，避免阻塞页面渲染
    }
  }
  if (!hasCache) {
    migrateLegacyPortraitStorage();
    defaultPortraitPools = window.defaultPortraitPools = {};
    publishedPortraitPoolIds = window.publishedPortraitPoolIds = new Set();
    rebuildPortraitPools();
    window.dyPortraitCacheMissing = true;
    refreshPortraitAttentionState();
  }
  return hasCache;
};

window.forceUpdateRemotePortraits = async function (btnElement) {
  if (btnElement) {
    btnElement.innerHTML = "🔄 正在同步...";
    btnElement.style.opacity = "0.7";
    btnElement.style.pointerEvents = "none";
  }
  const showToast = (msg, isSuccess) => {
    let t = document.getElementById("dy-sync-toast");
    if (t) t.remove();
    t = document.createElement("div");
    t.id = "dy-sync-toast";
    const color = isSuccess ? "#64ff8a" : "var(--accent-blood, #ff4d4d)";
    t.style.cssText = `position:fixed;top:50%;left:50%;transform:translate(-50%, -50%) scale(0.9);background:linear-gradient(145deg,rgba(25,25,30,0.98),rgba(15,15,20,0.98));border:1px solid ${color};border-radius:12px;padding:20px 35px;color:var(--text-main, #dcdde1);z-index:9999999;box-shadow:0 10px 40px ${isSuccess ? 'rgba(100,255,138,0.2)' : 'rgba(255,77,77,0.3)'};text-align:center;pointer-events:none;opacity:0;transition:all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);letter-spacing:1px;font-size:1.1em;font-weight:bold;white-space:nowrap;`;
    t.innerHTML = `<span style="font-size:1.3em;margin-right:10px;">${isSuccess ? '✅' : '❌'}</span><span style="color:${color};">${msg}</span>`;
    document.body.appendChild(t);
    requestAnimationFrame(() => {
      t.style.opacity = "1";
      t.style.transform = "translate(-50%, -50%) scale(1)";
    });
    setTimeout(() => {
      t.style.opacity = "0";
      t.style.transform = "translate(-50%, -50%) scale(0.9)";
      setTimeout(() => t.remove(), 300);
    }, 2500);
  };
  try {
    const { portraitUpdated, drawerUpdated, errors } =
      await syncRemotePortraitCaches();
    const loaded = await window.loadRemotePortraits({
      autoFetch: false,
      suppressPrompt: true,
    });
    if (!loaded && portraitUpdated) {
      throw new Error("新版立绘库写入后无法重新加载");
    }
    if (typeof window.populateCharacterData === "function") {
      window.populateCharacterData();
    }
    refreshVisiblePortraitSearch();
    if (drawerUpdated) {
      window.dyPortraitDrawerUpdateAvailable = false;
      if (typeof window.updateNoticeHeaderAttention === "function") {
        window.updateNoticeHeaderAttention();
      }
    }
    if (portraitUpdated && drawerUpdated) {
      showToast("立绘库与抽屉配置同步成功！", true);
    } else if (portraitUpdated) {
      showToast("立绘库已更新，抽屉配置沿用本地缓存", true);
    } else {
      showToast("抽屉配置已更新，立绘库沿用本地缓存", true);
    }
    if (errors.length) console.warn("[道渊状态栏] 部分同步失败:", errors);
  } catch (e) {
    console.error("[道渊状态栏] 手动同步立绘失败:", e);
    showToast("同步失败，已保留本地缓存：" + e.message, false);
  } finally {
    if (btnElement) {
      btnElement.innerHTML = "🖼️ 同步最新立绘库";
      btnElement.style.opacity = "1";
      btnElement.style.pointerEvents = "auto";
    }
  }
};

window.preloadPortraits = function (name) {
  const urls = [];
  for (const poolId of Object.keys(portraitDrawerConfig.pools)) {
    splitPortraitUrls(getPortraitPoolValue(name, poolId)).forEach((url) =>
      urls.push(url),
    );
  }
  urls.forEach((u) => {
    if (!window.dy_preloaded) {
      window.dy_preloaded = {};
    }
    if (u && !window.dy_preloaded[u]) {
      let img = new Image();
      img.src = u;
      window.dy_preloaded[u] = true;
    }
  });
};
$(document).on(
  "click",
  ".partner-header, .npc-header, .portrait-toggle-btn",
  function () {
    let card = $(this).closest(
      "[data-partner], [data-npc], [data-pet], [data-beauty]",
    );
    if (card.length) {
      let n =
        card.attr("data-partner") ||
        card.attr("data-npc") ||
        card.attr("data-pet") ||
        card.attr("data-beauty");
      if (n) window.preloadPortraits(n);
    }
  },
);
window.updatePortraitView = function (name, newSrc) {
  const portraitSrc = String(newSrc || "").trim();
  document
    .querySelectorAll(
      `[data-partner='${name}'], [data-npc='${name}'], [data-pet='${name}'], [data-beauty='${name}']`,
    )
    .forEach((c) => {
      const p = c.querySelector(".large-portrait");
      const btn = c.querySelector(".portrait-toggle-btn");
      if (!p) return;

      p.classList.remove("show");
      p.replaceChildren();
      if (!portraitSrc) {
        p.style.cssText =
          "display:none;align-items:center;justify-content:center;min-height:100px;color:var(--text-dim);font-size:0.85em;";
        p.textContent = "点击「🎨 自定义」上传本地图片";
        if (btn) {
          btn.innerHTML = "暂无立绘";
          btn.style.opacity = "0.75";
          btn.title = "配置或获取角色立绘";
          btn.onclick = function (event) {
            event.stopPropagation();
            window.showMissingPortraitDialog(
              name,
              window.getActivePortraitPool(name),
            );
          };
        }
        return;
      }

      p.removeAttribute("style");
      const img = document.createElement("img");
      img.alt = name;
      img.dataset.src = portraitSrc;
      p.appendChild(img);
      if (btn) {
        btn.innerHTML = "查看立绘 ▼";
        btn.style.opacity = "";
        btn.title = "";
        btn.onclick = function (event) {
          event.stopPropagation();
          const currentImg = p.querySelector("img");
          if (currentImg && !currentImg.src) {
            currentImg.src = currentImg.dataset.src;
          }
          p.classList.toggle("show");
          btn.innerHTML = p.classList.contains("show")
            ? "收起立绘 ▲"
            : "查看立绘 ▼";
        };
      }
      img.onload = () => {
        p.classList.add("show");
        if (btn) btn.innerHTML = "收起立绘 ▲";
        img.onload = null;
      };
      img.onerror = () => {
        p.classList.add("show");
        if (btn) btn.innerHTML = "收起立绘 ▲";
        img.src =
          "https://via.placeholder.com/400x600/1a181d/ff4d4d?text=加载失败";
        img.onerror = null;
      };
      img.src = portraitSrc;
    });
  let listItem = document.querySelector(
    `.wx-list-item[data-name='${name}'] img.portrait-img`,
  );
  if (listItem) {
    const listSrc =
      portraitSrc || "https://via.placeholder.com/50/000000/FFFFFF/?text=?";
    listItem.src = listSrc;
    listItem.dataset.src = listSrc;
  }
  if (window.currentActiveChat === name) {
    let bg = document.getElementById("wx-chat-bg");
    if (bg) {
      bg.style.backgroundImage = portraitSrc ? `url('${portraitSrc}')` : "none";
      if (!portraitSrc) bg.style.backgroundColor = "#0a0a0f";
    }
  }
};
window.showSpecialPortrait = function (name) {
  const target =
    window.getActivePortraitPool(name) === "special" ? "normal" : "special";
  return window.selectPortraitPool(name, target);
};
window.switchPortraitInPool = function (name, poolId) {
  poolId = resolvePortraitPoolId(poolId);
  const urls = splitPortraitUrls(getPortraitPoolValue(name, poolId));
  let done = false;
  if (urls.length >= 2) {
    const card = document.querySelector(
      `[data-partner='${name}'], [data-npc='${name}'], [data-pet='${name}'], [data-beauty='${name}']`,
    );
    const image = card ? card.querySelector(".large-portrait img") : null;
    const currentUrl = image ? image.dataset.src : "";
    let currentIndex = urls.indexOf(currentUrl);
    if (currentIndex < 0) currentIndex = getPortraitIndex(name, poolId, urls.length);
    const nextIndex = (currentIndex + 1) % urls.length;
    setPortraitIndex(name, poolId, nextIndex);
    window.updatePortraitView(name, urls[nextIndex]);
    notifyPortraitConsumers();
    done = true;
  }
  if (!done) {
    if (!document.getElementById("dy-portrait-toast")) {
      let t = document.createElement("div");
      t.id = "dy-portrait-toast";
      t.style.cssText = "position:fixed;top:80px;left:50%;transform:translateX(-50%);background:linear-gradient(145deg,rgba(25,10,15,0.95),rgba(15,5,10,0.98));border:1px solid var(--accent-blood);border-radius:10px;padding:12px 25px;color:var(--text-main);z-index:9999999;box-shadow:0 5px 20px rgba(255,77,77,0.3);text-align:center;pointer-events:none;opacity:0;transition:opacity 0.3s;letter-spacing:1px;";
      t.innerHTML = '<span style="color:var(--accent-blood);font-weight:bold;font-size:1.1em;">⚠️ 当前状态没有可替换的立绘</span><br><span style="font-size:0.85em;color:var(--text-dim);">需配置多张图片才能进行轮切哦</span>';
      document.body.appendChild(t);
      requestAnimationFrame(() => (t.style.opacity = "1"));
      setTimeout(() => {
        t.style.opacity = "0";
        setTimeout(() => t.remove(), 300);
      }, 2500);
    }
  }
  return done;
};
window.switchPortrait = function (name) {
  const person = getCharacterPortraitStat(name);
  const poolId = window.getActivePortraitPool(name, person.性别);
  return window.switchPortraitInPool(name, poolId);
};
window.toggleFemalePortrait = function (name) {
  const target =
    window.getActivePortraitPool(name) === "female" ? "normal" : "female";
  return window.selectPortraitPool(name, target);
};
window.executeShowLoreByName = async function (name) {
  let t = document.getElementById("faction-modal-title");
  let n = document.getElementById("faction-modal-note");
  let o = document.getElementById("faction-modal-overlay");
  if (!t || !n || !o) return;
  t.textContent = "🔮 正在探查【" + name + "】的天机...";
  n.innerHTML =
    '<div style="color:var(--accent-mana);text-align:center;padding:20px;">正在翻阅世界书，请稍候...</div>';
  o.style.display = "flex";
  try {
    if (typeof window.getLorebookEntries != "function") {
      n.innerHTML =
        '<span style="color:var(--accent-blood);">当前环境不支持世界书接口。</span>';
      return;
    }
    let lbs = new Set();
    if (typeof window.getOrCreateChatLorebook == "function") {
      try {
        let b = await window.getOrCreateChatLorebook();
        if (b) lbs.add(b);
      } catch (e) {}
    }
    if (typeof window.getCurrentCharPrimaryLorebook == "function") {
      try {
        let b = await window.getCurrentCharPrimaryLorebook();
        if (b) lbs.add(b);
      } catch (e) {}
    }
    if (typeof window.getCharLorebooks == "function") {
      try {
        let b = await window.getCharLorebooks({ name: name });
        if (b) b.forEach((x) => lbs.add(x));
      } catch (e) {}
    }
    let content = "";
    for (let lb of lbs) {
      try {
        let entries = await window.getLorebookEntries(lb, {
          fields: ["comment", "key", "content"],
        });
        if (entries) {
          let match = entries.find(
            (e) =>
              (e.key &&
                e.key.some((k) => k.toLowerCase() === name.toLowerCase())) ||
              (e.comment && e.comment.includes(name)),
          );
          if (match && match.content) {
            content = match.content;
            break;
          }
        }
      } catch (e) {}
    }
    if (content) {
      t.textContent = "✨【" + name + "】· 天机命理";
      n.innerHTML =
        '<div style="text-align:left;white-space:pre-wrap;line-height:1.6;color:#dcdde1;max-height:60vh;overflow-y:auto;padding-right:5px;">' +
        content.replace(/&/g, "&").replace(/</g, "<").replace(/>/g, ">") +
        "</div>";
    } else {
      t.textContent = "❌【" + name + "】";
      n.innerHTML =
        '<div style="text-align:center;padding:20px;color:var(--text-dim);">天机迷雾遮掩，未能在世界书中探查到此人的命理。</div>';
    }
  } catch (err) {
    t.textContent = "❌ 探查失败";
    n.innerHTML = err.message;
  }
};
window.showLoreByName = function (name) {
  let stat = {};
  try {
    stat = window.getAllVariables().stat_data || {};
  } catch (e) {}
  let hn = stat.主角 && stat.主角.姓名 ? stat.主角.姓名 : "unknown";
  let wk = "dy_lore_warn_" + hn;
  if (localStorage.getItem(wk) === "1") {
    window.executeShowLoreByName(name);
    return;
  }
  let wm = document.getElementById("lore-warn-modal");
  if (!wm) {
    wm = document.createElement("div");
    wm.id = "lore-warn-modal";
    wm.style.cssText =
      "display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);z-index:100000;justify-content:center;align-items:center;backdrop-filter:blur(5px);";
    wm.innerHTML =
      '<div style="background:linear-gradient(145deg,rgba(30,10,10,0.95),rgba(15,5,5,0.98));border:1px solid var(--accent-blood);border-radius:12px;width:80%;max-width:320px;padding:25px;box-shadow:0 0 40px rgba(255,77,77,0.4);text-align:center;position:relative;animation:fadeIn 0.2s ease;"><div style="color:var(--accent-blood);font-size:1.3em;font-weight:bold;margin-bottom:15px;text-shadow:0 0 10px rgba(255,77,77,0.5);letter-spacing:2px;">⚠️ 查看角色设定</div><div style="color:var(--text-main);font-size:1em;line-height:1.6;margin-bottom:20px;">注意！查看此角色的设定可能会包含<span style="color:var(--accent-exp);font-weight:bold;text-shadow:0 0 5px rgba(255,159,67,0.5);">【剧透内容】</span>。<br>提前了解设定可能会降低剧情探索的乐趣。<br><br><span style="color:var(--text-dim);font-size:0.9em;">是否确定要查看？</span></div><label style="display:flex;align-items:center;justify-content:center;gap:8px;color:var(--text-dim);font-size:0.85em;cursor:pointer;margin-bottom:6px;"><input type="checkbox" id="lore-warn-cb" style="accent-color:var(--accent-blood);width:16px;height:16px;cursor:pointer;"><span>不再提示 (当前角色档案)</span></label><div style="font-size:0.75em;color:var(--accent-mana);margin-bottom:20px;opacity:0.8;">注：如果修改了主角姓名，此提示会重新出现。</div><div style="display:flex;gap:15px;justify-content:center;"><button id="lore-warn-no" style="flex:1;background:rgba(255,255,255,0.1);color:var(--text-dim);border:1px solid rgba(255,255,255,0.2);padding:10px;border-radius:6px;cursor:pointer;font-weight:bold;transition:all 0.2s;" onmouseover="this.style.background=\'rgba(255,255,255,0.2)\'" onmouseout="this.style.background=\'rgba(255,255,255,0.1)\'">取消</button><button id="lore-warn-yes" style="flex:1;background:linear-gradient(135deg,#c0392b,#e74c3c);color:#fff;border:none;padding:10px;border-radius:6px;cursor:pointer;font-weight:bold;box-shadow:0 2px 10px rgba(255,77,77,0.4);transition:all 0.2s;" onmouseover="this.style.transform=\'scale(1.05)\'" onmouseout="this.style.transform=\'scale(1)\';">确定查看</button></div></div>';
    document.body.appendChild(wm);
  }
  wm.style.display = "flex";
  document.getElementById("lore-warn-cb").checked = false;
  document.getElementById("lore-warn-no").onclick = function () {
    wm.style.display = "none";
  };
  document.getElementById("lore-warn-yes").onclick = function () {
    if (document.getElementById("lore-warn-cb").checked) {
      localStorage.setItem(wk, "1");
    }
    wm.style.display = "none";
    window.executeShowLoreByName(name);
  };
};
window.injectLoreClicks = function () {
  document
    .querySelectorAll(".partner-card[data-partner] .partner-name")
    .forEach((el) => {
      if (el.dataset.loreBound) return;
      el.dataset.loreBound = "true";
      el.style.cursor = "pointer";
      el.style.color = "var(--accent-gold)";
      el.title = "点击探查天机";
      let n = el.closest("[data-partner]").dataset.partner;
      el.onclick = function (e) {
        e.stopPropagation();
        window.showLoreByName(n);
      };
    });
  document.querySelectorAll(".npc-card[data-npc] .npc-name").forEach((el) => {
    if (el.dataset.loreBound) return;
    el.dataset.loreBound = "true";
    el.style.cursor = "pointer";
    el.style.color = "var(--accent-gold)";
    el.title = "点击探查天机";
    let n = el.closest("[data-npc]").dataset.npc;
    el.onclick = function (e) {
      e.stopPropagation();
      window.showLoreByName(n);
    };
  });
  document
    .querySelectorAll(".partner-card[data-pet] .partner-name")
    .forEach((el) => {
      if (el.dataset.loreBound) return;
      el.dataset.loreBound = "true";
      el.style.cursor = "pointer";
      el.style.color = "var(--accent-gold)";
      el.title = "点击探查天机";
      let n = el.closest("[data-pet]").dataset.pet;
      el.onclick = function (e) {
        e.stopPropagation();
        window.showLoreByName(n);
      };
    });
  document.querySelectorAll(".info-card[data-beauty]").forEach((card) => {
    let el = card.querySelector(".info-title span:first-child");
    if (!el || el.dataset.loreBound) return;
    el.dataset.loreBound = "true";
    el.style.cursor = "pointer";
    el.title = "点击探查天机";
    let n = card.dataset.beauty;
    el.onclick = function (e) {
      e.stopPropagation();
      window.showLoreByName(n);
    };
  });
};
window.searchAndShowPortrait = function () {
  let k = document.getElementById("portrait-search-input").value.trim();
  let r = document.getElementById("portrait-search-result");
  if (!k) {
    r.style.display = "none";
    return;
  }
  let all = new Set();
  Object.values(portraitPools).forEach((pool) =>
    Object.keys(pool).forEach((name) => all.add(name)),
  );
  let allArr = Array.from(all);
  let matched =
    k === "随机"
      ? [allArr[Math.floor(Math.random() * allArr.length)]]
      : allArr.filter((x) => x.includes(k));
  if (matched.length === 0) {
    r.style.display = "block";
    r.innerHTML =
      '<div style="color:var(--accent-blood);text-align:center;padding:10px;">未找到包含【' +
      k +
      "】的立绘记录。</div>";
    return;
  }
  let stat = {};
  try {
    stat = window.getAllVariables().stat_data || {};
  } catch (e) {}
  let html = "";
  matched.forEach((n) => {
    let p =
      (stat.道侣 && stat.道侣[n]) ||
      (stat.人物 && stat.人物[n]) ||
      (stat.灵宠 && stat.灵宠[n]) ||
      (stat.绝色榜 && stat.绝色榜[n]) ||
      {};
    let pUrl = "";
    if (typeof window.getPortraitUrl === "function")
      pUrl = window.getPortraitUrl(n, p.性别);
    if (!pUrl) {
      const poolId = window.getActivePortraitPool(n, p.性别);
      pUrl = getIndexedPortrait(getPortraitPoolValue(n, poolId), n, poolId);
    }
    const hasPortrait = Boolean(pUrl);
    let safeN = String(n).replace(/"/g, '"');
    html +=
      '<div class="info-card" data-beauty="' +
      safeN +
      '" style="border-color:rgba(217,128,250,0.5);background:rgba(0,0,0,0.4);margin-bottom:10px;box-shadow:inset 0 0 10px rgba(217,128,250,0.1);"><div class="info-title"><span style="color:var(--rare-text);cursor:pointer;text-decoration:none;" onclick="event.stopPropagation(); window.showLoreByName(\'' +
      safeN +
      '\');" title="点击探查天机">' +
      safeN +
      '</span><span style="font-size:0.8em;color:var(--text-dim)">查阅结果</span></div><div class="portrait-wrapper"><div class="portrait-actions">' +
      (hasPortrait
        ? '<div class="portrait-toggle-btn" onclick="const px=this.parentElement.nextElementSibling;const img=px.querySelector(\'img\');if(!img.src){img.src=img.dataset.src;}px.classList.toggle(\'show\');this.innerHTML=px.classList.contains(\'show\')?\'收起立绘 ▲\':\'查看立绘 ▼\';">查看立绘 ▼</div>'
        : '<div class="portrait-toggle-btn" style="opacity:0.75;" onclick="event.stopPropagation(); window.showMissingPortraitDialog(\'' +
          safeN +
          '\');" title="配置或获取角色立绘">暂无立绘</div>') +
      '<div class="portrait-custom-btn" onclick="event.stopPropagation(); window.openCustomPortraitDialog(\'' +
      safeN +
      '\');" title="设置立绘">🎨</div><div class="portrait-custom-btn" onclick="event.stopPropagation(); window.switchPortrait(\'' +
      safeN +
      '\');" title="切换立绘">🔄</div>' +
      renderDaoyuanApplause(n) +
      '</div>' +
      (hasPortrait
        ? '<div class="large-portrait"><img data-src="' +
          pUrl +
          '" alt="' +
          safeN +
          '"></div>'
        : '<div class="large-portrait" style="display:none;align-items:center;justify-content:center;min-height:100px;color:var(--text-dim);font-size:0.85em;">点击「🎨 自定义」上传本地图片</div>') +
      '</div></div>';
  });
  r.innerHTML = html;
  r.style.display = "block";
  if (window.injectPortraitDrawers) window.injectPortraitDrawers();
};
window.selectPortraitPool = function (name, poolId) {
  const resolved = resolvePortraitPoolId(poolId);
  if (!window.setActivePortraitPool(name, resolved)) return false;
  const value = getPortraitPoolValue(name, resolved);
  if (!value) {
    window.updatePortraitView(name, "");
    window.showMissingPortraitDialog(name, resolved);
    window.injectPortraitDrawers();
    return false;
  }
  window.updatePortraitView(
    name,
    getIndexedPortrait(value, name, resolved) || "",
  );
  window.injectPortraitDrawers();
  return true;
};

window.injectPortraitDrawers = function () {
  document.querySelectorAll(".portrait-wrapper").forEach((wrapper) => {
    const card = wrapper.closest(
      "[data-partner], [data-npc], [data-pet], [data-beauty]",
    );
    if (!card) return;
    const name =
      card.dataset.partner ||
      card.dataset.npc ||
      card.dataset.pet ||
      card.dataset.beauty;
    const actions = wrapper.querySelector(".portrait-actions");
    if (!actions || !name) return;
    actions
      .querySelectorAll(".btn-heart, .btn-gender, .portrait-pool-selector")
      .forEach((element) => element.remove());

    const person = getCharacterPortraitStat(name);
    const activePool = window.getActivePortraitPool(name, person.性别);
    const activeConfig = getDrawerPool(activePool) || getDrawerPool("normal");
    const selector = document.createElement("div");
    selector.className = "portrait-pool-selector";

    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "portrait-pool-toggle";
    toggle.title = "选择立绘卡池";
    toggle.setAttribute("aria-haspopup", "menu");
    toggle.setAttribute("aria-expanded", "false");
    toggle.appendChild(renderPortraitDrawerIcon(activeConfig.icon));
    const label = document.createElement("span");
    label.className = "portrait-pool-toggle-label";
    label.textContent = activeConfig.name;
    toggle.appendChild(label);
    const arrow = document.createElement("span");
    arrow.className = "portrait-pool-arrow";
    arrow.textContent = "▾";
    toggle.appendChild(arrow);

    const menu = document.createElement("div");
    menu.className = "portrait-pool-menu";
    menu.setAttribute("role", "menu");
    getVisiblePortraitPools(name).forEach(([poolId, config]) => {
      const item = document.createElement("button");
      item.type = "button";
      item.className = "portrait-pool-option";
      item.setAttribute("role", "menuitem");
      item.dataset.poolId = poolId;
      if (poolId === activePool) item.classList.add("is-active");
      item.appendChild(renderPortraitDrawerIcon(config.icon));
      const itemLabel = document.createElement("span");
      itemLabel.textContent = config.name;
      item.appendChild(itemLabel);
      item.onclick = function (event) {
        event.stopPropagation();
        window.selectPortraitPool(name, poolId);
      };
      menu.appendChild(item);
    });

    toggle.onclick = function (event) {
      event.stopPropagation();
      const willOpen = !selector.classList.contains("is-open");
      document
        .querySelectorAll(".portrait-pool-selector.is-open")
        .forEach((other) => {
          if (other !== selector) {
            other.classList.remove("is-open");
            const otherCard = other.closest(
              ".info-card, .partner-card, .npc-card",
            );
            if (otherCard) otherCard.classList.remove("portrait-pool-open");
            const otherBody = other.closest(".card-collapse-body");
            if (otherBody) {
              otherBody.classList.remove("portrait-pool-body-open");
            }
          }
        });
      const largePortrait = wrapper.querySelector(".large-portrait");
      selector.classList.toggle(
        "opens-up",
        willOpen && !largePortrait?.classList.contains("show"),
      );
      selector.classList.toggle("is-open", willOpen);
      card.classList.toggle("portrait-pool-open", willOpen);
      const collapseBody = selector.closest(".card-collapse-body");
      if (collapseBody) {
        collapseBody.classList.toggle("portrait-pool-body-open", willOpen);
      }
      toggle.setAttribute("aria-expanded", String(willOpen));
    };
    selector.append(toggle, menu);
    actions.appendChild(selector);
  });
};

window.injectHeartButtons = window.injectPortraitDrawers;

if (!window.__daoyuanPortraitDrawerCloseBound) {
  window.__daoyuanPortraitDrawerCloseBound = true;
  document.addEventListener("click", () => {
    document
      .querySelectorAll(".portrait-pool-selector.is-open")
      .forEach((selector) => {
        selector.classList.remove("is-open");
        const card = selector.closest(".info-card, .partner-card, .npc-card");
        if (card) card.classList.remove("portrait-pool-open");
        const collapseBody = selector.closest(".card-collapse-body");
        if (collapseBody) {
          collapseBody.classList.remove("portrait-pool-body-open");
        }
        selector.classList.remove("opens-up");
        const toggle = selector.querySelector(".portrait-pool-toggle");
        if (toggle) toggle.setAttribute("aria-expanded", "false");
      });
  });
}

/* 获取立绘URL（支持多图切换和玉简同步） */
window.getPortraitUrl = function (name, gender) {
  const poolId = window.getActivePortraitPool(name, gender);
  const value = getPortraitPoolValue(name, poolId);
  return value ? getIndexedPortrait(value, name, poolId) : undefined;
};

/* 保存自定义立绘到 localStorage */
window.saveCustomPortrait = function (name, url, mode = "normal") {
  try {
    const poolId = resolvePortraitPoolId(mode);
    if (!getDrawerPool(poolId)) throw new Error("未知立绘类型：" + mode);
    const normalizedUrl = splitPortraitUrls(url).join("|");
    const normalizedDefault = splitPortraitUrls(
      getDefaultPortraitValue(name, poolId),
    ).join("|");
    if (normalizedDefault && normalizedUrl === normalizedDefault) {
      console.log(
        "[道渊] 保存内容与云端默认立绘一致，继续跟随云端:",
        name,
        poolId,
      );
      return window.removeCustomPortrait(name, poolId);
    }

    const customPortraits = getCustomPortraitMap(poolId);
    customPortraits[name] = normalizedUrl;
    const dataStr = JSON.stringify(customPortraits);
    if (
      normalizedUrl &&
      normalizedUrl.startsWith("data:") &&
      normalizedUrl.length > 2 * 1024 * 1024
    ) {
      console.warn(
        "[道渊] 单张立绘过大(" +
          (normalizedUrl.length / 1024 / 1024).toFixed(1) +
          "MB)，建议压缩图片或使用图床",
      );
    }
    if (dataStr.length > 3 * 1024 * 1024) {
      alert(
        "⚠️ 立绘数据过大（" +
          (dataStr.length / 1024 / 1024).toFixed(1) +
          "MB），已接近localStorage上限(5MB)。建议使用图床URL而非本地图片，或删除部分自定义立绘。",
      );
    }
    if (dataStr.length > 4.5 * 1024 * 1024) {
      alert(
        "⚠️ 立绘数据超过4.5MB，localStorage可能无法保存！请立即使用图床URL替代本地图片。",
      );
      return false;
    }
    writeCustomPortraitMap(poolId, customPortraits);
    setExplicitCustom(name, poolId, true);
    setPortraitIndex(name, poolId, 0);
    portraitPools[poolId] = portraitPools[poolId] || {};
    portraitPools[poolId][name] = normalizedUrl;
    syncLegacyPortraitGlobals();
    window.setActivePortraitPool(name, poolId);
    if (typeof window.populateCharacterData === "function") {
      window.populateCharacterData();
    }
    refreshVisiblePortraitSearch();
    window.updatePortraitView(name, splitPortraitUrls(normalizedUrl)[0] || "");
    notifyPortraitConsumers();
    return true;
  } catch (e) {
    console.warn("[道渊] 保存自定义立绘失败:", e);
    if (e.name === "QuotaExceededError") {
      alert(
        "⚠️ 存储空间不足！本地图片过多，请使用图床URL（如 catbox.moe）替代，或删除一些不需要的自定义立绘。",
      );
    } else {
      alert("保存失败：" + e.message);
    }
    return false;
  }
};

/* 处理本地图片上传 */
window.handlePortraitFileUpload = function (fileInput, charName) {
  const file = fileInput.files[0];
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) {
    alert("图片文件过大，请选择小于5MB的图片（建议使用图床URL）");
    return;
  }
  if (!file.type.startsWith("image/")) {
    alert("请选择有效的图片文件");
    return;
  }
  const fileNameSpan = document.getElementById("portrait-file-name");
  if (fileNameSpan) {
    fileNameSpan.textContent =
      "📷 " + file.name + " (" + (file.size / 1024).toFixed(1) + "KB)";
    fileNameSpan.style.color = "#64ff8a";
  }
  const reader = new FileReader();
  reader.onload = function (e) {
    const base64 = e.target.result;
    const previewImg = document.getElementById("portrait-preview-img");
    if (previewImg) {
      previewImg.src = base64;
      previewImg.classList.add("show");
      previewImg.onerror = null;
    }
    const urlInput = document.getElementById("portrait-url-input");
    if (urlInput) {
      urlInput.value = base64;
    }
  };
  reader.readAsDataURL(file);
};

/* 删除自定义立绘（恢复默认） */
window.removeCustomPortrait = function (name, mode = "normal") {
  try {
    const poolId = resolvePortraitPoolId(mode);
    if (!getDrawerPool(poolId)) throw new Error("未知立绘类型：" + mode);
    const customPortraits = getCustomPortraitMap(poolId);
    delete customPortraits[name];
    writeCustomPortraitMap(poolId, customPortraits);
    setExplicitCustom(name, poolId, false);
    setPortraitIndex(name, poolId, 0);
    portraitPools[poolId] = portraitPools[poolId] || {};
    const defaultValue = getDefaultPortraitValue(name, poolId);
    if (defaultValue) portraitPools[poolId][name] = defaultValue;
    else delete portraitPools[poolId][name];
    syncLegacyPortraitGlobals();

    if (typeof window.populateCharacterData === "function") {
      window.populateCharacterData();
    }
    refreshVisiblePortraitSearch();
    window.updatePortraitView(name, splitPortraitUrls(defaultValue)[0] || "");
    notifyPortraitConsumers();
    return true;
  } catch (e) {
    console.warn("[道渊] 删除自定义立绘失败:", e);
    return false;
  }
};

/* 暂无立绘时的操作提示 */
window.showMissingPortraitDialog = function (charName, mode) {
  const poolId = resolvePortraitPoolId(
    mode || window.getActivePortraitPool(charName),
  );
  const poolConfig = getDrawerPool(poolId) || getDrawerPool("normal");
  const existing = document.getElementById("dy-missing-portrait-modal");
  if (existing) existing.remove();

  const modal = document.createElement("div");
  modal.id = "dy-missing-portrait-modal";
  modal.style.cssText =
    "position:fixed;inset:0;background:rgba(0,0,0,0.82);backdrop-filter:blur(5px);z-index:9999999;display:flex;align-items:center;justify-content:center;padding:20px;";
  modal.innerHTML = `
    <div style="width:88%;max-width:410px;padding:24px;background:linear-gradient(145deg,rgba(25,20,30,0.97),rgba(15,10,15,0.99));border:1px solid var(--border-metal);border-top:2px solid var(--accent-gold);border-bottom:2px solid var(--accent-gold);border-radius:12px;box-shadow:0 0 40px rgba(0,0,0,0.9),inset 0 0 20px rgba(255,215,0,0.05);text-align:center;animation:mapPanelSlideUp 0.3s cubic-bezier(0.2,0.8,0.2,1);">
      <div style="font-size:32px;margin-bottom:10px;text-shadow:0 0 12px var(--accent-gold-glow);">🖼️</div>
      <div style="color:var(--accent-gold);font-size:1.18em;font-weight:bold;letter-spacing:2px;margin-bottom:12px;">尚未收录${poolConfig.name}立绘</div>
      <div style="color:var(--text-main);font-size:0.95em;line-height:1.7;margin-bottom:22px;">
        <span id="dy-missing-portrait-name" style="color:var(--accent-mana);font-weight:bold;"></span> 暂无“${poolConfig.name}”立绘。<br>
        <span style="color:var(--text-dim);font-size:0.9em;">可为该角色自定义配置${poolConfig.name}立绘，或前往公告获取最新立绘。</span>
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:10px;justify-content:center;">
        <button id="dy-missing-custom-btn" style="flex:1;min-width:120px;padding:9px 14px;background:linear-gradient(135deg,#b8860b,#ffd700);color:#1a0f0f;border:1px solid rgba(255,255,255,0.35);border-radius:7px;cursor:pointer;font-weight:bold;box-shadow:0 4px 10px rgba(0,0,0,0.45);">🎨 自定义${poolConfig.name}</button>
        <button id="dy-missing-notice-btn" style="flex:1;min-width:120px;padding:9px 14px;background:rgba(100,180,255,0.12);color:#64b4ff;border:1px solid rgba(100,180,255,0.45);border-radius:7px;cursor:pointer;font-weight:bold;">📜 前往公告</button>
        <button id="dy-missing-cancel-btn" style="padding:9px 18px;background:rgba(255,255,255,0.05);color:var(--text-dim);border:1px solid rgba(255,255,255,0.2);border-radius:7px;cursor:pointer;font-weight:bold;">取消</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
  document.getElementById("dy-missing-portrait-name").textContent =
    "「" + charName + "」";

  const closeModal = () => modal.remove();
  document.getElementById("dy-missing-cancel-btn").onclick = closeModal;
  document.getElementById("dy-missing-custom-btn").onclick = function () {
    closeModal();
    window.openCustomPortraitDialog(charName, poolId);
  };
  document.getElementById("dy-missing-notice-btn").onclick = async function () {
    closeModal();
    if (!window.dyNoticeData && typeof window.loadRemoteNotice === "function") {
      await window.loadRemoteNotice();
    }
    if (typeof window.fetchAndShowNotice !== "function") return;
    await window.fetchAndShowNotice();
    const portraitTab = Array.from(
      document.querySelectorAll("#dy-notice-tabs .n-tab"),
    ).find((tab) => tab.textContent.trim() === "立绘更新");
    if (portraitTab) window.switchNoticeTab("立绘更新", portraitTab);
  };
  modal.onclick = function (event) {
    if (event.target === modal) closeModal();
  };
};

/* 打开自定义立绘弹窗 */
window.openCustomPortraitDialog = function (charName, mode) {
  mode = resolvePortraitPoolId(
    mode || window.getActivePortraitPool(charName),
  );
  var existing = document.getElementById("portrait-custom-modal");
  if (existing) existing.remove();
  var currentUrl = getPortraitPoolValue(charName, mode);
  var isCustom = false;
  try {
    isCustom = Object.prototype.hasOwnProperty.call(
      getCustomPortraitMap(mode),
      charName,
    );
  } catch (e) {}
  var modal =
    document.getElementById("portrait-custom-modal") ||
    document.createElement("div");
  modal.id = "portrait-custom-modal";
  modal.className = "portrait-custom-modal show";
  var poolConfig = getDrawerPool(mode) || getDrawerPool("normal");
  var titleText = `✨ 设定${poolConfig.name}灵容 · ${charName}`;
  modal.innerHTML = `<div class="portrait-custom-dialog"><style>.portrait-custom-dialog{position:relative;background:linear-gradient(145deg,rgba(25,20,30,0.95),rgba(15,10,15,0.98))!important;border:1px solid var(--border-metal)!important;border-top:2px solid var(--accent-gold)!important;border-bottom:2px solid var(--accent-gold)!important;border-radius:12px!important;padding:25px!important;box-shadow:0 0 40px rgba(0,0,0,0.9),inset 0 0 20px rgba(255,215,0,0.05)!important;}.portrait-custom-dialog h3{color:var(--accent-gold)!important;letter-spacing:3px;text-shadow:0 0 8px var(--accent-gold-glow);border-bottom:1px dashed rgba(255,255,255,0.1);padding-bottom:12px;}.portrait-custom-dialog input{border:1px solid rgba(255,215,0,0.3)!important;background:rgba(0,0,0,0.5)!important;color:var(--text-main)!important;margin-bottom:0!important;flex:1;padding:10px;border-radius:6px;}.portrait-custom-dialog input:focus{border-color:var(--accent-gold)!important;box-shadow:0 0 10px var(--accent-gold-glow)!important;outline:none;}.btn-confirm{background:linear-gradient(135deg,#b8860b,#ffd700)!important;color:#1a0f0f!important;border:1px solid rgba(255,255,255,0.4)!important;font-weight:bold;box-shadow:0 4px 8px rgba(0,0,0,0.6);padding:8px 24px;border-radius:6px;cursor:pointer;}.btn-cancel{background:rgba(255,255,255,0.05)!important;color:var(--text-dim)!important;border:1px solid rgba(255,255,255,0.2)!important;padding:8px 24px;border-radius:6px;cursor:pointer;}.btn-reset{background:rgba(239,68,68,0.1)!important;color:var(--accent-blood)!important;border:1px solid rgba(239,68,68,0.3)!important;padding:8px 24px;border-radius:6px;cursor:pointer;}.portrait-preview-wrapper{width:100%;max-height:220px;min-height:120px;border:2px solid var(--border-metal);border-radius:8px;background:rgba(0,0,0,0.6);display:none;align-items:center;justify-content:center;overflow:hidden;margin-bottom:15px;box-shadow:inset 0 0 20px rgba(0,0,0,0.8),0 0 15px var(--accent-gold-glow);position:relative;}.portrait-preview-wrapper::before{content:'';position:absolute;top:-50%;left:-50%;width:200%;height:200%;background:linear-gradient(45deg,transparent,rgba(255,215,0,0.05),transparent);animation:shine-rotate 6s infinite linear;pointer-events:none;z-index:1;}.portrait-custom-dialog:has(.portrait-preview.show) .portrait-preview-wrapper{display:flex;}.portrait-preview{max-width:100%;max-height:220px;object-fit:contain;z-index:2;position:relative;border-radius:4px;display:block!important;}.url-input-row{display:flex;gap:8px;margin-bottom:10px;}.btn-remove-url{background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);color:var(--accent-blood);border-radius:6px;padding:0 12px;cursor:pointer;font-weight:bold;}.btn-add-url{background:rgba(100,180,255,0.1);border:1px dashed rgba(100,180,255,0.4);color:#64b4ff;border-radius:6px;padding:8px;cursor:pointer;width:100%;text-align:center;margin-bottom:12px;font-size:0.9em;}.btn-rst-all{position:absolute;top:15px;right:15px;background:rgba(255,77,77,0.15);color:var(--accent-blood);border:1px solid var(--accent-blood);border-radius:4px;padding:4px 8px;font-size:0.75em;cursor:pointer;transition:all 0.2s;z-index:100;}.btn-rst-all:hover{background:var(--accent-blood);color:#fff;}</style><div style="position:absolute;top:15px;right:15px;display:flex;align-items:center;z-index:100;"><button class="btn-rst-all" id="btn-rst-all" style="position:static;">⚠️ 重置全员</button></div><h3>${titleText}</h3><div class="portrait-preview-wrapper"><img class="portrait-preview" id="portrait-preview-img" style="display:none;" onerror="this.classList.remove('show');this.style.display='none'"></div><div style="display:flex;gap:8px;align-items:stretch;margin-bottom:12px;"><label for="portrait-file-input" style="background:rgba(255,215,0,0.05);border:1px dashed var(--accent-gold);color:var(--accent-gold);padding:8px 16px;border-radius:6px;cursor:pointer;display:flex;align-items:center;">📁 本地图片</label><input type="file" id="portrait-file-input" accept="image/*" style="display:none;"><span id="portrait-file-name" style="flex:1;display:flex;align-items:center;background:rgba(0,0,0,0.4);border:1px solid rgba(255,255,255,0.1);border-radius:6px;padding:0 10px;color:var(--text-dim);font-size:0.8em;overflow:hidden;white-space:nowrap;">未选择文件...</span></div><label style="color:var(--text-dim);font-size:0.9em;margin-bottom:5px;display:block;">图床URL地址</label><div id="url-inputs-container"></div><div class="btn-add-url" id="btn-add-url">➕ 添加多张立绘</div><div style="font-size:0.8em;color:var(--text-dim);font-style:italic;margin-bottom:12px;text-align:center;">💡 空白栏位将被自动忽略，系统会自动用竖线拼接。</div><div style="display:flex;gap:10px;justify-content:center;"><button class="btn-confirm" id="portrait-confirm-btn">✅ 确认保存</button>${isCustom ? '<button class="btn-reset" id="portrait-reset-btn">🔄 恢复默认</button>' : ""}<button class="btn-cancel" id="portrait-cancel-btn">取消</button></div></div>`;
  if (!document.getElementById("portrait-custom-modal"))
    document.body.appendChild(modal);
  var container = modal.querySelector("#url-inputs-container");
  var previewImgEl = modal.querySelector("#portrait-preview-img");
  var urls = currentUrl ? currentUrl.split("|") : [""];
  if (urls.length === 0) urls = [""];
  function renderInputs() {
    container.innerHTML = "";
    urls.forEach(function (u, idx) {
      var row = document.createElement("div");
      row.className = "url-input-row";
      var inp = document.createElement("input");
      inp.type = "text";
      inp.placeholder = "粘贴图床链接...";
      inp.value = u;
      inp.addEventListener("input", function () {
        var val = this.value.trim();
        if (val) {
          previewImgEl.src = val;
          previewImgEl.classList.add("show");
          previewImgEl.style.display = "block";
        } else {
          previewImgEl.classList.remove("show");
          previewImgEl.style.display = "none";
        }
      });
      row.appendChild(inp);
      if (urls.length > 1) {
        var delBtn = document.createElement("button");
        delBtn.className = "btn-remove-url";
        delBtn.innerHTML = "✖";
        delBtn.onclick = function () {
          var inputs = container.querySelectorAll("input");
          urls = [];
          inputs.forEach(function (item, i) {
            if (i !== idx) urls.push(item.value);
          });
          if (urls.length === 0) urls = [""];
          renderInputs();
        };
        row.appendChild(delBtn);
      }
      container.appendChild(row);
    });
  }
  renderInputs();
  if (urls[0]) {
    previewImgEl.src = urls[0];
    previewImgEl.classList.add("show");
    previewImgEl.style.display = "block";
  }
  var _addBtn = modal.querySelector("#btn-add-url");
  if (_addBtn) {
    _addBtn.addEventListener("click", function () {
      var inputs = container.querySelectorAll("input");
      urls = [];
      inputs.forEach(function (i) {
        urls.push(i.value);
      });
      urls.push("");
      renderInputs();
    });
  }
  var fileInput = modal.querySelector("#portrait-file-input");
  if (fileInput) {
    fileInput.addEventListener("change", function () {
      var file = this.files[0];
      if (!file) return;
      if (file.size > 5 * 1024 * 1024) {
        alert("图片文件过大");
        return;
      }
      var fn = modal.querySelector("#portrait-file-name");
      if (fn) {
        fn.textContent = "📷 " + file.name;
        fn.style.color = "#64ff8a";
      }
      var reader = new FileReader();
      reader.onload = function (e) {
        var b = e.target.result;
        previewImgEl.src = b;
        previewImgEl.classList.add("show");
        previewImgEl.style.display = "block";
        var firstInp = container.querySelector("input");
        if (firstInp) firstInp.value = b;
      };
      reader.readAsDataURL(file);
    });
  }
  modal
    .querySelector("#portrait-confirm-btn")
    .addEventListener("click", function () {
      var inputs = container.querySelectorAll("input");
      var validUrls = [];
      inputs.forEach(function (i) {
        var v = i.value.trim();
        if (v !== "") validUrls.push(v);
      });
      if (validUrls.length === 0) {
        alert("请输入至少一个有效的图片URL");
        return;
      }
      var finalUrl = validUrls.join("|");
      if (window.saveCustomPortrait(charName, finalUrl, mode)) {
        modal.remove();
      } else {
        alert("保存失败，请重试");
      }
    });
  modal
    .querySelector("#portrait-cancel-btn")
    .addEventListener("click", function () {
      modal.remove();
    });
  var resetBtn = modal.querySelector("#portrait-reset-btn");
  if (resetBtn) {
    resetBtn.addEventListener("click", function () {
      if (confirm("确定要恢复默认立绘吗？")) {
        if (window.removeCustomPortrait(charName, mode)) modal.remove();
      }
    });
  }
  modal.querySelector("#btn-rst-all").addEventListener("click", function (e) {
    e.stopPropagation();
    let cm = document.createElement("div");
    cm.style.cssText =
      "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.85);z-index:9999999;display:flex;justify-content:center;align-items:center;backdrop-filter:blur(3px);";
    cm.innerHTML =
      '<div style="background:var(--bg-dark);border:1px solid var(--accent-blood);padding:25px;border-radius:10px;text-align:center;width:80%;max-width:300px;box-shadow:0 0 20px rgba(255,77,77,0.3);"><div style="color:var(--accent-blood);font-size:1.2em;font-weight:bold;margin-bottom:15px;">⚠️ 确认重置全员立绘？</div><div style="color:var(--text-main);font-size:0.9em;margin-bottom:20px;line-height:1.5;">此操作将清除<span style="color:var(--accent-blood);">所有角色、所有抽屉</span>的自定义立绘设置，恢复为默认状态。<br><br><span style="color:var(--text-dim);font-size:0.9em;">操作后无法撤销，是否继续？</span></div><div style="display:flex;gap:15px;"><button id="c-no" style="flex:1;background:rgba(255,255,255,0.1);color:var(--text-main);border:1px solid rgba(255,255,255,0.2);padding:8px;border-radius:5px;cursor:pointer;">取消</button><button id="c-yes" style="flex:1;background:var(--accent-blood);color:#fff;border:none;padding:8px;border-radius:5px;cursor:pointer;box-shadow:0 0 10px rgba(255,77,77,0.4);">确定重置</button></div></div>';
    document.body.appendChild(cm);
    document.getElementById("c-no").onclick = function () {
      document.body.removeChild(cm);
    };
    document.getElementById("c-yes").onclick = function () {
      const storage = getPortraitStorage();
      Object.keys(portraitDrawerConfig.pools).forEach((poolId) =>
        storage.removeItem(getPortraitCustomKey(poolId)),
      );
      Object.values(LEGACY_PORTRAIT_CUSTOM_KEYS).forEach((key) =>
        storage.removeItem(key),
      );
      storage.removeItem(PORTRAIT_EXPLICIT_CUSTOM_KEY);
      storage.removeItem(PORTRAIT_INDEX_KEY);
      storage.removeItem(PORTRAIT_ACTIVE_POOL_KEY);
      document.body.removeChild(cm);
      modal.remove();
      window.loadRemotePortraits().then(() => {
        if (typeof window.populateCharacterData === "function") {
          window.populateCharacterData();
        }
        refreshVisiblePortraitSearch();
        alert("所有自定义立绘已重置并恢复为当前云端默认立绘！");
      });
    };
  });
  modal.addEventListener("click", function (e) {
    if (e.target === modal) modal.remove();
  });
};
window.appendChatMessage = async function (charName, sender, content) {
  try {
    const lastMsgId = window.getLastMessageId();
    const messages = window.getChatMessages("0-" + lastMsgId, { role: "assistant" });
    if (!messages || messages.length === 0) {
      console.warn("找不到消息历史");
      return;
    }
    const targetMsgId = messages[messages.length - 1].message_id;

    if (window.Mvu && typeof window.Mvu.replaceMvuData === "function") {
      const fullData = window.Mvu.getMvuData({
        type: "message",
        message_id: targetMsgId,
      });
      if (fullData && fullData.stat_data && fullData.stat_data.玉简) {
        if (!fullData.stat_data.玉简[charName]) {
          fullData.stat_data.玉简[charName] = { 历史记录: {} };
        }
        const history = fullData.stat_data.玉简[charName].历史记录 || {};
        const newMsgId = "msg_" + Date.now() + Math.floor(Math.random() * 1000);
        const now = new Date();
        const timeStr =
          now.getHours().toString().padStart(2, "0") +
          ":" +
          now.getMinutes().toString().padStart(2, "0");

        history[newMsgId] = {
          发送者: sender,
          内容: content,
          时间: timeStr,
        };

        fullData.stat_data.玉简[charName].历史记录 = history;
        await window.Mvu.replaceMvuData(fullData, {
          type: "message",
          message_id: targetMsgId,
        });
        await window.notifyDaoyuanMvuChanged(fullData);
      }
    } else {
      console.warn("MVU 未初始化");
    }
  } catch (err) {
    console.error("[道渊状态栏] 更新玉简消息失败:", err);
  }
};
