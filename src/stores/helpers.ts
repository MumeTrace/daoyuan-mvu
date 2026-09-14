import type { DataRecord, NamedRecord } from "../types/stat-data";

export function asRecord(value: unknown): DataRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as DataRecord)
    : {};
}

export function asNamedRecord(value: unknown): NamedRecord {
  const source = asRecord(value);
  return Object.fromEntries(
    Object.entries(source).filter(
      (entry): entry is [string, DataRecord] =>
        entry[1] !== null && typeof entry[1] === "object" && !Array.isArray(entry[1]),
    ),
  );
}

export function numericValue(value: unknown): number {
  const result = Number(value);
  return Number.isFinite(result) ? result : 0;
}

export function percentage(value: unknown, maximum: unknown): number {
  const max = numericValue(maximum);
  if (max <= 0) return 0;
  return Math.max(0, Math.min(100, (numericValue(value) / max) * 100));
}
