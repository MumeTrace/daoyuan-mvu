import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const distDir = path.join(projectRoot, "dist");
const deliverables = new Set([
  "regex-mvu.json",
  "regex-shujuku.json",
  "daoyuan-floating-mvu.json",
]);

if (!fs.existsSync(distDir)) {
  console.log("[道渊构建] dist 不存在，无需清理");
  process.exit(0);
}

const removed = [];
for (const entry of fs.readdirSync(distDir, { withFileTypes: true })) {
  if (entry.isFile() && deliverables.has(entry.name)) continue;

  const entryPath = path.resolve(distDir, entry.name);
  const distPrefix = `${distDir}${path.sep}`;
  if (!entryPath.startsWith(distPrefix)) {
    throw new Error(`拒绝清理 dist 目录之外的路径：${entryPath}`);
  }

  fs.rmSync(entryPath, { force: true, recursive: true });
  removed.push(entry.name);
}

const remaining = fs.readdirSync(distDir).sort();
const unexpected = remaining.filter(name => !deliverables.has(name));
if (unexpected.length > 0) {
  throw new Error(`dist 仍包含非交付文件：${unexpected.join(", ")}`);
}

console.log(
  `[道渊构建] dist 已裁剪；保留=${remaining.join(", ") || "无"}；删除=${removed.join(", ") || "无"}`,
);
