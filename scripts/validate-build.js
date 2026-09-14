import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { transformWithEsbuild } from "vite";
import { encodeRegexReplacementTokens } from "./regex-replacement-safety.js";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const distHtmlPath = path.join(projectRoot, "dist/index.html");
const target = process.env.BUILD_TARGET === "shujuku" ? "shujuku" : "mvu";
const regexJsonPath = path.join(projectRoot, `dist/regex-${target}.json`);
const viteConfigPath = path.join(projectRoot, "vite.config.ts");
const shujukuAdapterPath = path.join(projectRoot, "src/shujuku-adapter.ts");
const shujukuBridgePath = path.join(projectRoot, "src/bridge/shujuku-api.ts");
const lorebookBridgePath = path.join(projectRoot, "src/bridge/lorebook-api.ts");
const storageRuntimePath = path.join(projectRoot, "src/bridge/storage-runtime.ts");
const mvuWritePath = path.join(projectRoot, "src/composables/useMvuWrite.ts");
const statControllerPath = path.join(projectRoot, "src/composables/useStatData.ts");
const shujukuTemplatePath = path.join(
  projectRoot,
  "legacy/shujuku/TavernDB_template_青云(1).json",
);
const compatibilitySourcePaths = [
  path.join(projectRoot, "src/compatibility-runtime.ts"),
];
const forbiddenEntityLiterals = ["&amp;", "&quot;", "&lt;", "&gt;"];
const sourceOnly = process.argv.includes("--source-only");

async function validateStorageFallback() {
  const originalSource = fs.readFileSync(storageRuntimePath, "utf8");
  const testSource = `${originalSource}\nglobalThis.__getDaoyuanStorageForTest = getDaoyuanStorage;`;
  const compiled = (await transformWithEsbuild(testSource, storageRuntimePath, {
    loader: "ts",
    target: "es2022",
    format: "iife",
    minify: false,
  })).code;
  const backing = new Map([
    ["remove-me", "stale"],
    ["after-clear", "stale"],
  ]);
  const storageError = new Error("read-only storage");
  const localStorage = {
    getItem(key) { return backing.get(String(key)) ?? null; },
    setItem() { throw storageError; },
    removeItem() { throw storageError; },
    clear() { throw storageError; },
  };
  const sandbox = { console: { warn() {} }, localStorage };
  sandbox.window = sandbox;
  sandbox.parent = sandbox;
  sandbox.top = sandbox;
  vm.runInNewContext(compiled, sandbox, { filename: "src/bridge/storage-runtime.compiled.js" });
  const storage = sandbox.__getDaoyuanStorageForTest();

  let setFailed = false;
  try { storage.setItem("volatile", "new"); } catch { setFailed = true; }
  if (!setFailed || storage.getItem("volatile") !== "new") {
    throw new Error("Runtime storage does not retain a failed write as an explicit volatile fallback");
  }
  let removeFailed = false;
  try { storage.removeItem("remove-me"); } catch { removeFailed = true; }
  if (!removeFailed || storage.getItem("remove-me") !== null) {
    throw new Error("Runtime storage does not retain a failed remove as a volatile tombstone");
  }
  let clearFailed = false;
  try { storage.clear(); } catch { clearFailed = true; }
  if (!clearFailed || storage.getItem("after-clear") !== null) {
    throw new Error("Runtime storage does not retain a failed clear as a volatile fallback");
  }

  const injectedStorage = sandbox.__getDaoyuanStorageForTest(() => ({ localStorage }));
  let injectedSetFailed = false;
  try { injectedStorage.setItem("injected", "new"); } catch { injectedSetFailed = true; }
  if (!injectedSetFailed || injectedStorage.getItem("injected") !== "new") {
    throw new Error("Injected runtime storage bypasses the volatile write fallback");
  }
}

