import { ref } from "vue";
import { defineStore } from "pinia";
import { getDaoyuanStorage } from "../bridge/storage";
import { safeImageUrl } from "../utils/safe-url";

export const useUiStore = defineStore("ui", () => {
  const storage = getDaoyuanStorage();
  const statusBarCollapsed = ref(storage.getItem("daoyuan_bar_collapsed") === "true");
  const actionButtonsCollapsed = ref(
    storage.getItem("daoyuan_btns_collapsed") !== "false",
  );
  const editMode = ref(false);
  const activeTab = ref("dashboard");
  const activeModal = ref<string | null>(null);
  const modalParents: string[] = [];
  const modalImageUrl = ref("");
  const factionTitle = ref("");
  const factionNote = ref("");
  const factionImageUrl = ref("");
  const factionContentKind = ref<"plain" | "lore">("plain");
  const portraitEditorName = ref("");
  const portraitEditorTheme = ref("default");
  const portraitMissingName = ref("");
  const portraitMissingTheme = ref("default");
  const noticeTab = ref("版本更新");
  const jiuqiEditPath = ref<string[]>([]);

  function persistPreference(key: string, value: string): void {
    try {
      storage.setItem(key, value);
    } catch (error) {
      // The storage bridge has already retained a volatile session value. UI
      // interactions must continue even when persistence is unavailable.
      console.warn(`[道渊] 界面偏好 ${key} 未能持久化。`, error);
    }
  }

  function setStatusBarCollapsed(value: boolean): void {
    statusBarCollapsed.value = value;
    persistPreference("daoyuan_bar_collapsed", String(value));
  }

  function setActionButtonsCollapsed(value: boolean): void {
    actionButtonsCollapsed.value = value;
    persistPreference("daoyuan_btns_collapsed", String(value));
  }

  function setActiveTab(tabId: string): void {
    activeTab.value = tabId;
  }

  function setActiveModal(modalId: string | null): void {
    modalParents.length = 0;
    activeModal.value = modalId;
  }

  function openChildModal(modalId: string): void {
    const parent = activeModal.value;
    if (parent && parent !== modalId) modalParents.push(parent);
    activeModal.value = modalId;
  }

  function openImageModal(url: string): void {
    const safeUrl = safeImageUrl(url);
    if (!safeUrl) return;
    modalImageUrl.value = safeUrl;
    openChildModal("image");
  }

  function openFactionModal(
    title: string,
    note: string,
    imageUrl = "",
    options: { contentKind?: "plain" | "lore" } = {},
  ): void {
    factionTitle.value = title;
    factionNote.value = note;
    factionImageUrl.value = safeImageUrl(imageUrl);
    factionContentKind.value = options.contentKind ?? "plain";
    setActiveModal("faction");
  }

  function openPortraitEditor(name: string, theme = "default"): void {
    portraitEditorName.value = name;
    portraitEditorTheme.value = theme || "default";
    setActiveModal("portrait-editor");
  }

  function openMissingPortrait(name: string, theme = "default"): void {
    portraitMissingName.value = name;
    portraitMissingTheme.value = theme || "default";
    setActiveModal("portrait-missing");
  }

  function openNotice(tab = "版本更新"): void {
    noticeTab.value = tab;
    setActiveModal("notice");
  }

  function closeModal(): void {
    activeModal.value = modalParents.pop() ?? null;
  }

  function requestEditMode(heroName: string): void {
    if (editMode.value) {
      editMode.value = false;
      return;
    }
    const remembered = storage.getItem(`jiuqi_story_seen_${heroName || "default"}`) === "true";
    if (!remembered) setActiveModal("jiuqi-story");
    else editMode.value = true;
  }

  function completeJiuqiStory(heroName: string): void {
    persistPreference(`jiuqi_story_seen_${heroName || "default"}`, "true");
    editMode.value = true;
    setActiveModal(null);
  }

  function openJiuqiEditor(path: string[]): void {
    jiuqiEditPath.value = [...path];
    openChildModal("jiuqi-edit");
  }

  return {
    statusBarCollapsed,
    actionButtonsCollapsed,
    editMode,
    activeTab,
    activeModal,
    modalImageUrl,
    factionTitle,
    factionNote,
    factionImageUrl,
    factionContentKind,
    portraitEditorName,
    portraitEditorTheme,
    portraitMissingName,
    portraitMissingTheme,
    noticeTab,
    jiuqiEditPath,
    setStatusBarCollapsed,
    setActionButtonsCollapsed,
    setActiveTab,
    setActiveModal,
    openImageModal,
    openFactionModal,
    openPortraitEditor,
    openMissingPortrait,
    openNotice,
    closeModal,
    requestEditMode,
    completeJiuqiStory,
    openJiuqiEditor,
  };
});
