import type { LorebookEntry } from "../../bridge/lorebook-api.ts";
import type { WorkshopEntryIndexItem } from "../image-library/workshop/types.ts";

export interface WorkshopMatchedLoreEntry {
  entry: LorebookEntry;
  bookName: string;
  workshopEntry: WorkshopEntryIndexItem;
}

function cleanText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalize(value: unknown): string {
  return cleanText(value).toLocaleLowerCase("zh-CN");
}

function uniqueText(values: readonly unknown[]): string[] {
  return [...new Set(values.map(cleanText).filter(Boolean))];
}

function entryKeys(entry: LorebookEntry): string[] {
  const raw = Array.isArray(entry.key) ? entry.key : [entry.key];
  return uniqueText(raw);
}

function workshopMatchesForEntry(
  entry: LorebookEntry,
  workshopEntries: readonly WorkshopEntryIndexItem[],
): WorkshopEntryIndexItem[] {
  const keys = new Set(entryKeys(entry).map(normalize).filter(Boolean));
  if (!keys.size) return [];
  return workshopEntries.filter((workshopEntry) =>
    workshopEntry.primaryKeys.some((key) => keys.has(normalize(key))),
  );
}

async function mapWithConcurrency<T, R>(
  values: readonly T[],
  concurrency: number,
  mapper: (value: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(values.length);
  let cursor = 0;

  const worker = async (): Promise<void> => {
    while (cursor < values.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await mapper(values[index]!, index);
    }
  };

  await Promise.all(
    Array.from(
      { length: Math.min(Math.max(1, concurrency), values.length) },
      () => worker(),
    ),
  );
  return results;
}

export function collectWorkshopBookNames(
  primary: string | null,
  attachedAdditional: readonly string[],
): string[] {
  return uniqueText(attachedAdditional).filter((name) => name !== primary);
}

export async function readWorkshopMatchedLoreEntries(
  bookNames: readonly string[],
  workshopEntries: readonly WorkshopEntryIndexItem[],
  readBookEntries: (bookName: string) => Promise<LorebookEntry[]>,
  concurrency = 6,
): Promise<WorkshopMatchedLoreEntry[]> {
  const installedBooks = await mapWithConcurrency(
    bookNames,
    concurrency,
    async (bookName) => ({
      bookName,
      entries: await readBookEntries(bookName).catch(() => []),
    }),
  );

  return installedBooks.flatMap(({ bookName, entries }) =>
    entries.flatMap((entry) =>
      workshopMatchesForEntry(entry, workshopEntries).map((workshopEntry) => ({
        entry,
        bookName,
        workshopEntry,
      })),
    ),
  );
}
