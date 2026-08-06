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
  "daoyuan-floating-mvu-pet-style",
  "resizeHandleSettings",
  "daoyuan-floating-mvu-layout-v3",
  "setPetState",
  "petTransitionTimer",
  "petBubbleTimer",
  "getLauncherSize",
  "dy-pet-idle",
  "dy-pet-press",
  "dy-pet-drag",
  "dy-pet-open",
  "dy-pet-close",
  "dy-pet-release",
  "dy-pet-update-bubble",
  "setPetUpdateNotice",
  "isDangerousMvuData",
  "嗯？命数动了。",
  "莫敲头。 (눈_눈)",
  "来，给你看。",
  "有事再唤我。",
  "……放手。",
  "站我身后。",
  "rgba(92,196,255,.82)",
  "#d8f5ff",
  "(pointer: coarse)",
  "waitGlobalInitialized",
  "getMvuData",
  "replaceMvuData",
  "daoyuan_mvu_manual_updated",
  "eventEmit",
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

if (
  !scriptContent.includes("if (collapsed) {") ||
  !scriptContent.includes("isDangerousMvuData(args[0] || latestMvuData)") ||
  !scriptContent.includes("setPetUpdateNotice(false);")
) {
  throw new Error(
    "Floating MVU output is missing collapsed-update notice lifecycle behavior",
  );
}

if (scriptContent.includes("DaoyuanStatusDb")) {
  throw new Error("Floating MVU output unexpectedly contains Shujuku adapter code");
}

const embeddedPetImages = [
  ...scriptContent.matchAll(/data:image\/webp;base64,([A-Za-z0-9+/=]+)/g),
].map(match => Buffer.from(match[1], "base64"));

if (embeddedPetImages.length !== 5) {
  throw new Error(
    `Expected 5 embedded floating pet WebP states, found ${embeddedPetImages.length}`,
  );
}

embeddedPetImages.forEach((image, index) => {
  if (
    image.length < 4096 ||
    image.toString("ascii", 0, 4) !== "RIFF" ||
    image.toString("ascii", 8, 12) !== "WEBP"
  ) {
    throw new Error(`Embedded floating pet state ${index + 1} is not a valid WebP`);
  }
  if (image.length > 128 * 1024) {
    throw new Error(
      `Embedded floating pet state ${index + 1} is unexpectedly large: ${image.length} bytes`,
    );
  }
});

if (/<\/script/i.test(scriptContent)) {
  throw new Error(
    "Floating MVU script contains an unescaped </script> that would break the Tavern Helper module iframe",
  );
}

new vm.Script(scriptContent, { filename: "daoyuan-floating-mvu.content.js" });

console.log(
  "Validated Tavern Helper JSON schema, five embedded pet states, floating MVU markers, and JavaScript syntax",
);
