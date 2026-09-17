import { ref } from "vue";
import { defineStore } from "pinia";
import { getDaoyuanStorage } from "../bridge/storage";
import { safeImageUrl } from "../utils/safe-url";
import type { MapLocation } from "../data/lore-xuantian";

export const useUiStore = defineStore("ui", () => {
  const storage = getDaoyuanStorage();
  const statusBarCollapsed = ref(storage.getItem("daoyuan_bar_collapsed") === "true");
  const actionButtonsCollapsed = ref(
    storage.getItem("daoyuan_btns_collapsed") !== "false",
  );
  const editMode = ref(false);
  const activeTab = ref("dashboard");
  const activeModal = ref<string | null>(null);
  type FactionSnapshot = { title: string; note: string; image: string; portrait: string; mapContext: boolean; kind: "plain" | "lore" };
  const modalParents: Array<{ id: string; faction?: FactionSnapshot }> = [];
  const modalRevision = ref(0);
  const modalImageUrl = ref("");
  const factionTitle = ref("");
  const factionNote = ref("");
  const factionImageUrl = ref("");
  const factionPortraitName = ref("");
  const factionMapContext = ref(false);
  const factionContentKind = ref<"plain" | "lore">("plain");
  const mapLocation = ref<MapLocation | null>(null);
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
    modalRevision.value++;
    modalParents.length = 0;
    activeModal.value = modalId;
  }

  function openChildModal(modalId: string): void {
    const parent = activeModal.value;
    if (parent) modalParents.push({ id: parent, faction: parent === "faction" ? {
      title: factionTitle.value, note: factionNote.value, image: factionImageUrl.value,
      portrait: factionPortraitName.value, mapContext: factionMapContext.value, kind: factionContentKind.value,
    } : undefined });
    modalRevision.value++;
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
    options: { contentKind?: "plain" | "lore"; asChild?: boolean; replaceCurrent?: boolean; portraitName?: string; mapContext?: boolean } = {},
  ): void {
    if (options.asChild) openChildModal("faction");
    else if (options.replaceCurrent && activeModal.value === "faction") modalRevision.value++;
    else setActiveModal("faction");
    factionTitle.value = title;
    factionNote.value = note;
    factionImageUrl.value = safeImageUrl(imageUrl);
    factionPortraitName.value = options.portraitName ?? "";
    factionMapContext.value = options.mapContext ?? false;
    factionContentKind.value = options.contentKind ?? "plain";
  }

  function openMapLocation(location: MapLocation): void {
    mapLocation.value = location;
    setActiveModal("map-location");
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
    modalRevision.value++;
    const parent = modalParents.pop();
    if (parent?.faction) {
      factionTitle.value = parent.faction.title;
      factionNote.value = parent.faction.note;
      factionImageUrl.value = parent.faction.image;
      factionPortraitName.value = parent.faction.portrait;
      factionMapContext.value = parent.faction.mapContext;
      factionContentKind.value = parent.faction.kind;
    }
    activeModal.value = parent?.id ?? null;
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
    modalRevision,
    modalImageUrl,
    factionTitle,
    factionNote,
    factionImageUrl,
    factionPortraitName,
    factionMapContext,
    factionContentKind,
    mapLocation,
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
    openMapLocation,
    openPortraitEditor,
    openMissingPortrait,
    openNotice,
    closeModal,
    requestEditMode,
    completeJiuqiStory,
    openJiuqiEditor,
  };
});
