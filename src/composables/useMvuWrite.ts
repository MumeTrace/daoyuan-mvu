import { mvuBridge } from "../bridge/mvu-bridge";
import { tavernApi } from "../bridge/tavern-api";
import { tavernEvents } from "../bridge/event-bus";
import { shujukuApi } from "../bridge/shujuku-api";
import type { MvuData } from "../types/stat-data";
import type { VariableOption } from "../types/tavern";
import { deepGet, deepSet, deepUnset } from "../utils/deep-utils";

export function getCurrentMvuScope(): VariableOption {
  const messageId = tavernApi.getCurrentMessageId();
  if (messageId === null) {
    throw new Error("当前界面没有可写入的消息楼层，已取消 MVU 修改。");
  }
  return { type: "message", message_id: messageId };
}

export async function updateMvuData(
  mutate: (data: MvuData) => void | boolean,
  scope?: VariableOption,
): Promise<MvuData> {
  if (shujukuApi.isAvailable()) {
    throw new Error("数据库版不支持未声明路径的整对象写回，请使用类型化字段写入。");
  }
  const resolvedScope = scope ?? getCurrentMvuScope();
  await mvuBridge.waitUntilReady();
  const current = mvuBridge.getMvuData(resolvedScope);
  if (!current?.stat_data) {
    throw new Error("目标消息楼层没有可写入的 MVU stat_data。");
  }
  if (mutate(current) === false) return current;
  await mvuBridge.replaceMvuData(current, resolvedScope);
  await notifyDataChanged(current);
  return current;
}

export async function readWritableData(scope?: VariableOption): Promise<MvuData> {
  if (shujukuApi.isAvailable()) {
    await shujukuApi.ready();
    const current = shujukuApi.readVariables();
    if (!current?.stat_data) throw new Error("数据库版没有可读取的 stat_data。");
    return current;
  }
  const resolvedScope = scope ?? getCurrentMvuScope();
  await mvuBridge.waitUntilReady();
  const current = mvuBridge.getMvuData(resolvedScope);
  if (!current?.stat_data) throw new Error("目标消息楼层没有可写入的 MVU stat_data。");
  return current;
}

export async function notifyDataChanged(data: MvuData): Promise<void> {
  try {
    await tavernEvents.emit("daoyuan_mvu_manual_updated", data);
  } catch (error) {
    console.warn("[道渊] 数据已写入，但界面刷新事件发送失败。", error);
  }
}

function getShujukuRowPath(path: readonly (string | number)[]): readonly (string | number)[] | null {
  for (let length = path.length; length > 0; length -= 1) {
    const candidate = path.slice(0, length);
    if (shujukuApi.resolvePath(candidate)) return candidate;
  }
  return null;
}

async function finishShujukuWrite(): Promise<MvuData> {
  const current = shujukuApi.readVariables();
  if (!current?.stat_data) throw new Error("数据库写入成功，但无法重新读取 stat_data。");
  await notifyDataChanged(current);
  return current;
}

export async function setStatValue(
  path: readonly (string | number)[],
  value: unknown,
  scope?: VariableOption,
): Promise<MvuData> {
  if (shujukuApi.isAvailable()) {
    const rowPath = getShujukuRowPath(path);
    if (!rowPath) throw new Error(`数据库版无法定位写入路径：${path.join(".")}`);
    const remainder = path.slice(rowPath.length);
    let values: Record<string, unknown>;
    if (remainder.length === 0 && value && typeof value === "object" && !Array.isArray(value)) {
      values = value as Record<string, unknown>;
    } else if (remainder.length === 1) {
      values = { [String(remainder[0])]: value };
    } else {
      const current = await readWritableData();
      const row = JSON.parse(JSON.stringify(deepGet(current.stat_data, rowPath, {}))) as Record<string, unknown>;
      deepSet(row, remainder, value);
      values = row;
    }
    if (!(await shujukuApi.update(rowPath, values))) {
      throw new Error(`数据库写入失败：${path.join(".")}`);
    }
    return await finishShujukuWrite();
  }
  return updateMvuData((data) => deepSet(data.stat_data, path, value), scope);
}

export async function removeStatValue(
  path: readonly (string | number)[],
  scope?: VariableOption,
): Promise<MvuData> {
  if (shujukuApi.isAvailable()) {
    if (!(await shujukuApi.remove(path))) {
      throw new Error(`数据库删除失败或目标不可删除：${path.join(".")}`);
    }
    return await finishShujukuWrite();
  }
  return updateMvuData((data) => deepUnset(data.stat_data, path), scope);
}
