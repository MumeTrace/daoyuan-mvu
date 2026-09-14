export type CharacterSubjectEvidence =
  | "known-character"
  | "workshop-character"
  | "entry-subject"
  | "nested-profile";

export interface CharacterSubject {
  name: string;
  aliases: string[];
  evidence: CharacterSubjectEvidence;
}

export interface CharacterSubjectOptions {
  entryAliases: readonly string[];
  knownCharacterNames?: readonly string[];
  workshopCharacterName?: string;
  workshopAliases?: readonly string[];
}

interface ParsedBlock {
  type: "heading" | "field";
  label: string;
  content: string;
  lineIndex: number;
}

interface LabelMatch {
  index: number;
  end: number;
  label: string;
}

const FIELD_MARKER_PATTERN =
  /(^|[\t ]+|[，,；;]|(?<=[:：]))(?:[-+*•▪◦]\s*)?(?:(?:\*\*([^*\n]{1,32})\*\*)|(?:__([^_\n]{1,32})__)|[【〔［\[]([^】〕］\]\n]{1,32})[】〕］\]]|([\p{L}\p{N}$（）()、/·_-]{1,32}))\s*[:：]\s*/gu;
const BRACKET_MARKER_PATTERN =
  /(^|[\t ]+)(?:[-+*•▪◦]\s*)?[【〔［\[]([^】〕］\]\n]{1,32})[】〕］\]]\s*/gu;
const IDENTITY_LABELS = new Set(["姓名", "名字", "角色名", "人物姓名", "npc姓名"]);
const ALIAS_LABELS = new Set(["别名", "称号", "道号"]);
const PERSON_FIELD_LABELS = new Set([
  "性别", "年龄", "身份", "外貌", "容貌", "性格", "身高", "种族",
  "境界", "修为", "关系", "关系阶段", "好感度", "亲密", "亲密度",
  "能力", "核心能力", "血脉", "天赋", "经历", "背景", "状态", "穿搭",
  "服饰", "衣着", "神通", "职业", "阵营",
]);
const PERSON_HEADING_PATTERN =
  /(?:人物|角色|npc|个人|档案|长老|宗主|掌门|弟子|师尊|师父|道侣|仙子|女修|男修|修士|成员)/iu;
const NON_PERSON_HEADING_PATTERN =
  /(?:宗门|地点|区域|场景|建筑|城市|城池|势力|组织|物品|法宝|功法|地图|环境|历史|规则|任务|事件|世界|国家|家族)/iu;
const GENERIC_PROFILE_HEADING_PATTERN =
  /(?:基础|基本|信息|资料|介绍|设定|概要|概述)/u;
const UNKNOWN_NAME_PATTERN = /^(?:无|未知|暂无|不详|保密|未命名|没有|空)$/u;

function cleanText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalize(value: unknown): string {
  return cleanText(value).toLocaleLowerCase("zh-CN");
}

function uniqueText(values: readonly unknown[]): string[] {
  return [...new Set(values.map(cleanText).filter(Boolean))];
}

function cleanLabel(value: unknown): string {
  return cleanText(value)
    .replace(/^(?:[-+*•▪◦]\s*|(?:\d+|[一二三四五六七八九十]+)[、.．]\s*)/u, "")
    .replace(/^(?:\*\*|__)|(?:\*\*|__)$/gu, "")
    .trim();
}

function isPlausibleLabel(label: string): boolean {
  return Boolean(label)
    && label.length <= 32
    && !/[，,。！？!?；;：:]/u.test(label);
}

