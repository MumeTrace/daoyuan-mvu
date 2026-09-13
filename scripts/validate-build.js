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
const mvuWritePath = path.join(projectRoot, "src/composables/useMvuWrite.ts");
const statControllerPath = path.join(projectRoot, "src/composables/useStatData.ts");
const compatibilitySourcePaths = [
  path.join(projectRoot, "src/compatibility-runtime.ts"),
];
const forbiddenEntityLiterals = ["&amp;", "&quot;", "&lt;", "&gt;"];
const sourceOnly = process.argv.includes("--source-only");

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
  }
}

console.log(`[道渊构建] target=${target} step=${sourceOnly ? "adapter-source-validate" : "artifact-validate"}`);
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
