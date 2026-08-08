import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const distHtmlPath = path.join(projectRoot, "dist/index.html");
const forbiddenEntityLiterals = ["&amp;", "&quot;", "&lt;", "&gt;"];

const distHtml = fs.readFileSync(distHtmlPath, "utf8");
const inlineScripts = Array.from(
  distHtml.matchAll(/<script\b(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi),
  (match) => match[1],
);
const unsafeEntities = forbiddenEntityLiterals.filter((entity) => {
  return inlineScripts.some((script) => script.includes(entity));
});
const requiredPortraitDrawerMarkers = [
  "portrait-drawers.json",
  "daoyuan_portrait_drawers_cache",
  "daoyuan_active_portrait_pools",
  "publishedPortraitPoolIds",
  "daoyuan_portrait_storage_migration_version",
  "daoyuan_custom_portraits_pool_",
  "portrait-pool-selector",
  "portrait-pool-body-open",
  "switchPortraitInPool",
  "checkRemotePortraitDrawerUpdate",
  "dyPortraitDrawerUpdateAvailable",
  "replaceChildren",
  "sourceKey",
];
const missingPortraitDrawerMarkers = requiredPortraitDrawerMarkers.filter(
  marker => !distHtml.includes(marker),
);

if (unsafeEntities.length > 0) {
  throw new Error(
    `Inline scripts contain srcdoc-sensitive HTML entities: ${unsafeEntities.join(", ")}`,
  );
}

if (missingPortraitDrawerMarkers.length > 0) {
  throw new Error(
    `Build is missing portrait drawer markers: ${missingPortraitDrawerMarkers.join(", ")}`,
  );
}

console.log(
  "Validated inline scripts and dynamic portrait drawer build markers",
);
