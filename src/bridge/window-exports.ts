export type CompatibilityExports = Record<string, unknown>;

interface PreviousExport {
  existed: boolean;
  value: unknown;
}

const previousExports = new Map<string, PreviousExport>();

export function setWindowExport(name: string, value: unknown): void {
  if (!previousExports.has(name)) {
    previousExports.set(name, {
      existed: Object.prototype.hasOwnProperty.call(window, name),
      value: Reflect.get(window, name),
    });
  }
  Reflect.set(window, name, value);
}

/**
 * Project compatibility boundary. New code imports modules directly; only legacy
 * inline handlers, the host, and Shujuku receive names registered here.
 */
export function registerWindowExports(exports: CompatibilityExports): () => void {
  for (const [name, value] of Object.entries(exports)) {
    setWindowExport(name, value);
  }

  let active = true;
  return () => {
    if (!active) return;
    active = false;
    for (const name of Object.keys(exports)) {
      const previous = previousExports.get(name);
      if (!previous) continue;
      if (previous.existed) Reflect.set(window, name, previous.value);
      else Reflect.deleteProperty(window, name);
      previousExports.delete(name);
    }
  };
}
