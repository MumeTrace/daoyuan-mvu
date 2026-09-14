import { computed, ref } from "vue";
import { defineStore } from "pinia";
import { getDaoyuanStorage } from "../bridge/storage";

const NOTICE_URL = "https://raw.githubusercontent.com/YttriumCarbide/Daoyuan/main/notice.json";
const VERSION_READ_KEY = "daoyuan_notice_read_version";
const PORTRAIT_READ_KEY = "daoyuan_notice_read_portrait_update";

interface NoticePayload {
  version?: unknown;
  date?: unknown;
  portraitUpdate?: unknown;
  portrait_update?: unknown;
  tabs?: unknown;
}

export const useNoticeStore = defineStore("notice", () => {
  const storage = getDaoyuanStorage();
  const version = ref("");
  const date = ref("");
  const portraitUpdate = ref("");
  const tabs = ref<Record<string, string>>({});
  const loading = ref(false);
  const loaded = ref(false);
  const error = ref("");
  const versionRead = ref(storage.getItem(VERSION_READ_KEY) ?? "");
  const portraitRead = ref(storage.getItem(PORTRAIT_READ_KEY) ?? "");
  const versionUnread = computed(() => Boolean(version.value && versionRead.value !== version.value));
  const portraitUnread = computed(() => Boolean(portraitUpdate.value && portraitRead.value !== portraitUpdate.value));
  const hasUnread = computed(() => versionUnread.value || portraitUnread.value);

  async function load(force = false): Promise<void> {
    if ((loaded.value && !force) || loading.value) return;
    loading.value = true;
    error.value = "";
    try {
      const response = await fetch(`${NOTICE_URL}?t=${Date.now()}`, { cache: "no-store" });
      if (!response.ok) throw new Error(`公告请求失败: HTTP ${response.status}`);
      const payload = await response.json() as NoticePayload;
      version.value = String(payload.version ?? "");
      date.value = String(payload.date ?? "");
      const nextTabs: Record<string, string> = {};
      if (payload.tabs && typeof payload.tabs === "object" && !Array.isArray(payload.tabs)) {
        for (const [name, content] of Object.entries(payload.tabs)) nextTabs[name] = String(content ?? "");
      }
      tabs.value = nextTabs;
      portraitUpdate.value = String(payload.portraitUpdate ?? payload.portrait_update ?? nextTabs["立绘更新"] ?? "");
      loaded.value = true;
    } catch (reason) {
      error.value = reason instanceof Error ? reason.message : String(reason);
    } finally {
      loading.value = false;
    }
  }
  function markVersionRead(): void {
    if (!version.value) return;
    versionRead.value = version.value;
    try {
      storage.setItem(VERSION_READ_KEY, version.value);
    } catch (error) {
      console.warn("[道渊] 公告版本已读状态未能持久化。", error);
    }
  }
  function markPortraitRead(): void {
    if (!portraitUpdate.value) return;
    portraitRead.value = portraitUpdate.value;
    try {
      storage.setItem(PORTRAIT_READ_KEY, portraitUpdate.value);
    } catch (error) {
      console.warn("[道渊] 图片库公告已读状态未能持久化。", error);
    }
  }

  return { version, date, portraitUpdate, tabs, loading, loaded, error, versionUnread, portraitUnread, hasUnread, load, markVersionRead, markPortraitRead };
});
