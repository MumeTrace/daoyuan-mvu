import type { ImageLibraryState, ParsedImageLibrary } from "./types.ts";
let state: ImageLibraryState = { schemaVersion: null, entities: {}, loaded: false, source: null };
const subscribers = new Set<(state: ImageLibraryState) => void>();
export function setImageLibrary(data: ParsedImageLibrary, source: string): ImageLibraryState {
  state = { schemaVersion: data.schemaVersion, entities: data.data.entities, loaded: true, source };
  subscribers.forEach((subscriber) => subscriber(state));
  return state;
}
export function getImageLibraryState(): ImageLibraryState { return state; }
export function subscribeImageLibrary(subscriber: (state: ImageLibraryState) => void): () => void {
  subscribers.add(subscriber);
  return () => subscribers.delete(subscriber);
}
