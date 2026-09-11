import { computed, ref } from "vue";
import { defineStore } from "pinia";
import { tavernApi } from "../bridge/tavern-api";
import { shujukuApi } from "../bridge/shujuku-api";
import { GenerationStoppedError, useChatGenerate } from "../composables/useChatGenerate";
import { notifyDataChanged, readWritableData, removeStatValue, updateMvuData } from "../composables/useMvuWrite";
import { deepGet } from "../utils/deep-utils";
import { asNamedRecord, asRecord } from "./helpers";
import { useSettingsStore } from "./settings";
import type { DataRecord, JadeContactData, JadeMessageData, NamedRecord, StatData } from "../types/stat-data";

export const useJadeStore = defineStore("jade-messenger", () => {
  const contacts = ref<NamedRecord>({});
  const activeContact = ref("");
  const generating = ref(false);
  const streamingReply = ref("");
  const lastError = ref("");
  const entries = computed(() => Object.entries(contacts.value));
  const generation = useChatGenerate();

  function updateFromStatData(statData: StatData): void {
    contacts.value = asNamedRecord(statData.玉简);
    if (activeContact.value && !(activeContact.value in contacts.value)) activeContact.value = "";
  }

  function historyOf(characterName: string): Record<string, JadeMessageData> {
    const contact = contacts.value[characterName] as JadeContactData | undefined;
    return asRecord(contact?.历史记录) as Record<string, JadeMessageData>;
  }

  function nextMessageId(history: Record<string, JadeMessageData>): string {
    let messageId = `msg_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    while (history[messageId]) messageId += "_1";
    return messageId;
  }

  function messageRecord(sender: string, content: string): JadeMessageData {
    return {
      发送者: sender,
      内容: content,
      时间: new Date().toLocaleTimeString("zh-CN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }),
    };
  }

  async function appendMessage(characterName: string, sender: string, content: string): Promise<void> {
    if (shujukuApi.isAvailable()) {
      const result = await shujukuApi.appendJadeMessage(characterName, sender, content);
      if (!result.success) throw new Error("数据库版玉简历史写入失败。");
      const full = await readWritableData();
      updateFromStatData(full.stat_data!);
      await notifyDataChanged(full);
      return;
    }
    const full = await updateMvuData((data) => {
      const stat = data.stat_data!;
      const jade = asNamedRecord(stat.玉简);
      const contact = asRecord(jade[characterName]) as JadeContactData;
      const history = { ...asRecord(contact.历史记录) } as Record<string, JadeMessageData>;
      const messageId = nextMessageId(history);
      history[messageId] = messageRecord(sender, content);
      stat.玉简 = { ...jade, [characterName]: { ...contact, 历史记录: history } };
    });
    updateFromStatData(full.stat_data!);
  }

  async function deleteMessage(characterName: string, messageId: string): Promise<void> {
    if (shujukuApi.isAvailable()) {
      await shujukuApi.deleteJadeMessage(characterName, messageId);
      const full = await readWritableData();
      updateFromStatData(full.stat_data!);
      await notifyDataChanged(full);
      return;
    }
    const full = await updateMvuData((data) => {
      const stat = data.stat_data!;
      const jade = asNamedRecord(stat.玉简);
      const contact = asRecord(jade[characterName]) as JadeContactData;
      const history = { ...asRecord(contact.历史记录) } as Record<string, JadeMessageData>;
      if (!(messageId in history)) return false;
      delete history[messageId];
      stat.玉简 = { ...jade, [characterName]: { ...contact, 历史记录: history } };
    });
    updateFromStatData(full.stat_data!);
  }

  async function replaceMessage(
    characterName: string,
    messageId: string,
    sender: string,
    content: string,
  ): Promise<void> {
    if (shujukuApi.isAvailable()) {
      const history = { ...historyOf(characterName) };
      if (!(messageId in history)) throw new Error("要重试的玉简回复已不存在。");
      delete history[messageId];
      history[nextMessageId(history)] = messageRecord(sender, content);
      if (!(await shujukuApi.writeJadeHistory(characterName, history))) {
        throw new Error("数据库版玉简回复替换失败。");
      }
      const full = await readWritableData();
      updateFromStatData(full.stat_data!);
      await notifyDataChanged(full);
      return;
    }
    const full = await updateMvuData((data) => {
      const stat = data.stat_data!;
      const jade = asNamedRecord(stat.玉简);
      const contact = asRecord(jade[characterName]) as JadeContactData;
      const history = { ...asRecord(contact.历史记录) } as Record<string, JadeMessageData>;
      if (!(messageId in history)) return false;
      delete history[messageId];
      history[nextMessageId(history)] = messageRecord(sender, content);
      stat.玉简 = { ...jade, [characterName]: { ...contact, 历史记录: history } };
    });
    updateFromStatData(full.stat_data!);
  }

  function buildPrompt(characterName: string, excludedMessageId = ""): string {
    const settings = useSettingsStore();
    const variables = tavernApi.getAllVariables() ?? {};
    const stat = asRecord(deepGet(variables, "stat_data", {}));
    const hero = asRecord(stat.主角);
    const world = asRecord(stat.世界);
    const historyText = Object.entries(historyOf(characterName))
      .filter(([messageId]) => messageId !== excludedMessageId)
      .map(([, message]) => `[${String(message.发送者 ?? "未知")}]: ${String(message.内容 ?? "")}`)
      .join("\n");
    const skills = asRecord(hero.功法);
    const skillNames = Object.entries(skills).map(([name, value]) => `${name}(${String(asRecord(value).境界 ?? "未知")})`).join("、");
    const target = asRecord(asRecord(stat.道侣)[characterName] ?? asRecord(stat.人物)[characterName] ?? asRecord(stat.灵宠)[characterName]);
    const jadeData = asRecord(asRecord(stat.玉简)[characterName]);
    const merged: DataRecord = { ...target, ...Object.fromEntries(["境界", "性别", "关系", "好感度"].filter((key) => jadeData[key] != null).map((key) => [key, jadeData[key]])) };
    const targetText = Object.entries(merged).filter(([, value]) => value == null || typeof value !== "object").map(([key, value]) => `${key}: ${String(value ?? "")}`).join("\n");
    const loreText = (settings.loreSelections[characterName] ?? []).map((entry) => entry.content).filter(Boolean).join("\n\n");
    return [
      `[玉简传讯历史记录]\n${historyText}`,
      settings.jade.customPrompt ? `【附加设定/规则】\n${settings.jade.customPrompt}` : "",
      loreText ? `【角色已知世界书背景】\n${loreText}` : "",
      `[主角当前状态]\n境界: ${String(hero.境界 ?? "未知")}\n所在界域: ${String(hero.所在界 ?? "未知")}\n当前地点: ${String(world.当前地点 ?? "未知")}\n当前时间: ${String(world.当前时间 ?? "未知")}\n灵根: ${String(hero.灵根 ?? "无")}\n功法: ${skillNames || "无"}`,
      targetText ? `[你的当前状态/面板设定]\n${targetText}` : "",
    ].filter(Boolean).join("\n\n");
  }

  async function sendMessage(characterName: string, content: string): Promise<void> {
    if (!characterName || !content.trim() || generating.value) return;
    generating.value = true;
    streamingReply.value = "";
    lastError.value = "";
    try {
      await appendMessage(characterName, "我", content.trim());
      const reply = await generation.generateReply(
        buildPrompt(characterName),
        `[玉简传讯系统] 主角发来最新传讯：\n"${content.trim()}"`,
        characterName,
        { onUpdate: (text) => { streamingReply.value = text; } },
      );
      await appendMessage(characterName, characterName, reply);
    } catch (error) {
      lastError.value = error instanceof GenerationStoppedError
        ? "已停止生成，对方尚未回复。"
        : error instanceof Error ? error.message : String(error);
      throw error;
    } finally {
      generating.value = false;
      streamingReply.value = "";
    }
  }

  async function retryMessage(characterName: string, messageId: string): Promise<void> {
    if (generating.value) return;
    generating.value = true;
    streamingReply.value = "";
    lastError.value = "";
    try {
      if (!historyOf(characterName)[messageId]) throw new Error("要重试的玉简回复已不存在。");
      const reply = await generation.generateReply(
        buildPrompt(characterName, messageId),
        "[玉简传讯系统] 请继续通过玉简传讯回复主角的上一条消息。",
        characterName,
        { onUpdate: (text) => { streamingReply.value = text; } },
      );
      await replaceMessage(characterName, messageId, characterName, reply);
    } catch (error) {
      lastError.value = error instanceof GenerationStoppedError
        ? "已停止重新生成。"
        : error instanceof Error ? error.message : String(error);
      throw error;
    } finally {
      generating.value = false;
      streamingReply.value = "";
    }
  }

  function stopGeneration(): void {
    if (!generating.value) return;
    if (!generation.stop()) {
      lastError.value = "当前宿主没有提供可安全停止单次生成的接口。";
    }
  }

  async function removeContact(characterName: string): Promise<void> {
    const full = await removeStatValue(["玉简", characterName]);
    updateFromStatData(full.stat_data!);
  }

  return { contacts, activeContact, generating, streamingReply, lastError, entries, updateFromStatData, historyOf, appendMessage, deleteMessage, replaceMessage, sendMessage, retryMessage, stopGeneration, removeContact };
});
