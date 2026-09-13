import type { ImageLibraryState, ParsedImageLibrary } from "./types.ts";

let mainLibrary: ParsedImageLibrary | null = null;
let workshopLibrary: ParsedImageLibrary | null = null;
let mainSource: string | null = null;
let state: ImageLibraryState = { schemaVersion: null, entities: {}, loaded: false, source: null };
const subscribers = new Set<(state: ImageLibraryState) => void>();

function mergeImageLibraries(): ImageLibraryState["entities"] {
  const entities = new Map(
    Object.entries(mainLibrary?.data.entities ?? {}),
  );

  for (const [name, workshopEntity] of Object.entries(
    workshopLibrary?.data.entities ?? {},
  )) {
    const mainEntity = entities.get(name);
    if (!mainEntity) {
      entities.set(name, workshopEntity);
      continue;
    }
    if (mainEntity.type !== workshopEntity.type) continue;

    const images = new Map<string, (typeof mainEntity.images)[number]>();
    for (const image of [...mainEntity.images, ...workshopEntity.images]) {
      const key = JSON.stringify([image.url, image.theme]);
      const existing = images.get(key);
      images.set(
        key,
        existing
          ? {
              ...existing,
              tags: [...new Set([...existing.tags, ...image.tags])],
            }
          : image,
      );
    }

    entities.set(name, { ...mainEntity, images: [...images.values()] });
  }

  return Object.fromEntries(entities);
}

function publishImageLibrary(): ImageLibraryState {
  const availableLibrary = mainLibrary ?? workshopLibrary;
  state = {
    schemaVersion: availableLibrary?.schemaVersion ?? null,
    entities: mergeImageLibraries(),
    loaded: availableLibrary !== null,
    source: mainSource ?? (workshopLibrary ? "workshop" : null),
  };
  subscribers.forEach((subscriber) => subscriber(state));
  return state;
}

export function setImageLibrary(data: ParsedImageLibrary, source: string): ImageLibraryState {
  mainLibrary = data;
  mainSource = source;
  return publishImageLibrary();
}

export function setWorkshopImageLibrary(
  data: ParsedImageLibrary | null,
): ImageLibraryState {
  workshopLibrary = data;
  return publishImageLibrary();
}
export function getImageLibraryState(): ImageLibraryState { return state; }
export function subscribeImageLibrary(subscriber: (state: ImageLibraryState) => void): () => void {
  subscribers.add(subscriber);
  return () => subscribers.delete(subscriber);
}
