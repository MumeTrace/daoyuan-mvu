import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const outputPath = path.join(projectRoot, "dist/daoyuan-floating-mvu.json");

if (!fs.existsSync(outputPath)) {
  throw new Error(`Floating MVU output not found at ${outputPath}`);
}

const output = JSON.parse(fs.readFileSync(outputPath, "utf8"));
const requiredShape = {
  type: "string",
  enabled: "boolean",
  name: "string",
  id: "string",
  content: "string",
  info: "string",
  button: "object",
  data: "object",
  export_with: "object",
};
const invalidFields = Object.entries(requiredShape)
  .filter(([key, type]) => typeof output[key] !== type)
  .map(([key]) => key);

if (output.type !== "script" || invalidFields.length > 0) {
  throw new Error(
    `Invalid Tavern Helper script JSON fields: ${invalidFields.join(", ") || "type"}`,
  );
}

if (
  !Array.isArray(output.button.buttons) ||
  typeof output.button.enabled !== "boolean" ||
  typeof output.export_with.data !== "boolean" ||
  typeof output.export_with.button !== "boolean"
) {
  throw new Error("Invalid Tavern Helper button/export_with structure");
}

const scriptContent = output.content;
const requiredMarkers = [
  "daoyuan-floating-mvu-root",
  "daoyuan-floating-mvu-status",
  "daoyuan-floating-mvu-launcher",
  "daoyuan-floating-mvu-panel-drag",
  "daoyuan-floating-mvu-resize-",
  "resizeHandleSettings",
  "daoyuan-floating-mvu-layout-v3",
  "waitGlobalInitialized",
  "getMvuData",
  "replaceMvuData",
  "getPersonaAvatarPath",
  "getButtonEvent",
  "VARIABLE_UPDATE_ENDED",
  "__daoyuanFloatingBridge",
];
const missingMarkers = requiredMarkers.filter(
  marker => !scriptContent.includes(marker),
);

if (missingMarkers.length > 0) {
  throw new Error(
    `Floating MVU output is missing markers: ${missingMarkers.join(", ")}`,
  );
}

if (scriptContent.includes("DaoyuanStatusDb")) {
  throw new Error("Floating MVU output unexpectedly contains Shujuku adapter code");
}

if (/<\/script/i.test(scriptContent)) {
  throw new Error(
    "Floating MVU script contains an unescaped </script> that would break the Tavern Helper module iframe",
  );
}

new vm.Script(scriptContent, { filename: "daoyuan-floating-mvu.content.js" });

console.log(
  "Validated Tavern Helper JSON schema, floating MVU markers, and JavaScript syntax",
);
