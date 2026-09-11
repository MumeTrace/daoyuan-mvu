import { numericValue } from "../../stores/helpers";

export function text(value: unknown, fallback = "未知"): string {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}

export function percent(value: unknown): number {
  return Math.max(0, Math.min(100, numericValue(value)));
}

export function recordEntries(value: Record<string, unknown>): Array<[string, unknown]> {
  return Object.entries(value);
}
