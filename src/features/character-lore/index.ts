import {
  lorebookApi,
  type LorebookEntry,
} from "../../bridge/lorebook-api";
import { tavernApi } from "../../bridge/tavern-api";
import { fetchWorkshopEntryIndex } from "../image-library/workshop/api";
import type {
  WorkshopEntryIndexEnvelope,
  WorkshopEntryIndexItem,
} from "../image-library/workshop/types";
import {
  discoverCharacterSubjects,
  entryAliasMatchesName,
  type CharacterSubject,
  type CharacterSubjectEvidence,
} from "./subject";
import {
  collectWorkshopBookNames,
  readWorkshopMatchedLoreEntries,
} from "./scope";

export interface CharacterLoreRecord {
  name: string;
  aliases: string[];
  content: string;
  bookName: string;
  source: "card" | "workshop";
  sourceLabel: string;
  evidence: CharacterSubjectEvidence | "direct-entry";
  workshopEntry?: WorkshopEntryIndexItem;
}

interface ScopedLoreEntry {
  entry: LorebookEntry;
  bookName: string;
  source: "card" | "workshop";
  workshopEntry?: WorkshopEntryIndexItem;
}

interface PermittedLoreScope {
  entries: ScopedLoreEntry[];
  knownCharacterNames: string[];
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
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

function entryAliases(entry: LorebookEntry): string[] {
  return uniqueText([
    entry.comment,
    entry.name,
    ...entryKeys(entry),
  ]);
}

function parseWorkshopEntryIndex(value: unknown): WorkshopEntryIndexEnvelope | null {
  const envelope = asRecord(value);
  const data = asRecord(envelope?.data);
  if (envelope?.schemaVersion !== 1 || !data || !Array.isArray(data.entries)) {
    return null;
  }

  const entries: WorkshopEntryIndexItem[] = [];
  for (const candidate of data.entries) {
    const entry = asRecord(candidate);
    if (!entry) continue;
    const kind = entry.kind;
    const primaryKeys = Array.isArray(entry.primaryKeys)
      ? uniqueText(entry.primaryKeys)
      : [];
    if (
      (kind !== "character" && kind !== "worldbook")
      || !cleanText(entry.packageId)
      || !cleanText(entry.entryId)
    ) {
      continue;
    }
    entries.push({
      packageId: cleanText(entry.packageId),
      packageDisplayName: cleanText(entry.packageDisplayName),
      version: cleanText(entry.version),
      entryId: cleanText(entry.entryId),
      kind,
      displayName: cleanText(entry.displayName),
      primaryKeys,
    });
  }

  return {
    schemaVersion: 1,
    data: {
      revision: Number.isInteger(data.revision) ? Number(data.revision) : 0,
      workshopOrigin: cleanText(data.workshopOrigin),
      entries,
    },
  };
}

function knownCharacterNames(): string[] {
  try {
    const variables = asRecord(tavernApi.getAllVariables());
    const statData = asRecord(variables?.stat_data);
    if (!statData) return [];
    const names: unknown[] = [];
    for (const scopeName of ["道侣", "人物", "绝色榜", "玉简"]) {
      const scope = asRecord(statData[scopeName]);
      if (!scope) continue;
      for (const [key, value] of Object.entries(scope)) {
        names.push(key, asRecord(value)?.姓名);
      }
    }
    return uniqueText(names);
  } catch {
    return [];
  }
}

function sourceLabel(scoped: ScopedLoreEntry): string {
  if (scoped.source === "card") return "本卡世界书";
  const packageName = cleanText(scoped.workshopEntry?.packageDisplayName)
    || cleanText(scoped.workshopEntry?.packageId);
  return `工坊扩展${packageName ? ` · ${packageName}` : ""}`;
}

function allScopedAliases(scoped: ScopedLoreEntry): string[] {
  return uniqueText([
    ...entryAliases(scoped.entry),
    scoped.workshopEntry?.kind === "character"
      ? scoped.workshopEntry.displayName
      : "",
    ...(scoped.workshopEntry?.primaryKeys ?? []),
  ]);
}

function createRecord(
  scoped: ScopedLoreEntry,
  subject: CharacterSubject,
): CharacterLoreRecord {
  return {
    name: subject.name,
    aliases: uniqueText([subject.name, ...subject.aliases]),
    content: cleanText(scoped.entry.content),
    bookName: scoped.bookName,
    source: scoped.source,
    sourceLabel: sourceLabel(scoped),
    evidence: subject.evidence,
    workshopEntry: scoped.workshopEntry,
  };
}

function discoverRecords(
  scoped: ScopedLoreEntry,
  knownNames: readonly string[],
): CharacterLoreRecord[] {
  const content = cleanText(scoped.entry.content);
  if (!content || scoped.entry.enabled === false) return [];
  const workshopEntry = scoped.workshopEntry;
  const workshopCharacterName = workshopEntry?.kind === "character"
    ? cleanText(workshopEntry.displayName) || cleanText(workshopEntry.primaryKeys[0])
    : "";
  return discoverCharacterSubjects(content, {
    entryAliases: entryAliases(scoped.entry),
    knownCharacterNames: knownNames,
    workshopCharacterName,
    workshopAliases: workshopEntry?.primaryKeys ?? [],
  }).map((subject) => createRecord(scoped, subject));
}

function createDirectEntryRecord(
  scoped: ScopedLoreEntry,
  name: string,
): CharacterLoreRecord {
  return {
    name: cleanText(name),
    aliases: allScopedAliases(scoped),
    content: cleanText(scoped.entry.content),
    bookName: scoped.bookName,
    source: scoped.source,
    sourceLabel: sourceLabel(scoped),
    evidence: "direct-entry",
    workshopEntry: scoped.workshopEntry,
  };
}

function deduplicate(records: CharacterLoreRecord[]): CharacterLoreRecord[] {
  const seen = new Set<string>();
  return records.filter((record) => {
    const identity = [
      record.bookName,
      normalize(record.name),
      normalize(record.content),
    ].join("\u0000");
    if (seen.has(identity)) return false;
    seen.add(identity);
    return true;
  });
}

/**
 * Read the current card primary book plus current-character additional-book
 * entries explicitly exposed by the installed Workshop index. getEntry()
 * already limits its snapshot to the current role's installed and enabled
 * Workshop content; scope selection and character classification remain
 * separate.
 */
async function readPermittedLoreScope(): Promise<PermittedLoreScope> {
  if (
    !lorebookApi.isAvailable("getWorldbook")
    && !lorebookApi.isAvailable("getLorebookEntries")
  ) {
    throw new Error("当前环境不支持世界书读取接口。");
  }

  const books = await lorebookApi.getCurrentCharacterBookNames();
  const primary = books.primary;
  const attachedAdditional = books.additional.filter((name) => name !== primary);
  const [rawWorkshopIndex, primaryEntries] = await Promise.all([
    fetchWorkshopEntryIndex(undefined, 3000),
    primary ? lorebookApi.getBookEntries(primary).catch(() => []) : Promise.resolve([]),
  ]);
  const workshopEntries = parseWorkshopEntryIndex(rawWorkshopIndex)?.data.entries ?? [];
  const entries: ScopedLoreEntry[] = [];

  if (primary) {
    for (const entry of primaryEntries) {
      if (!cleanText(entry.content) || entry.enabled === false) continue;
      entries.push({ entry, bookName: primary, source: "card" });
    }
  }

  if (!workshopEntries.length) {
    return { entries, knownCharacterNames: knownCharacterNames() };
  }

  const installedBookNames = collectWorkshopBookNames(
    primary,
    attachedAdditional,
  );

  const workshopMatches = await readWorkshopMatchedLoreEntries(
    installedBookNames,
    workshopEntries,
    (bookName) => lorebookApi.getBookEntries(bookName),
  );

  workshopMatches.forEach(({ entry, bookName, workshopEntry }) => {
    if (!cleanText(entry.content) || entry.enabled === false) return;
    entries.push({ entry, bookName, source: "workshop", workshopEntry });
  });

  return { entries, knownCharacterNames: knownCharacterNames() };
}

/** Build searchable character records inside the permitted lorebook scope. */
export async function readPermittedCharacterLore(): Promise<CharacterLoreRecord[]> {
  const scope = await readPermittedLoreScope();
  return deduplicate(
    scope.entries.flatMap((entry) =>
      discoverRecords(entry, scope.knownCharacterNames),
    ),
  );
}

function recordMatches(record: CharacterLoreRecord, query: string): boolean {
  const needle = normalize(query);
  return Boolean(needle)
    && record.aliases.some((alias) => normalize(alias).includes(needle));
}

export async function searchPermittedCharacters(
  query: string,
): Promise<CharacterLoreRecord[]> {
  const needle = cleanText(query);
  if (!needle) return [];
  return (await readPermittedCharacterLore()).filter((record) =>
    recordMatches(record, needle),
  );
}

export async function findPermittedCharacterLore(
  name: string,
): Promise<CharacterLoreRecord[]> {
  const needle = normalize(name);
  if (!needle) return [];
  const scope = await readPermittedLoreScope();
  const discovered = deduplicate(
    scope.entries.flatMap((entry) =>
      discoverRecords(entry, scope.knownCharacterNames),
    ),
  );
  const exact = discovered.filter((record) =>
    record.aliases.some((alias) => normalize(alias) === needle),
  );
  if (exact.length) return exact;

  // A click from an existing character card already supplies character
  // identity. Preserve support for irregular prose-only entries, but require an
  // exact entry alias so a similarly named place is not selected by accident.
  const direct = scope.entries
    .filter((scoped) => entryAliasMatchesName(allScopedAliases(scoped), name))
    .map((scoped) => createDirectEntryRecord(scoped, name));
  if (direct.length) return deduplicate(direct);

  return discovered.filter((record) => recordMatches(record, needle));
}
