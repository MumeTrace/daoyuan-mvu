export type HostApiSource =
  | "SillyTavern core"
  | "Tavern Helper"
  | "MVU"
  | "Shujuku"
  | "project";

export class HostCapabilityError extends Error {
  constructor(
    public readonly capability: string,
    public readonly source: HostApiSource,
  ) {
    super(`[道渊] ${source} 未提供 ${capability}，请检查宿主脚本及加载顺序。`);
    this.name = "HostCapabilityError";
  }
}

export function requireCapability<T>(
  value: T | null | undefined,
  capability: string,
  source: HostApiSource,
): T {
  if (value === null || value === undefined) {
    throw new HostCapabilityError(capability, source);
  }
  return value;
}
