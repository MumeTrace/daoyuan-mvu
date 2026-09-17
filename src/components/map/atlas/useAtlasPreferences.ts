import { onBeforeUnmount, onMounted, ref } from "vue";
import { getDaoyuanStorage } from "../../../bridge/storage";
import type { AtlasDefinition } from "./atlas-types";

const EVENT = "daoyuan_atlas_preferences_changed";
const keys = { xuantian: "daoyuan_atlas_open_xuantian", xianjie: "daoyuan_atlas_open_xianjie" };
export function useAtlasPreferences() {
  const storage = getDaoyuanStorage();
  const opened = ref({ xuantian: true, xianjie: false });
  const persistenceError = ref(false);
  const targets: Window[] = [window];
  for (const candidate of [window.parent, window.top]) {
    try { if (candidate && !targets.includes(candidate)) { void candidate.document; targets.push(candidate); } } catch { /* Cross-origin host is handled by the storage bridge. */ }
  }
  function refresh() {
    try {
      opened.value = { xuantian: storage.getItem(keys.xuantian) !== "false", xianjie: storage.getItem(keys.xianjie) === "true" };
    } catch { /* Retain the in-session user choice on inaccessible storage. */ }
  }
  function setOpened(id: AtlasDefinition["id"], value: boolean) {
    opened.value[id] = value;
    try { storage.setItem(keys[id], String(value)); persistenceError.value = false; }
    catch { persistenceError.value = true; }
    targets.forEach(target => target.dispatchEvent(new Event(EVENT)));
  }
  refresh();
  onMounted(() => {
    targets.forEach(target => { target.addEventListener(EVENT, refresh); target.addEventListener("storage", refresh); });
    window.addEventListener("pageshow", refresh);
    document.addEventListener("visibilitychange", refresh);
  });
  onBeforeUnmount(() => {
    targets.forEach(target => { target.removeEventListener(EVENT, refresh); target.removeEventListener("storage", refresh); });
    window.removeEventListener("pageshow", refresh);
    document.removeEventListener("visibilitychange", refresh);
  });
  return { opened, setOpened, persistenceError };
}
