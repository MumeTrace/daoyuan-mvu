import { getDaoyuanStorage } from "../bridge/storage";
import { tavernApi } from "../bridge/tavern-api";
import { findPermittedCharacterLore } from "../features/character-lore";
import { useUiStore } from "../stores/ui";
import { useStatusDialogStore } from "../stores/status-dialog";
import { asRecord } from "../stores/helpers";

export function useLoreSearch() {
  const ui = useUiStore();
  const statusDialog = useStatusDialogStore();

  function warningStorageKey(): string {
    const variables = asRecord(tavernApi.getAllVariables());
    const statData = asRecord(variables.stat_data);
    const hero = asRecord(statData.主角);
    return `dy_lore_warn_${String(hero.姓名 || "unknown")}`;
  }

  function isWarningDismissed(key: string): boolean {
    try {
      return getDaoyuanStorage().getItem(key) === "1";
    } catch {
      return false;
    }
  }

  function dismissWarning(key: string): void {
    try {
      getDaoyuanStorage().setItem(key, "1");
    } catch (error) {
      console.warn("[道渊] 保存天机剧透提醒偏好失败。", error);
    }
  }
  async function findCharacterLore(name: string): Promise<string | null> {
    const records = await findPermittedCharacterLore(name);
    const unique = new Map<string, (typeof records)[number]>();
    records.forEach((record) => {
      const key = record.content.trim().toLocaleLowerCase("zh-CN");
      if (!unique.has(key)) unique.set(key, record);
    });
    const matches = [...unique.values()];
    if (!matches.length) return null;
    if (matches.length === 1) return matches[0]!.content;
    return matches
      .map((record) => `【${record.sourceLabel}】\n${record.content}`)
      .join("\n\n");
  }
  async function openCharacterLore(name: string): Promise<void> {
    const warningKey = warningStorageKey();
    if (!isWarningDismissed(warningKey)) {
      const result = await statusDialog.confirmWithCheckbox(
        `注意！查看【${name}】的角色设定可能包含剧透内容。\n提前了解设定可能会降低剧情探索的乐趣，是否确定查看？`,
        {
          title: "查看角色设定",
          confirmText: "确定查看",
          cancelText: "取消",
          tone: "danger",
          checkboxLabel: "不再提示（当前角色档案）",
          checkboxNote: "修改主角姓名后，此提示会重新出现。",
        },
      );
      if (!result.confirmed) return;
      if (result.checked) dismissWarning(warningKey);
    }
    ui.openFactionModal(
      `🔮 正在探查【${name}】的天机…`,
      "正在翻阅本卡世界书与已安装的工坊扩展，请稍候…",
    );
    try {
      const content = await findCharacterLore(name);
      ui.openFactionModal(
        content ? `✨【${name}】· 天机命理` : `❌【${name}】`,
        content || "天机迷雾遮掩，未能在绑定的世界书中探查到此人的命理。",
        "",
        { contentKind: content ? "lore" : "plain" },
      );
    } catch (error) {
      ui.openFactionModal("❌ 探查失败", error instanceof Error ? error.message : String(error));
    }
  }
  return { findCharacterLore, openCharacterLore };
}