async function validateLorebookFallback() {
  const originalSource = fs.readFileSync(lorebookBridgePath, "utf8");
  const testSource = `${originalSource.replace(
    'import { requireCapability } from "./errors";',
    'function requireCapability(value, name) { if (typeof value !== "function") throw new Error(name); return value; }',
  )}\nglobalThis.__createLorebookApiForTest = createLorebookApi;`;
  const compiled = (await transformWithEsbuild(testSource, lorebookBridgePath, {
    loader: "ts",
    target: "es2022",
    format: "iife",
    minify: false,
  })).code;
  const sandbox = { console: { warn() {} } };
  sandbox.window = sandbox;
  vm.runInNewContext(compiled, sandbox, { filename: "src/bridge/lorebook-api.compiled.js" });

  const host = {
    getCharWorldbookNames() { throw new Error("modern unavailable"); },
    getCurrentCharPrimaryLorebook() { return "角色主书"; },
    getCharLorebooks(options = {}) {
      if (options.type === "primary") return ["角色主书"];
      if (options.type === "additional") return ["附加甲", "附加乙"];
      return ["角色主书", "附加甲", "附加乙"];
    },
    getWorldbook() { throw new Error("modern book unavailable"); },
    getLorebookEntries() {
      return [{ uid: 7, comment: "旧版条目", content: "内容" }];
    },
  };
  const api = sandbox.__createLorebookApiForTest(() => host);
  const characterBooks = await api.getCurrentCharacterBookNames();
  if (
    characterBooks.primary !== "角色主书" ||
    JSON.stringify(characterBooks.additional) !== JSON.stringify(["附加甲", "附加乙"])
  ) {
    throw new Error("Lorebook bridge did not fall back from modern API to legacy array results");
  }
  const entries = await api.getBookEntries("角色主书");
  if (entries.length !== 1 || entries[0].comment !== "旧版条目") {
    throw new Error("Lorebook bridge did not fall back after getWorldbook threw");
  }
}

