import { lorebookApi } from "../bridge/lorebook-api";
import { useJadeLoreStore, type JadeLoreEntry } from "../stores/jade-lore";

export async function loadJadeLorebooks(characterName: string): Promise<void> {
  const store = useJadeLoreStore();
  store.query = "";
  if (!characterName) {
    store.setStatus("请先在玉简中选择一个传讯对象。");
    return;
  }
  if (!lorebookApi.isAvailable("getLorebookEntries")) {
    store.setStatus("当前环境不支持拉取世界书接口。");
    return;
  }

  store.begin("正在拉取当前世界与角色的全部世界书设定...");
  try {
    const names = new Set<string>();
    if (lorebookApi.isAvailable("getOrCreateChatLorebook")) {
      const name = await lorebookApi.getOrCreateChatLorebook().catch(() => null);
      if (name) names.add(name);
    }
    if (lorebookApi.isAvailable("getCurrentCharPrimaryLorebook")) {
      const name = await lorebookApi.getCurrentCharPrimaryLorebook().catch(() => null);
      if (name) names.add(name);
    }
    if (lorebookApi.isAvailable("getCharLorebooks")) {
      const bound = await lorebookApi.getCharLorebookNames({ name: characterName }).catch(() => []);
      bound.forEach((name) => names.add(name));
    }
    if (!names.size) {
      store.setStatus("当前聊天和角色均未绑定任何世界书。");
      return;
    }

    const batches = await Promise.all(
      [...names].map(async (lbName) => {
        const entries = await lorebookApi
          .getLorebookEntries(lbName, { fields: ["uid", "comment", "key", "content"] })
          .catch(() => []);
        return entries.map((entry) => ({ ...entry, lbName }));
      }),
    );
    const seen = new Set<string>();
    const unique = batches.flat().filter((entry): entry is JadeLoreEntry => {
      const content = String(entry.content ?? "").trim();
      if (!content || seen.has(content)) return false;
      seen.add(content);
      return true;
    });
    store.setEntries(unique);
  } catch (error) {
    store.setError(error);
  }
}
