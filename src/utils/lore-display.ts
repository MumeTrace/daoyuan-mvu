export type LoreDisplayBlockType = "heading" | "field" | "text";

export interface LoreDisplayBlock {
  type: LoreDisplayBlockType;
  label: string;
  content: string;
}

interface CandidateBlock extends LoreDisplayBlock {
  breakBefore: boolean;
  score: number;
}

interface LabelMatch {
  index: number;
  end: number;
  label: string;
  wrapped: boolean;
}

const COLON_LABEL_PATTERN =
  /(^|[\t ]+|(?<=[:：]))(?:[-+*•▪◦]\s*)?(?:(?:\*\*([^*\n]{1,32})\*\*)|(?:__([^_\n]{1,32})__)|[【〔［\[]([^】〕］\]\n]{1,32})[】〕］\]]|([\p{L}\p{N}$（）()、/·_-]{1,32}))\s*[:：]\s*/gu;
const BRACKET_LABEL_PATTERN =
  /(^|[\t ]+)(?:[-+*•▪◦]\s*)?[【〔［\[]([^】〕］\]\n]{1,32})[】〕］\]]\s*/gu;
const COMMON_FIELD_PATTERN = /^(?:姓名|名字|称号|别名|身份|性别|年龄|身高|外貌|穿搭|服饰|种族|境界|修为|灵根(?:品级|属性)?|宗门|阵营|关系|好感度|性格|核心性格|能力|核心能力|血脉|天赋|功法|技能|神通|法宝|武器|装备|随身物|经历|背景|状态|地点|描述|效果|消耗|代价|弱点|喜好|厌恶|目标|秘密|备注|补充设定)$/u;
const SECTION_HEADING_PATTERN = /(?:基础|基本|人物|角色|核心|能力|外貌|性格|背景|经历|关系|战斗|设定|信息|资料|介绍|档案|天赋|技能|功法|装备|物品|概要|概述|其他|补充|备注)/u;
const SENTENCE_PUNCTUATION_PATTERN = /[，,。！？!?；;：:]/u;

function cleanLabel(value: unknown): string {
  return String(value ?? "")
    .trim()
    .replace(/^(?:[-+*•▪◦]\s*|(?:\d+|[一二三四五六七八九十]+)[、.．]\s*)/u, "")
    .replace(/^(?:\*\*|__)|(?:\*\*|__)$/gu, "")
    .trim();
}

function isPlausibleLabel(label: string): boolean {
  return Boolean(label)
    && label.length <= 32
    && !SENTENCE_PUNCTUATION_PATTERN.test(label)
    && !/[。！？!?；;]/u.test(label);
}

function fieldScore(label: string, wrapped: boolean): number {
  return 1
    + (COMMON_FIELD_PATTERN.test(label) ? 1 : 0)
    + (wrapped ? 1 : 0);
}

function collectColonMatches(line: string): LabelMatch[] {
  const matches: LabelMatch[] = [];
  COLON_LABEL_PATTERN.lastIndex = 0;
  for (const match of line.matchAll(COLON_LABEL_PATTERN)) {
    const prefix = match[1] ?? "";
    const wrappedLabel = match[2] ?? match[3] ?? match[4];
    const label = cleanLabel(wrappedLabel ?? match[5]);
    if (!isPlausibleLabel(label)) continue;
    matches.push({
      index: (match.index ?? 0) + prefix.length,
      end: (match.index ?? 0) + match[0].length,
      label,
      wrapped: wrappedLabel !== undefined,
    });
  }
  return matches;
}

function collectBracketMatches(line: string): LabelMatch[] {
  const matches: LabelMatch[] = [];
  BRACKET_LABEL_PATTERN.lastIndex = 0;
  for (const match of line.matchAll(BRACKET_LABEL_PATTERN)) {
    const prefix = match[1] ?? "";
    const label = cleanLabel(match[2]);
    if (!isPlausibleLabel(label)) continue;
    matches.push({
      index: (match.index ?? 0) + prefix.length,
      end: (match.index ?? 0) + match[0].length,
      label,
      wrapped: true,
    });
  }
  return matches;
}