async function validateAdapterSources() {
  const viteConfig = fs.readFileSync(viteConfigPath, "utf8");
  const adapterSource = fs.readFileSync(shujukuAdapterPath, "utf8");
  const adapter = (await transformWithEsbuild(adapterSource, shujukuAdapterPath, {
    loader: "ts",
    target: "es2022",
    format: "iife",
    minify: false,
  })).code;
  new vm.Script(adapter, { filename: "src/shujuku-adapter.compiled.js" });
  const compatibilitySources = compatibilitySourcePaths
    .map(sourcePath => fs.readFileSync(sourcePath, "utf8"))
    .join("\n");
  const compatibilityRegistrations = [
    ...compatibilitySources.matchAll(/registerWindowExports\(\{([\s\S]*?)\}\);/g),
  ].map(match => match[1]).join("\n");
  const requiredCompatibilityExports = [
    "populateCharacterData",
    "loadRemotePortraits",
    "forceUpdateRemotePortraits",
    "showAchievement",
    "notifyDaoyuanMvuChanged",
    "refreshUserAvatar",
  ].filter(name => !new RegExp(`\\b${name}\\b`).test(compatibilityRegistrations));
  if (requiredCompatibilityExports.length > 0) {
    throw new Error(`Required compatibility exports are not registered: ${requiredCompatibilityExports.join(", ")}`);
  }

  if (target === "shujuku") {
    const injectionPattern =
      /BUILD_TARGET\s*===\s*["']shujuku["'][\s\S]*shujuku-adapter\.ts[\s\S]*injectTo:\s*["']head-prepend["']/;
    if (!injectionPattern.test(viteConfig)) {
      throw new Error("Shujuku adapter is not guaranteed to be injected at head-prepend");
    }
    const requiredGlobals = [
      "window.DaoyuanStatusStorage",
      "window.DaoyuanStatusDb",
      "window.getAllVariables",
      "function getSheetByName",
      "function getCellByHeader",
      "function findRowByColumn",
    ].filter(marker => !adapterSource.includes(marker));
    if (requiredGlobals.length > 0) {
      throw new Error(`Shujuku adapter is missing globals: ${requiredGlobals.join(", ")}`);
    }

    const storageValues = new Map();
    const listeners = new Map();
    const tables = {
      sheet_hero: {
        name: "主角属性表",
        content: [["角色名", "境界"], ["主角", "炼气"]],
      },
      sheet_npc: {
        name: "NPC表",
        content: [["姓名", "境界"], ["路人", "凡人"]],
      },
      sheet_jade: {
        name: "玉简好友表",
        content: [
          ["好友姓名", "性别", "境界", "关系", "好感度", "历史记录"],
          ["故人", "未知", "未知", "旧识", 1, "{}"],
        ],
      },
      sheet_world: {
        name: "世界状态表",
        content: [
          ["行号", "全局键", "当前时间", "当前地点", "危机程度", "遭遇冷却轮数", "动向"],
          [1, "全局", "辰时", "青云山", "低", 8, "{}"],
        ],
      },
      sheet_trends: {
        name: "动向表",
        content: [
          ["行号", "动向名", "类型", "地点", "状态", "描述", "最近更新"],
          [1, "宗门大比", "宗门事件", "演武场", "转", "局势突变", "本轮"],
        ],
      },
    };
    const tableByName = name => Object.values(tables).find(table => table.name === name);
    const sandbox = {
      console,
      setTimeout,
      clearTimeout,
      localStorage: {
        getItem(key) { return storageValues.get(String(key)) ?? null; },
        setItem(key, value) { storageValues.set(String(key), String(value)); },
        removeItem(key) { storageValues.delete(String(key)); },
        clear() { storageValues.clear(); },
      },
      addEventListener(type, listener) {
        if (!listeners.has(type)) listeners.set(type, new Set());
        listeners.get(type).add(listener);
      },
      removeEventListener(type, listener) {
        listeners.get(type)?.delete(listener);
      },
      AutoCardUpdaterAPI: {
        exportTableAsJson() { return tables; },
        async updateRow(tableName, rowIndex, values) {
          const table = tableByName(tableName);
          if (!table?.content[rowIndex]) return false;
          const headers = table.content[0];
          Object.entries(values).forEach(([key, value]) => {
            const column = headers.indexOf(key);
            if (column >= 0) table.content[rowIndex][column] = value;
          });
          return true;
        },
        async deleteRow(tableName, rowIndex) {
          const table = tableByName(tableName);
          if (!table?.content[rowIndex]) return false;
          table.content.splice(rowIndex, 1);
          return true;
        },
        async insertRow(tableName, values) {
          const table = tableByName(tableName);
          if (!table) return -1;
          const row = table.content[0].map(header => values[header] ?? "");
          table.content.push(row);
          return table.content.length - 1;
        },
        async updateCell(tableName, rowIndex, columnName, value) {
          const table = tableByName(tableName);
          const column = table?.content[0].indexOf(columnName) ?? -1;
          if (!table?.content[rowIndex] || column < 0) return false;
          table.content[rowIndex][column] = value;
          return true;
        },
      },
    };
    sandbox.window = sandbox;
    sandbox.parent = sandbox;
    sandbox.top = sandbox;
    vm.runInNewContext(adapter, sandbox, { filename: "src/shujuku-adapter.compiled.js" });

    const requiredRuntimeFunctions = [
      [sandbox.DaoyuanStatusStorage, ["getItem", "setItem", "removeItem", "clear"]],
      [sandbox.DaoyuanStatusDb, [
        "getApi", "readVariables", "getSheet", "locateRow", "resolvePath",
        "update", "remove", "readJadeContact", "writeJadeHistory",
        "appendJadeMessage", "deleteJadeMessage", "ready", "subscribe",
      ]],
      [sandbox, ["getAllVariables", "getSheetByName", "getCellByHeader", "findRowByColumn"]],
    ];
    const missingRuntimeFunctions = requiredRuntimeFunctions.flatMap(([owner, names]) =>
      names.filter(name => typeof owner?.[name] !== "function"),
    );
    if (missingRuntimeFunctions.length > 0) {
      throw new Error(`Shujuku runtime globals are not callable: ${missingRuntimeFunctions.join(", ")}`);
    }
    const variables = sandbox.getAllVariables();
    if (!variables || typeof variables.stat_data !== "object") {
      throw new Error("Shujuku getAllVariables did not return a stat_data object");
    }
    if (variables.stat_data.世界?.遭遇冷却 !== 8) {
      throw new Error("Shujuku world-state header aliases did not expose encounter cooldown");
    }
    if (
      variables.stat_data.世界?.动向?.宗门大比?.阶段 !== "转" ||
      variables.stat_data.世界?.动向?.宗门大比?.状态 !== "转"
    ) {
      throw new Error("Shujuku trend status was not normalized to the stage contract");
    }
    tables.sheet_trends.content[0][4] = "阶段";
    tables.sheet_trends.content[1][4] = "合";
    if (sandbox.getAllVariables().stat_data.世界?.动向?.宗门大比?.阶段 !== "合") {
      throw new Error("Shujuku trend stage header is not compatible with the legacy status header");
    }
    const subscription = sandbox.DaoyuanStatusDb.subscribe(() => {});
    if (!subscription || typeof subscription.stop !== "function") {
      throw new Error("Shujuku subscribe did not return a teardown handle");
    }
    subscription.stop();
    if (!(await sandbox.DaoyuanStatusDb.update(["主角"], { 境界: "筑基" }))) {
      throw new Error("Shujuku typed row update route failed");
    }
    if (tables.sheet_hero.content[1][1] !== "筑基") {
      throw new Error("Shujuku row update did not reach the target column");
    }
    if (!(await sandbox.DaoyuanStatusDb.remove(["人物", "路人"]))) {
      throw new Error("Shujuku typed row delete route failed");
    }
    const appended = await sandbox.DaoyuanStatusDb.appendJadeMessage("故人", "我", "问候");
    if (!appended.success || !appended.messageId) {
      throw new Error("Shujuku Jade append route failed");
    }
    const remainingHistory = await sandbox.DaoyuanStatusDb.deleteJadeMessage(
      "故人",
      appended.messageId,
    );
    if (Object.keys(remainingHistory).length !== 0) {
      throw new Error("Shujuku Jade delete route failed");
    }

    const fallbackBacking = new Map([
      ["remove-me", "stale"],
      ["after-clear", "stale"],
    ]);
    const storageError = new Error("read-only storage");
    sandbox.localStorage = {
      getItem(key) { return fallbackBacking.get(String(key)) ?? null; },
      setItem() { throw storageError; },
      removeItem() { throw storageError; },
      clear() { throw storageError; },
    };
    let shujukuSetFailed = false;
    try { sandbox.DaoyuanStatusStorage.setItem("volatile", "new"); } catch { shujukuSetFailed = true; }
    if (!shujukuSetFailed || sandbox.DaoyuanStatusStorage.getItem("volatile") !== "new") {
      throw new Error("Shujuku storage did not preserve a failed write as volatile data");
    }
    let shujukuRemoveFailed = false;
    try { sandbox.DaoyuanStatusStorage.removeItem("remove-me"); } catch { shujukuRemoveFailed = true; }
    if (!shujukuRemoveFailed || sandbox.DaoyuanStatusStorage.getItem("remove-me") !== null) {
      throw new Error("Shujuku storage did not preserve a failed remove as a tombstone");
    }
    let shujukuClearFailed = false;
    try { sandbox.DaoyuanStatusStorage.clear(); } catch { shujukuClearFailed = true; }
    if (!shujukuClearFailed || sandbox.DaoyuanStatusStorage.getItem("after-clear") !== null) {
      throw new Error("Shujuku storage did not preserve a failed clear fallback");
    }

    const typedAdapterSources = [
      fs.readFileSync(shujukuBridgePath, "utf8"),
      fs.readFileSync(mvuWritePath, "utf8"),
      fs.readFileSync(statControllerPath, "utf8"),
    ].join("\n");
    const requiredTypedRoutes = [
      "DaoyuanStatusDb",
      "shujukuApi.isAvailable()",
      "shujukuApi.update",
      "shujukuApi.remove",
      "shujuku.subscribe",
    ].filter(marker => !typedAdapterSources.includes(marker));
    if (requiredTypedRoutes.length > 0) {
      throw new Error(`Typed Shujuku routes are missing: ${requiredTypedRoutes.join(", ")}`);
    }
    const statControllerSource = fs.readFileSync(statControllerPath, "utf8");
    const scopedReadStart = statControllerSource.indexOf("function readScopedStatData");
    const shujukuReadIndex = statControllerSource.indexOf(
      "if (shujuku.isAvailable())",
      scopedReadStart,
    );
    const mvuReadIndex = statControllerSource.indexOf(
      "mvu.getMvuData",
      scopedReadStart,
    );
    if (
      scopedReadStart < 0 ||
      shujukuReadIndex < scopedReadStart ||
      mvuReadIndex < 0 ||
      shujukuReadIndex > mvuReadIndex ||
      !statControllerSource.includes("const fromPayload = shujuku.isAvailable()")
    ) {
      throw new Error("Shujuku is not the authoritative read path when MVU is also present");
    }

    const template = JSON.parse(fs.readFileSync(shujukuTemplatePath, "utf8"));
    const worldHeaders = template.sheet_world?.content?.[0] ?? [];
    if (
      !worldHeaders.includes("遭遇冷却") ||
      !String(template.sheet_world?.sourceData?.ddl ?? "").includes("encounter_cooldown")
    ) {
      throw new Error("Shujuku template is missing the encounter cooldown column");
    }
  }
}

console.log(`[道渊构建] target=${target} step=${sourceOnly ? "adapter-source-validate" : "artifact-validate"}`);
await validateStorageFallback();
await validateLorebookFallback();
await validateAdapterSources();
if (sourceOnly) {
  console.log(`[道渊构建] target=${target} adapter sources validated`);
  process.exit(0);
}

const distHtml = fs.readFileSync(distHtmlPath, "utf8");
const regexConfig = JSON.parse(fs.readFileSync(regexJsonPath, "utf8"));
const captureOne = "1537";
const captureTwo = "DA0YUAN_MESSAGE_BODY_CAPTURE";
const expectedRegexHtml = encodeRegexReplacementTokens(distHtml);
const nativeSimulatedReplacement = `${captureOne}${captureTwo}`.replace(
  new RegExp(`(${captureOne})(${captureTwo})`),
  regexConfig.replaceString,
);
const tavernHelperSimulatedReplacement = regexConfig.replaceString
  .replaceAll("$1", captureOne)
  .replaceAll("$2", captureTwo);
const fenceMatch = tavernHelperSimulatedReplacement.match(/^(`+)html\n/);

if (!fenceMatch) {
  throw new Error("Regex replacement is missing its opening HTML fence");
}

const fence = fenceMatch[1];
const closingFence = `\n${fence}`;
if (!tavernHelperSimulatedReplacement.endsWith(closingFence)) {
  throw new Error("Regex replacement is missing its closing HTML fence");
}

const renderedHtml = tavernHelperSimulatedReplacement.slice(
  fenceMatch[0].length,
  -closingFence.length,
);
const nativeRenderedHtml = nativeSimulatedReplacement.slice(
  fenceMatch[0].length,
  -closingFence.length,
);

if (
  renderedHtml !== expectedRegexHtml ||
  nativeRenderedHtml !== expectedRegexHtml
) {
  throw new Error(
    "Regex replacement changed the protected HTML; check exposed replacement tokens",
  );
}

if (!/<meta\s+name=["']viewport["'][^>]*content=["'][^"']*width=device-width/i.test(renderedHtml)) {
  throw new Error("Regex-rendered HTML is missing its mobile viewport contract");
}

const exposedReplacementToken = regexConfig.replaceString.match(
  /\$(?:\$|\d|[&`'<])/,
);
if (exposedReplacementToken) {
  throw new Error(
    `Regex replacement still exposes token ${exposedReplacementToken[0]}`,
  );
}

const inlineScripts = Array.from(
  renderedHtml.matchAll(/<script\b(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi),
  (match) => match[1],
);

inlineScripts.forEach((script, index) => {
  try {
    new vm.Script(script, { filename: `regex-${target}-inline-${index}.js` });
  } catch (error) {
    throw new Error(
      `Regex-rendered inline script ${index} is invalid: ${error.message}`,
    );
  }
});
const unsafeEntities = forbiddenEntityLiterals.filter((entity) => {
  return inlineScripts.some((script) => script.includes(entity));
});
const requiredImageLibraryMarkers = [
  "images.json",
  "portrait-drawers.json",
  "daoyuan_images_cache_v2",
  "daoyuan_portrait_drawers_cache_v1",
  "daoyuan_portrait_preferences_v2",
  "daoyuan_portrait_preferences_migration_version",
  "daoyuan_status_assets",
  "idb:daoyuan-portrait:",
  "daoyuan_images_changed",
  "DaoyuanWorkshopAPI",
  "getEntry",
  "getCharWorldbookNames",
  "当前状态没有可替换的立绘",
  "portrait-pool-selector",
  "portrait-pool-body-open",
  "switchPortraitInPool",
  "Nai",
  "🥛",
  "dyImageCacheMissing",
  "dyPortraitCacheMissing",
  "safeImageUrl",
  "getSectMapUrl",
  "setCustomImages",
];
const missingImageLibraryMarkers = requiredImageLibraryMarkers.filter(
  marker => !distHtml.includes(marker),
);
const forbiddenLegacyImageFiles = [
  "portraits.json",
  "sect-maps.json",
].filter(marker => distHtml.includes(marker));

const shujukuAdapterIndex = distHtml.indexOf("installDaoyuanStatusStorage");
const vueAppIndex = distHtml.indexOf("createApp");
if (target === "shujuku") {
  if (shujukuAdapterIndex < 0) {
    throw new Error("Shujuku build is missing the early adapter IIFE");
  }
  if (vueAppIndex >= 0 && shujukuAdapterIndex > vueAppIndex) {
    throw new Error("Shujuku adapter appears after Vue application code");
  }
} else if (shujukuAdapterIndex >= 0) {
  throw new Error("MVU build unexpectedly contains Shujuku adapter code");
}

if (unsafeEntities.length > 0) {
  throw new Error(
    `Inline scripts contain srcdoc-sensitive HTML entities: ${unsafeEntities.join(", ")}`,
  );
}

if (missingImageLibraryMarkers.length > 0) {
  throw new Error(
    `Build is missing image-library markers: ${missingImageLibraryMarkers.join(", ")}`,
  );
}

if (forbiddenLegacyImageFiles.length > 0) {
  throw new Error(
    `Build still references legacy image files: ${forbiddenLegacyImageFiles.join(", ")}`,
  );
}

console.log(
  `[道渊构建] target=${target} validated regex replacement, inline scripts, adapter order, and images.json markers`,
);
