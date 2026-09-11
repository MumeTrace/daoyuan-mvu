import { lorebookApi, type LorebookEntry } from "../bridge/lorebook-api";
import { useUiStore } from "../stores/ui";
import { useStatusDialogStore } from "../stores/status-dialog";

function matches(entry: LorebookEntry, name: string): boolean {
  const needle = name.toLocaleLowerCase();
  const keys = Array.isArray(entry.key) ? entry.key : [entry.key];
  return keys.some((key) => String(key ?? "").toLocaleLowerCase() === needle)
    || String(entry.comment ?? "").toLocaleLowerCase().includes(needle);
}

export function useLoreSearch() {
  const ui = useUiStore();
  const statusDialog = useStatusDialogStore();
  async function findCharacterLore(name: string): Promise<string | null> {
    if (!lorebookApi.isAvailable("getLorebookEntries")) throw new Error("当前环境不支持世界书接口。");
    const books = new Set<string>();
    if (lorebookApi.isAvailable("getOrCreateChatLorebook")) {
      const book = await lorebookApi.getOrCreateChatLorebook().catch(() => null);
      if (book) books.add(book);
    }
    if (lorebookApi.isAvailable("getCurrentCharPrimaryLorebook")) {
      const book = await lorebookApi.getCurrentCharPrimaryLorebook().catch(() => null);
      if (book) books.add(book);
    }
    if (lorebookApi.isAvailable("getCharLorebooks")) {
      (await lorebookApi.getCharLorebookNames({ name }).catch(() => [])).forEach((book) => books.add(book));
    }
    for (const book of books) {
      const entries = await lorebookApi.getLorebookEntries(book, { fields: ["comment", "key", "content"] }).catch(() => []);
      const match = entries.find((entry) => matches(entry, name));
      if (match?.content) return String(match.content);
    }
    return null;
  }
  async function openCharacterLore(name: string): Promise<void> {
    const accepted = await statusDialog.confirm(
      `查看【${name}】的世界书设定可能包含剧透，是否继续？`,
      { title: "天机剧透提醒", confirmText: "继续查看", cancelText: "暂不查看", tone: "danger" },
    );
    if (!accepted) return;
    ui.openFactionModal(`🔮 正在探查【${name}】的天机…`, "正在翻阅当前聊天与角色绑定的世界书，请稍候…");
    try {
      const content = await findCharacterLore(name);
      ui.openFactionModal(content ? `✨【${name}】· 天机命理` : `❌【${name}】`, content || "天机迷雾遮掩，未能在绑定的世界书中探查到此人的命理。");
    } catch (error) {
      ui.openFactionModal("❌ 探查失败", error instanceof Error ? error.message : String(error));
    }
  }
  return { findCharacterLore, openCharacterLore };
}
