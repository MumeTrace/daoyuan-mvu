import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { parseImageLibrary } from "../src/features/image-library/schema.ts";
import {
  getCharacterEntity,
  getAllCharacterNames,
  getImageEntity,
  getSectMapImages,
  groupCharacterImagesByTheme,
} from "../src/features/image-library/selectors.ts";
import {
  setImageLibrary,
  setWorkshopImageLibrary,
} from "../src/features/image-library/store.ts";
import { canUsePortraitTheme } from "../src/features/portraits/rules.ts";
import {
  collectPortraitSearchNames,
  shouldPreserveRandomPortraitResult,
} from "../src/features/portraits/search.ts";
import { parsePortraitDrawers } from "../src/features/portraits/drawers.ts";
import {
  getThemeUi,
  resetThemeUiConfiguration,
  setThemeUiConfiguration,
} from "../src/features/portraits/theme-ui.ts";

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

class LimitedStorage extends MemoryStorage {
  constructor(entries, limit) {
    super(entries);
    this.limit = limit;
  }

  setItem(key, value) {
    const normalizedValue = String(value);
    const next = new Map(this.values);
    next.set(key, normalizedValue);
    const size = Array.from(next.entries()).reduce(
      (total, [entryKey, entryValue]) =>
        total + String(entryKey).length + String(entryValue).length,
      0,
    );
    if (size > this.limit) {
      throw new DOMException("Storage quota exceeded", "QuotaExceededError");
    }
    this.values = next;
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
          { url: "https://example.com/swimsuit.png", theme: "swimsuit" },
          { url: "https://example.com/nai.png", theme: "nai" },
        ],
      },
      测试婚纱人物: {
        type: "character",
        images: [
          { url: "https://example.com/default.png", theme: "default" },
          { url: "https://example.com/wedding.png", theme: "wedding" },
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
  ["default", "special", "tarot", "swimsuit", "nai"],
);
assert.equal(
  groupCharacterImagesByTheme("测试人物").has("wedding"),
  false,
);
assert.equal(
  groupCharacterImagesByTheme("测试婚纱人物").has("wedding"),
  true,
);
assert.equal(getSectMapImages("测试宗门")[0].url, "https://example.com/map.png");

const specialNameFixture = parseImageLibrary(JSON.parse(`{
  "schemaVersion": 2,
  "data": {
    "entities": {
      "__proto__": {
        "type": "character",
        "images": [{ "url": "https://example.com/prototype.png", "theme": "default" }]
      },
      "constructor": {
        "type": "character",
        "images": [{ "url": "https://example.com/constructor.png", "theme": "default" }]
      }
    }
  }
}`));
setImageLibrary(specialNameFixture, "special-name-test");
assert.equal(Object.hasOwn(specialNameFixture.data.entities, "__proto__"), true);
assert.equal(getImageEntity("__proto__")?.type, "character");
assert.equal(getImageEntity("constructor")?.type, "character");
assert.equal(getImageEntity("toString"), null);
assert.deepEqual(getAllCharacterNames(), ["__proto__", "constructor"]);
setImageLibrary(fixture, "test");

assert.deepEqual(
  collectPortraitSearchNames(
    {
      有图人物: {
        type: "character",
        images: [{ url: "data:image/png;base64,AA==", theme: "default" }],
      },
      空图人物: { type: "character", images: [] },
      坏图人物: {
        type: "character",
        images: [{ url: "javascript:alert(1)", theme: "default" }],
      },
      地点宗门: {
        type: "sect",
        images: [{ url: "https://example.com/map.png", theme: "map" }],
      },
    },
    {
      自定义人物: { default: ["data:image/png;base64,AA=="] },
      空自定义: { default: [] },
      坏自定义: { default: ["javascript:alert(1)"] },
      空主题自定义: { "": ["data:image/png;base64,AA=="] },
    },
  ),
  ["有图人物", "自定义人物"],
);
assert.equal(shouldPreserveRandomPortraitResult("随机", 1), true);
assert.equal(shouldPreserveRandomPortraitResult(" 随机 ", 2), true);
assert.equal(shouldPreserveRandomPortraitResult("随机", 0), false);
assert.equal(shouldPreserveRandomPortraitResult("测试人物", 1), false);
assert.equal(
  canUsePortraitTheme("special", [{ url: "x" }], { 好感度: 90 }),
  false,
);
assert.equal(
  canUsePortraitTheme("special", [{ url: "x" }], { 好感度: 91 }),
  true,
);
assert.equal(canUsePortraitTheme("wedding", [], {}), false);
assert.equal(canUsePortraitTheme("nai", [], {}), false);
assert.equal(canUsePortraitTheme("nai", [{ url: "x" }], {}), true);
assert.deepEqual(getThemeUi("nai"), { name: "Nai", icon: "🥛" });
assert.deepEqual(getThemeUi("swimsuit"), { name: "泳装", icon: "👙" });

const drawerFixture = parsePortraitDrawers({
  schemaVersion: 1,
  pools: {
    normal: { name: "普通远程名", icon: "远", order: 10 },
    qipao: { name: "旗袍", icon: "🏮", order: 90 },
  },
  aliases: { cheongsam: "qipao" },
});
setThemeUiConfiguration(drawerFixture);
assert.deepEqual(getThemeUi("default"), {
  name: "普通远程名",
  icon: "远",
  order: 10,
});
assert.deepEqual(getThemeUi("qipao"), {
  name: "旗袍",
  icon: "🏮",
  order: 90,
});
assert.deepEqual(getThemeUi("cheongsam"), {
  name: "旗袍",
  icon: "🏮",
  order: 90,
});
resetThemeUiConfiguration();

globalThis.window = {
  localStorage: new MemoryStorage({
    daoyuan_active_portrait_pools: JSON.stringify({ 测试人物: "normal" }),
    daoyuan_portrait_indices: JSON.stringify({ normal: { 测试人物: 1 } }),
    daoyuan_custom_portraits_pool_normal: JSON.stringify({
      测试人物: "https://example.com/a.png|https://example.com/b.png",
    }),
  }),
};

const { loadWorkshopImages } = await import(
  "../src/features/image-library/index.ts"
);
const workshopFixture = parseImageLibrary({
  schemaVersion: 2,
  data: {
    entities: {
      测试人物: {
        type: "character",
        images: [
          {
            url: "https://example.com/default-1.png",
            theme: "default",
            tags: ["工坊标签"],
          },
          {
            url: "https://example.com/workshop.png",
            theme: "festival",
          },
        ],
      },
      工坊宗门: {
        type: "sect",
        images: [{ url: "https://example.com/workshop-map.png", theme: "map" }],
      },
      测试宗门: {
        type: "character",
        images: [{ url: "https://example.com/type-conflict.png", theme: "default" }],
      },
    },
  },
});
window.parent = {
  DaoyuanWorkshopAPI: {
    getImages: () => {
      throw new Error("初始化前的旧工坊接口不应被调用");
    },
  },
};
window.waitGlobalInitialized = async (name) => {
  assert.equal(name, "DaoyuanWorkshopAPI");
  window.parent.DaoyuanWorkshopAPI = {
    getImages: async () => workshopFixture,
  };
};
assert.equal(await loadWorkshopImages(), true);
assert.deepEqual(
  getCharacterEntity("测试人物")?.images.find(
    (image) => image.url === "https://example.com/default-1.png",
  )?.tags,
  ["工坊标签"],
);
assert.equal(
  getCharacterEntity("测试人物")?.images.some(
    (image) => image.url === "https://example.com/workshop.png",
  ),
  true,
);
assert.equal(
  getSectMapImages("工坊宗门")[0]?.url,
  "https://example.com/workshop-map.png",
);
assert.equal(getSectMapImages("测试宗门")[0]?.url, "https://example.com/map.png");
setWorkshopImageLibrary(null);
assert.equal(getSectMapImages("工坊宗门").length, 0);

delete window.waitGlobalInitialized;
window.parent = {
  DaoyuanWorkshopAPI: {
    getImages: async () => ({ schemaVersion: 1, data: {} }),
  },
};
assert.equal(await loadWorkshopImages(), true);
assert.equal(
  getSectMapImages("工坊宗门")[0]?.url,
  "https://example.com/workshop-map.png",
);
assert.equal(getCharacterEntity("测试人物")?.type, "character");
window.parent = {};

const { migrateLegacyPortraitPreferences } = await import(
  "../src/features/portraits/migration.ts"
);
const { readPortraitPreferences } = await import(
  "../src/features/portraits/preferences.ts"
);

assert.equal(await migrateLegacyPortraitPreferences(), true);
const preferences = readPortraitPreferences();
assert.equal(preferences.activeThemes.测试人物, "default");
assert.equal(preferences.indices.测试人物.default, 1);
assert.deepEqual(preferences.customImages.测试人物.default, [
  "https://example.com/a.png",
  "https://example.com/b.png",
]);
assert.equal(await migrateLegacyPortraitPreferences(), false);
assert.equal(
  window.localStorage.getItem("daoyuan_portrait_preferences_migration_version"),
  "3",
);
assert.equal(
  window.localStorage.getItem("daoyuan_custom_portraits_pool_normal"),
  null,
);

window.localStorage = new LimitedStorage(
  {
    daoyuan_images_cache_v2: "x".repeat(350),
    daoyuan_active_portrait_pools: JSON.stringify({ 缓存恢复人物: "normal" }),
    daoyuan_custom_portraits_pool_normal: JSON.stringify({
      缓存恢复人物: "https://example.com/recovered.png",
    }),
  },
  600,
);
assert.equal(await migrateLegacyPortraitPreferences(), true);
assert.equal(window.localStorage.getItem("daoyuan_images_cache_v2"), null);
assert.equal(
  readPortraitPreferences().customImages.缓存恢复人物.default[0],
  "https://example.com/recovered.png",
);

const largeLegacyUrls = Array.from(
  { length: 18 },
  (_, index) => `https://example.com/large-${index}-${"x".repeat(35)}.png`,
);
window.localStorage = new LimitedStorage(
  {
    daoyuan_custom_portraits_pool_normal: JSON.stringify({
      保留旧数据人物: largeLegacyUrls,
    }),
  },
  1400,
);
assert.equal(await migrateLegacyPortraitPreferences(), false);
assert.equal(
  window.localStorage.getItem("daoyuan_portrait_preferences_migration_version"),
  null,
);
assert.notEqual(
  window.localStorage.getItem("daoyuan_custom_portraits_pool_normal"),
  null,
);
assert.deepEqual(
  readPortraitPreferences().customImages.保留旧数据人物.default,
  largeLegacyUrls,
);

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const runtimeFiles = [
  path.join(projectRoot, "src/stores/portraits.ts"),
  path.join(projectRoot, "src/stores/image-library.ts"),
  path.join(projectRoot, "src/stores/notice.ts"),
  path.join(projectRoot, "src/features/image-library/constants.ts"),
  path.join(projectRoot, "src/features/portraits/drawers.ts"),
  path.join(projectRoot, "src/features/portraits/local-images.ts"),
  path.join(projectRoot, "src/features/portraits/migration.ts"),
];
const runtimeSource = runtimeFiles
  .map((file) => fs.readFileSync(file, "utf8"))
  .join("\n");
const portraitsSource = fs.readFileSync(runtimeFiles[0], "utf8");
const portraitImageSource = fs.readFileSync(
  path.join(projectRoot, "src/components/shared/PortraitImage.vue"),
  "utf8",
);
for (const legacyFile of [
  "portraits.json",
  "sect-maps.json",
]) {
  assert.equal(runtimeSource.includes(legacyFile), false, legacyFile);
}
assert.equal(runtimeSource.includes("images.json"), true);
assert.equal(runtimeSource.includes("portrait-drawers.json"), true);
assert.equal(runtimeSource.includes("notice.json"), true);
assert.equal(portraitsSource.includes("...Object.keys(THEME_UI)"), false);
assert.equal(portraitsSource.includes("persistPortraitImageUrls"), true);
assert.equal(portraitsSource.includes("collectPortraitSearchNames"), true);
assert.equal(portraitImageSource.includes('@error="markFailed"'), true);
assert.equal(portraitImageSource.includes("via.placeholder.com"), false);
for (const consumer of [
  "src/components/shared/PortraitAvatar.vue",
  "src/components/beauty-forum.vue",
  "src/components/tabs/JadeListTab.vue",
  "src/components/tabs/JadeChatView.vue",
]) {
  assert.equal(
    fs.readFileSync(path.join(projectRoot, consumer), "utf8")
      .includes("<PortraitImage"),
    true,
    `${consumer} should use the in-theme portrait fallback`,
  );
}

console.log(
  "IMAGES_SYSTEM_OK schema, own-key routing, portrait search candidates, in-theme load fallback, remote drawer UI, theme order, drawer visibility, special rule, quota recovery, and safe local migration",
);
