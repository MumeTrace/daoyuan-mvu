type PathSegment = string | number;

function toPath(path: string | readonly PathSegment[]): PathSegment[] {
  if (Array.isArray(path)) return [...path];
  return String(path)
    .replace(/\[(?:"([^"]+)"|'([^']+)'|(\d+))\]/g, (_match, double, single, index) =>
      `.${double ?? single ?? index}`,
    )
    .split(".")
    .filter(Boolean)
    .map((segment) => (/^\d+$/.test(segment) ? Number(segment) : segment));
}

export function deepGet<T>(
  object: unknown,
  path: string | readonly PathSegment[],
  defaultValue?: T,
): T {
  let cursor: unknown = object;
  for (const segment of toPath(path)) {
    if (cursor === null || cursor === undefined) return defaultValue as T;
    if (typeof cursor !== "object" && typeof cursor !== "function") {
      return defaultValue as T;
    }
    cursor = Reflect.get(cursor, segment);
  }
  return (cursor === undefined ? defaultValue : cursor) as T;
}

export function deepUnset(
  object: unknown,
  path: string | readonly PathSegment[],
): boolean {
  const segments = toPath(path);
  const finalSegment = segments.pop();
  if (finalSegment === undefined) return false;

  let cursor: unknown = object;
  for (const segment of segments) {
    if (cursor === null || typeof cursor !== "object") return false;
    cursor = Reflect.get(cursor, segment);
  }
  if (cursor === null || typeof cursor !== "object") return false;
  return Reflect.deleteProperty(cursor, finalSegment);
}

export function deepSet(
  object: unknown,
  path: string | readonly PathSegment[],
  value: unknown,
): boolean {
  const segments = toPath(path);
  const finalSegment = segments.pop();
  if (finalSegment === undefined || object === null || typeof object !== "object") {
    return false;
  }

  let cursor = object as Record<PropertyKey, unknown>;
  for (const segment of segments) {
    const current = Reflect.get(cursor, segment);
    if (current === null || typeof current !== "object" || Array.isArray(current)) {
      Reflect.set(cursor, segment, {});
    }
    cursor = Reflect.get(cursor, segment) as Record<PropertyKey, unknown>;
  }
  return Reflect.set(cursor, finalSegment, value);
}
