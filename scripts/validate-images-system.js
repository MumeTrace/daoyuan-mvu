import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { parseImageLibrary } from "../src/features/image-library/schema.js";
import {
  getCharacterEntity,
  getSectMapImages,
  groupCharacterImagesByTheme,
} from "../src/features/image-library/selectors.js";
import { setImageLibrary } from "../src/features/image-library/store.js";
import { canUsePortraitTheme } from "../src/features/portraits/rules.js";

class MemoryStorage {
  constructor(entries = {}) {
    this.values = new Map(Object.entries(entries));
  }

  getItem(key) {
    return this.values.has(key) ? this.values.get(key) : null;
  }

  setItem(key, value) {
    this.values.set(key, String(value));
  }

  removeItem(key) {
    this.values.delete(key);
  }
}

const fixture = parseImageLibrary({
  schemaVersion: 2,
  data: {
    entities: {
      测试人物: {
        type: "character",
        images: [
          { url: "https://example.com/default-1.png", theme: "default" },
          { url: "https://example.com/special.png", theme: "special" },
          { url: "https://example.com/default-2.png", theme: "default" },
          { url: "https://example.com/tarot.png", theme: "tarot" },
        ],
      },
      测试宗门: {
        type: "sect",
        images: [{ url: "https://example.com/map.png", theme: "map" }],
      },
    },
  },
});

setImageLibrary(fixture, "test");
assert.equal(getCharacterEntity("测试人物")?.type, "character");
assert.equal(getCharacterEntity("测试宗门"), null);
assert.deepEqual(
  Array.from(groupCharacterImagesByTheme("测试人物").keys()),
  ["default", "special", "tarot"],
);
assert.equal(getSectMapImages("测试宗门")[0].url, "https://example.com/map.png");
assert.equal(
  canUsePortraitTheme("special", [{ url: "x" }], { 好感度: 90 }),
  false,
);
assert.equal(
  canUsePortraitTheme("special", [{ url: "x" }], { 好感度: 91 }),
  true,
);

globalThis.window = {
  localStorage: new MemoryStorage({
    daoyuan_active_portrait_pools: JSON.stringify({ 测试人物: "normal" }),
    daoyuan_portrait_indices: JSON.stringify({ normal: { 测试人物: 1 } }),
    daoyuan_custom_portraits_pool_normal: JSON.stringify({
      测试人物: "https://example.com/a.png|https://example.com/b.png",
    }),
  }),
};

const { migrateLegacyPortraitPreferences } = await import(
  "../src/features/portraits/migration.js"
);
const { readPortraitPreferences } = await import(
  "../src/features/portraits/preferences.js"
);

assert.equal(migrateLegacyPortraitPreferences(), true);
const preferences = readPortraitPreferences();
assert.equal(preferences.activeThemes.测试人物, "default");
assert.equal(preferences.indices.测试人物.default, 1);
assert.deepEqual(preferences.customImages.测试人物.default, [
  "https://example.com/a.png",
  "https://example.com/b.png",
]);
assert.equal(migrateLegacyPortraitPreferences(), false);

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const runtimeFiles = [
  path.join(projectRoot, "src/components/portraits.js"),
  path.join(projectRoot, "src/components/maps.js"),
  path.join(projectRoot, "src/components/init.js"),
  path.join(projectRoot, "src/features/image-library/constants.js"),
];
const runtimeSource = runtimeFiles
  .map((file) => fs.readFileSync(file, "utf8"))
  .join("\n");
for (const legacyFile of [
  "portraits.json",
  "portrait-drawers.json",
  "sect-maps.json",
]) {
  assert.equal(runtimeSource.includes(legacyFile), false, legacyFile);
}
assert.equal(runtimeSource.includes("images.json"), true);
assert.equal(runtimeSource.includes("notice.json"), true);

console.log(
  "IMAGES_SYSTEM_OK schema, entity routing, theme order, special rule, and local migration",
);
