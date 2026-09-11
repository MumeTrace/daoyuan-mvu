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
  const modalImageUrl = ref("");
  const factionTitle = ref("");
  const factionNote = ref("");
  const factionImageUrl = ref("");
  const portraitEditorName = ref("");
  const portraitEditorTheme = ref("default");
  const portraitMissingName = ref("");
  const portraitMissingTheme = ref("default");
  const noticeTab = ref("版本更新");
  const jiuqiEditPath = ref<string[]>([]);

  function setStatusBarCollapsed(value: boolean): void {
    statusBarCollapsed.value = value;
    storage.setItem("daoyuan_bar_collapsed", String(value));
  }

  function setActionButtonsCollapsed(value: boolean): void {
    actionButtonsCollapsed.value = value;
    storage.setItem("daoyuan_btns_collapsed", String(value));
  }

  function setActiveTab(tabId: string): void {
    activeTab.value = tabId;
  }

  function setActiveModal(modalId: string | null): void {
    activeModal.value = modalId;
  }

  function openImageModal(url: string): void {
    const safeUrl = safeImageUrl(url);
    if (!safeUrl) return;
    modalImageUrl.value = safeUrl;
    activeModal.value = "image";
  }

  function openFactionModal(title: string, note: string, imageUrl = ""): void {
    factionTitle.value = title;
    factionNote.value = note;
    factionImageUrl.value = safeImageUrl(imageUrl);
    activeModal.value = "faction";
  }

  function openPortraitEditor(name: string, theme = "default"): void {
    portraitEditorName.value = name;
    portraitEditorTheme.value = theme || "default";
    activeModal.value = "portrait-editor";
  }

  function openMissingPortrait(name: string, theme = "default"): void {
    portraitMissingName.value = name;
    portraitMissingTheme.value = theme || "default";
    activeModal.value = "portrait-missing";
  }

  function openNotice(tab = "版本更新"): void {
    noticeTab.value = tab;
    activeModal.value = "notice";
  }

  function closeModal(): void {
    activeModal.value = null;
  }

  function requestEditMode(heroName: string): void {
    if (editMode.value) {
      editMode.value = false;
      return;
    }
    const remembered = storage.getItem(`jiuqi_story_seen_${heroName || "default"}`) === "true";
    if (!remembered) activeModal.value = "jiuqi-story";
    else editMode.value = true;
  }

  function completeJiuqiStory(heroName: string): void {
    storage.setItem(`jiuqi_story_seen_${heroName || "default"}`, "true");
    editMode.value = true;
    activeModal.value = null;
  }

  function openJiuqiEditor(path: string[]): void {
    jiuqiEditPath.value = [...path];
    activeModal.value = "jiuqi-edit";
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
