import assert from "node:assert/strict";

import {
  collectWorkshopBookNames,
  readWorkshopMatchedLoreEntries,
} from "../src/features/character-lore/scope.ts";
import {
  discoverCharacterSubjects,
} from "../src/features/character-lore/subject.ts";

const reads = [];
const books = new Map([
  ["本卡主书", [
    { key: ["本卡人物"], content: "姓名：本卡人物\n身份：本卡测试人物" },
  ]],
  ["本卡附加书", [
    { key: ["workshop-unattached"], content: "姓名：孤月\n身份：工坊测试人物" },
    {
      key: ["workshop-place"],
      content: "地点：问道峰\n宗门长老姓名：误判人物\n身份：宗门长老",
    },
    { key: ["ordinary-entry"], content: "姓名：越界人物\n身份：不应读取" },
  ]],
  ["其他角色普通书", [
    { key: ["outside-entry"], content: "姓名：范围外人物\n身份：不应读取" },
  ]],
]);

const workshopEntries = [
  {
    packageId: "attached",
    packageDisplayName: "附加工坊包",
    version: "1.0.0",
    entryId: "attached-character",
    kind: "character",
    displayName: "附加人物",
    primaryKeys: ["workshop-attached"],
  },
  {
    packageId: "unattached",
    packageDisplayName: "未绑定工坊包",
    version: "1.0.0",
    entryId: "unattached-character",
    kind: "worldbook",
    displayName: "",
    primaryKeys: ["workshop-unattached"],
  },
  {
    packageId: "place",
    packageDisplayName: "地点工坊包",
    version: "1.0.0",
    entryId: "place-entry",
    kind: "worldbook",
    displayName: "",
    primaryKeys: ["workshop-place"],
  },
];

const bookNames = collectWorkshopBookNames(
  "本卡主书",
  ["本卡附加书"],
);
assert(!bookNames.includes("本卡主书"), "本卡主书不应重复按工坊来源读取");
assert.deepEqual(bookNames, ["本卡附加书"]);

const matches = await readWorkshopMatchedLoreEntries(
  bookNames,
  workshopEntries,
  async (name) => {
    reads.push(name);
    return books.get(name) ?? [];
  },
  2,
);
assert(matches.some((match) => match.bookName === "本卡附加书"));
assert(!reads.includes("其他角色普通书"), "读取范围越出了当前角色附加世界书");
assert(!matches.some((match) => match.entry.key?.includes?.("ordinary-entry")));

const names = new Set(matches.flatMap((match) =>
  discoverCharacterSubjects(String(match.entry.content ?? ""), {
    entryAliases: Array.isArray(match.entry.key) ? match.entry.key : [],
    workshopCharacterName: match.workshopEntry.kind === "character"
      ? match.workshopEntry.displayName
      : "",
    workshopAliases: match.workshopEntry.primaryKeys,
  }).map((subject) => subject.name),
));
assert(names.has("孤月"), "当前角色附加世界书内的工坊人物未进入查询范围");
assert(!names.has("误判人物"), "宗门长老姓名被错误识别为独立人物");
assert(!names.has("越界人物"), "未获工坊索引授权的普通世界书被纳入查询范围");
assert(!names.has("范围外人物"), "其他角色的普通世界书被纳入查询范围");

console.log("人物世界书范围验证通过");
