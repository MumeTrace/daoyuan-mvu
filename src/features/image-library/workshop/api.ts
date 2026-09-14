import type {
  DaoyuanWorkshopHost,
  WorkshopRuntime,
} from "./types.ts";

const WORKSHOP_GLOBAL_NAME = "DaoyuanWorkshopAPI";
// This read is always started in the background, so a longer timeout improves
// cold-start reliability without delaying the first paint.
const WORKSHOP_READ_TIMEOUT_MS = 10000;
type WorkshopReadMethod = "getEntry" | "getImages";

function browserRuntime(): WorkshopRuntime {
  return window;
}

function resolveWorkshopHost(runtime: WorkshopRuntime): DaoyuanWorkshopHost | null {
  try {
    const candidate = runtime.parent ?? runtime;
    return candidate && typeof candidate === "object"
      ? (candidate as DaoyuanWorkshopHost)
      : null;
  } catch {
    return null;
  }
}

/** Resolve the optional Workshop facade after discovery and read one snapshot. */
async function fetchWorkshopPayload(
  method: WorkshopReadMethod,
  getRuntime: () => WorkshopRuntime = browserRuntime,
  timeoutMs: number = WORKSHOP_READ_TIMEOUT_MS,
): Promise<unknown | null> {
  let timeoutHandle: ReturnType<typeof globalThis.setTimeout> | undefined;

  try {
    const read = async (): Promise<unknown | null> => {
      const runtime = getRuntime();
      if (typeof runtime.waitGlobalInitialized === "function") {
        await runtime.waitGlobalInitialized(WORKSHOP_GLOBAL_NAME);
      }

      const currentRuntime = getRuntime();
      const api = resolveWorkshopHost(currentRuntime)?.DaoyuanWorkshopAPI;
      const reader = api?.[method];
      if (typeof reader !== "function") return null;
      return await reader.call(api);
    };

    return await Promise.race([
      read(),
      new Promise<null>((resolve) => {
        timeoutHandle = globalThis.setTimeout(() => resolve(null), timeoutMs);
      }),
    ]);
  } catch {
    return null;
  } finally {
    if (timeoutHandle !== undefined) globalThis.clearTimeout(timeoutHandle);
  }
}

/** Read the optional Workshop image index without holding up the status bar. */
export function fetchWorkshopImageLibrary(
  getRuntime: () => WorkshopRuntime = browserRuntime,
  timeoutMs: number = WORKSHOP_READ_TIMEOUT_MS,
): Promise<unknown | null> {
  return fetchWorkshopPayload("getImages", getRuntime, timeoutMs);
}

/** Read the current role's installed and enabled Workshop entry metadata. */
export function fetchWorkshopEntryIndex(
  getRuntime: () => WorkshopRuntime = browserRuntime,
  timeoutMs: number = WORKSHOP_READ_TIMEOUT_MS,
): Promise<unknown | null> {
  return fetchWorkshopPayload("getEntry", getRuntime, timeoutMs);
}
