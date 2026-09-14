import { SUPPORTED_ENTITY_TYPES, SUPPORTED_IMAGE_SCHEMA_VERSION } from "./constants.ts";
import type { ImageLibraryEntity, ImageLibraryImage, ParsedImageLibrary } from "./types.ts";

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}
function normalizeImage(value: unknown, entityName: string, index: number): ImageLibraryImage {
  const image = record(value);
  if (!image) throw new Error(`实体“${entityName}”的第 ${index + 1} 张图片不是有效对象`);
  const url = String(image.url ?? "").trim();
  const theme = String(image.theme ?? "").trim();
  if (!url || !/^(https?:\/\/|data:image\/)/i.test(url)) throw new Error(`实体“${entityName}”的第 ${index + 1} 张图片 URL 无效`);
  if (!theme) throw new Error(`实体“${entityName}”的第 ${index + 1} 张图片缺少 theme`);
  return { ...image, url, theme, tags: Array.isArray(image.tags) ? image.tags.map(String).map((tag) => tag.trim()).filter(Boolean) : [] };
}
export function parseImageLibrary(raw: unknown): ParsedImageLibrary {
  const parsed = typeof raw === "string" ? JSON.parse(raw) as unknown : raw;
  const source = record(parsed);
  if (!source) throw new Error("图片库不是有效对象");
  if (Number(source.schemaVersion) !== SUPPORTED_IMAGE_SCHEMA_VERSION) throw new Error(`不支持的图片库版本：${String(source.schemaVersion ?? "缺失")}`);
  const entitiesSource = record(record(source.data)?.entities);
  if (!entitiesSource) throw new Error("图片库缺少 data.entities");
  const entityEntries: Array<[string, ImageLibraryEntity]> = [];
  for (const [rawName, rawEntity] of Object.entries(entitiesSource)) {
    const name = rawName.trim();
    const entity = record(rawEntity);
    if (!name || !entity) throw new Error("图片库包含无效实体");
    const type = String(entity.type ?? "") as ImageLibraryEntity["type"];
    if (!SUPPORTED_ENTITY_TYPES.has(type)) throw new Error(`实体“${name}”的 type 无效：${type || "缺失"}`);
    if (!Array.isArray(entity.images)) throw new Error(`实体“${name}”的 images 不是数组`);
    entityEntries.push([
      name,
      {
        ...entity,
        type,
        images: entity.images.map((image, index) =>
          normalizeImage(image, name, index),
        ),
      },
    ]);
  }
  if (!entityEntries.length) throw new Error("图片库没有实体数据");
  // Object.fromEntries defines data properties for names such as "__proto__";
  // direct assignment to a normal object would instead mutate its prototype.
  const entities = Object.fromEntries(entityEntries);
  return { schemaVersion: SUPPORTED_IMAGE_SCHEMA_VERSION, data: { entities } };
}