function cleanCharacterName(value: unknown): string {
  const raw = cleanText(value)
    .replace(/^(?:\*\*|__)+|(?:\*\*|__)+$/gu, "")
    .replace(/^[【〔［\[（("“‘《]+|[】〕］\]）)"”’》]+$/gu, "")
    .split(/[，,；;。！？!?\n]/u, 1)[0]!
    .trim();
  if (!raw || raw.length > 48 || UNKNOWN_NAME_PATTERN.test(raw)) return "";
  if (/[:：]/u.test(raw)) return "";
  return raw;
}

function comparableName(value: unknown): string {
  return normalize(value)
    .replace(/[【】〔〕［］\[\]（）()《》“”'"·\s_-]/gu, "")
    .replace(/^(?:人物|角色|npc)/iu, "")
    .replace(/(?:人物|角色)?(?:档案|设定|资料|信息)$/iu, "");
}

function aliasIdentifiesName(alias: string, name: string): boolean {
  const left = comparableName(alias);
  const right = comparableName(name);
  return Boolean(left && right && left === right);
}

function collectMatches(line: string, pattern: RegExp): LabelMatch[] {
  const matches: LabelMatch[] = [];
  pattern.lastIndex = 0;
  for (const match of line.matchAll(pattern)) {
    const prefix = match[1] ?? "";
    const label = cleanLabel(match[2] ?? match[3] ?? match[4] ?? match[5]);
    if (!isPlausibleLabel(label)) continue;
    matches.push({
      index: (match.index ?? 0) + prefix.length,
      end: (match.index ?? 0) + match[0].length,
      label,
    });
  }
  return matches;
}

function blocksFromMatches(
  line: string,
  lineIndex: number,
  matches: LabelMatch[],
): ParsedBlock[] {
  return matches.map((match, index) => {
    const next = matches[index + 1];
    const content = line.slice(match.end, next?.index ?? line.length).trim();
    return {
      type: content ? "field" : "heading",
      label: match.label,
      content,
      lineIndex,
    };
  });
}

function parseTableRow(line: string, lineIndex: number): ParsedBlock[] {
  if (!line.trim().startsWith("|") || !line.trim().endsWith("|")) return [];
  const cells = line
    .split("|")
    .slice(1, -1)
    .map((cell) => cleanText(cell));
  if (cells.length < 2) return [];
  const blocks: ParsedBlock[] = [];
  for (let index = 0; index + 1 < cells.length; index += 2) {
    const label = cleanLabel(cells[index]);
    const content = cleanText(cells[index + 1]);
    if (!isPlausibleLabel(label) || !content || /^:?-{2,}:?$/u.test(content)) continue;
    blocks.push({ type: "field", label, content, lineIndex });
  }
  return blocks;
}

function parseLine(line: string, lineIndex: number): ParsedBlock[] {
  const trimmed = line.trim();
  if (!trimmed) return [];

  const table = parseTableRow(line, lineIndex);
  if (table.length) return table;

  const markdownHeading = trimmed.match(/^#{1,6}\s+(.+?)\s*#*$/u);
  if (markdownHeading) {
    return [{
      type: "heading",
      label: cleanLabel(markdownHeading[1]),
      content: "",
      lineIndex,
    }];
  }

  const colonMatches = collectMatches(line, FIELD_MARKER_PATTERN);
  if (colonMatches.length) return blocksFromMatches(line, lineIndex, colonMatches);

  const bracketMatches = collectMatches(line, BRACKET_MARKER_PATTERN);
  if (bracketMatches.length) return blocksFromMatches(line, lineIndex, bracketMatches);

  const numberedHeading = trimmed.match(
    /^(?:(?:\d+|[一二三四五六七八九十]+)[、.．]|第[一二三四五六七八九十\d]+(?:章|节|部分))\s*(.{1,32})$/u,
  );
  if (numberedHeading && isPlausibleLabel(cleanLabel(numberedHeading[1]))) {
    return [{
      type: "heading",
      label: cleanLabel(numberedHeading[1]),
      content: "",
      lineIndex,
    }];
  }
  return [];
}

function parseBlocks(content: string): ParsedBlock[] {
  return content
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .flatMap((line, index) => parseLine(line, index));
}

function nearestHeadingIndex(blocks: readonly ParsedBlock[], index: number): number {
  for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
    if (blocks[cursor]?.type === "heading") return cursor;
  }
  return -1;
}

function nextHeadingIndex(blocks: readonly ParsedBlock[], index: number): number {
  for (let cursor = index + 1; cursor < blocks.length; cursor += 1) {
    if (blocks[cursor]?.type === "heading") return cursor;
  }
  return blocks.length;
}

function sectionBlocks(blocks: readonly ParsedBlock[], index: number): ParsedBlock[] {
  const start = nearestHeadingIndex(blocks, index);
  const end = nextHeadingIndex(blocks, index);
  return blocks.slice(start + 1, end);
}

function aliasesFromSection(blocks: readonly ParsedBlock[]): string[] {
  return uniqueText(
    blocks
      .filter((block) => block.type === "field" && ALIAS_LABELS.has(normalize(block.label)))
      .flatMap((block) =>
        block.content
          .split(/[、，,；;|/]/u)
          .map((part) => cleanCharacterName(part)),
      ),
  );
}

function addSubject(
  subjects: Map<string, CharacterSubject>,
  subject: CharacterSubject,
): void {
  const identity = normalize(subject.name);
  if (!identity) return;
  const existing = subjects.get(identity);
  if (!existing) {
    subjects.set(identity, {
      ...subject,
      aliases: uniqueText([subject.name, ...subject.aliases]),
    });
    return;
  }
  existing.aliases = uniqueText([...existing.aliases, ...subject.aliases]);
  const priority: CharacterSubjectEvidence[] = [
    "workshop-character",
    "known-character",
    "entry-subject",
    "nested-profile",
  ];
  if (priority.indexOf(subject.evidence) < priority.indexOf(existing.evidence)) {
    existing.evidence = subject.evidence;
  }
}

/**
 * Discover character subjects without treating every name mentioned in prose as
 * an independent character. Identity fields must belong to the entry subject or
 * to a structured nested person profile.
 */
export function discoverCharacterSubjects(
  content: string,
  options: CharacterSubjectOptions,
): CharacterSubject[] {
  const entryAliases = uniqueText(options.entryAliases);
  const workshopAliases = uniqueText(options.workshopAliases ?? []);
  const allEntryAliases = uniqueText([...entryAliases, ...workshopAliases]);
  const subjects = new Map<string, CharacterSubject>();

  const workshopName = cleanCharacterName(options.workshopCharacterName);
  if (workshopName) {
    addSubject(subjects, {
      name: workshopName,
      aliases: uniqueText([workshopName, ...allEntryAliases]),
      evidence: "workshop-character",
    });
  }

  for (const candidate of options.knownCharacterNames ?? []) {
    const name = cleanCharacterName(candidate);
    if (!name || !allEntryAliases.some((alias) => aliasIdentifiesName(alias, name))) continue;
    addSubject(subjects, {
      name,
      aliases: uniqueText([name, ...allEntryAliases]),
      evidence: "known-character",
    });
  }

  const blocks = parseBlocks(content);
  blocks.forEach((block, index) => {
    if (block.type !== "field" || !IDENTITY_LABELS.has(normalize(block.label))) return;
    const name = cleanCharacterName(block.content);
    if (!name) return;

    const headingIndex = nearestHeadingIndex(blocks, index);
    const heading = headingIndex >= 0 ? blocks[headingIndex]!.label : "";
    const section = sectionBlocks(blocks, index);
    const personFieldCount = new Set(
      section
        .filter((candidate) =>
          candidate.type === "field"
          && PERSON_FIELD_LABELS.has(normalize(candidate.label)),
        )
        .map((candidate) => normalize(candidate.label)),
    ).size;
    const entrySubject = allEntryAliases.some((alias) => aliasIdentifiesName(alias, name));
    const personHeading = PERSON_HEADING_PATTERN.test(heading);
    const nonPersonHeading = NON_PERSON_HEADING_PATTERN.test(heading) && !personHeading;
    const genericHeading = !heading || GENERIC_PROFILE_HEADING_PATTERN.test(heading);
    const nearBeginning = block.lineIndex <= 5;

    if (!entrySubject) {
      if (personHeading) {
        if (personFieldCount < 1) return;
      } else if (nonPersonHeading || !genericHeading || !nearBeginning || personFieldCount < 1) {
        return;
      }
    }

    const matchedEntryAliases = entrySubject
      ? allEntryAliases.filter((alias) => aliasIdentifiesName(alias, name))
      : [];
    addSubject(subjects, {
      name,
      aliases: uniqueText([
        name,
        ...matchedEntryAliases,
        ...aliasesFromSection(section),
      ]),
      evidence: entrySubject ? "entry-subject" : "nested-profile",
    });
  });

  return [...subjects.values()];
}

export function entryAliasMatchesName(
  aliases: readonly string[],
  name: string,
): boolean {
  return aliases.some((alias) => aliasIdentifiesName(alias, name));
}