function blocksFromMatches(
  line: string,
  matches: LabelMatch[],
  breakBefore: boolean,
): CandidateBlock[] {
  const blocks: CandidateBlock[] = [];
  const introduction = line.slice(0, matches[0]!.index).trim();
  if (introduction) {
    blocks.push({
      type: "text",
      label: "",
      content: introduction,
      breakBefore,
      score: 0,
    });
  }

  matches.forEach((match, index) => {
    const next = matches[index + 1];
    const content = line.slice(match.end, next?.index ?? line.length).trim();
    if (content) {
      blocks.push({
        type: "field",
        label: match.label,
        content,
        breakBefore: blocks.length ? false : breakBefore,
        score: fieldScore(match.label, match.wrapped),
      });
      return;
    }
    blocks.push({
      type: "heading",
      label: "",
      content: match.label,
      breakBefore: blocks.length ? false : breakBefore,
      score: SECTION_HEADING_PATTERN.test(match.label) ? 1.5 : 0.5,
    });
  });
  return blocks;
}

function parseLine(line: string, breakBefore: boolean): CandidateBlock[] {
  const trimmed = line.trim();
  if (!trimmed) return [];

  const markdownHeading = trimmed.match(/^#{1,6}\s+(.+?)\s*#*$/u);
  if (markdownHeading) {
    return [{
      type: "heading",
      label: "",
      content: cleanLabel(markdownHeading[1]),
      breakBefore,
      score: 2,
    }];
  }

  const colonMatches = collectColonMatches(line);
  if (colonMatches.length) {
    return blocksFromMatches(line, colonMatches, breakBefore);
  }

  const bracketMatches = collectBracketMatches(line);
  if (bracketMatches.length) {
    return blocksFromMatches(line, bracketMatches, breakBefore);
  }

  const numberedHeading = trimmed.match(
    /^(?:(?:\d+|[一二三四五六七八九十]+)[、.．]|第[一二三四五六七八九十\d]+(?:章|节|部分))\s*(.{1,24})$/u,
  );
  if (numberedHeading && !SENTENCE_PUNCTUATION_PATTERN.test(numberedHeading[1] ?? "")) {
    return [{
      type: "heading",
      label: "",
      content: cleanLabel(numberedHeading[1]),
      breakBefore,
      score: 1.5,
    }];
  }

  return [{
    type: "text",
    label: "",
    content: trimmed,
    breakBefore,
    score: 0,
  }];
}

function promoteStandaloneHeadings(blocks: CandidateBlock[]): void {
  blocks.forEach((block, index) => {
    if (block.type !== "text" || block.content.length > 24) return;
    if (SENTENCE_PUNCTUATION_PATTERN.test(block.content)) return;
    const next = blocks[index + 1];
    if (!next || next.type !== "field") return;
    if (!block.breakBefore && !SECTION_HEADING_PATTERN.test(block.content)) return;
    block.type = "heading";
    block.score = SECTION_HEADING_PATTERN.test(block.content) ? 1.5 : 1;
  });
}

function isTrustedStructure(blocks: CandidateBlock[]): boolean {
  const fields = blocks.filter((block) => block.type === "field");
  if (fields.length < 2) return false;
  const score = blocks.reduce((total, block) => total + block.score, 0);
  return fields.length >= 4
    || (fields.length >= 3 && score >= 6)
    || score >= 5.5;
}

function foldContinuationText(blocks: CandidateBlock[]): LoreDisplayBlock[] {
  const folded: LoreDisplayBlock[] = [];
  for (const block of blocks) {
    const previous = folded[folded.length - 1];
    if (block.type === "text" && !block.breakBefore && previous?.type === "field") {
      previous.content = `${previous.content}\n${block.content}`.trim();
      continue;
    }
    if (block.type === "text" && previous?.type === "text") {
      previous.content = `${previous.content}${block.breakBefore ? "\n\n" : "\n"}${block.content}`;
      continue;
    }
    if (
      block.type === "heading"
      && previous?.type === "heading"
      && previous.content === block.content
    ) {
      continue;
    }
    folded.push({ type: block.type, label: block.label, content: block.content });
  }
  return folded;
}

/**
 * Parse irregular lorebook text into display-only headings, fields and prose.
 * It never writes normalized content back to the lorebook or model context.
 */
export function parseLoreDisplayBlocks(value: unknown): LoreDisplayBlock[] {
  const source = String(value ?? "").replace(/\r\n?/g, "\n").trim();
  if (!source) return [];

  const blocks: CandidateBlock[] = [];
  let breakBefore = true;
  for (const line of source.split("\n")) {
    if (!line.trim()) {
      breakBefore = true;
      continue;
    }
    const parsed = parseLine(line, breakBefore);
    blocks.push(...parsed);
    breakBefore = false;
  }

  promoteStandaloneHeadings(blocks);
  return isTrustedStructure(blocks) ? foldContinuationText(blocks) : [];
}
