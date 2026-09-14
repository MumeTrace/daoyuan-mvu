import { registerWindowExports } from "./bridge/window-exports";
import { tavernEvents } from "./bridge/event-bus";
import { statDataController } from "./runtime-state";
import { pinia } from "./stores/pinia";
import { useAchievementStore } from "./stores/achievements";
import { useImageLibraryStore } from "./stores/image-library";
import { usePersonaStore } from "./stores/persona";
import { usePortraitStore } from "./stores/portraits";
import { getImageLibraryState } from "./features/image-library";
import { sanitizeNoticeHtmlCompat } from "./utils/sanitize";

interface PortraitLoadOptions {
  autoFetch?: boolean;
  fetchIfMissing?: boolean;
}

const achievements = useAchievementStore(pinia);
const images = useImageLibraryStore(pinia);
const persona = usePersonaStore(pinia);
const portraits = usePortraitStore(pinia);

function populateCharacterData(payload?: unknown): boolean {
  return statDataController.refresh(payload);
}

async function loadRemotePortraits(options: PortraitLoadOptions = {}): Promise<boolean> {
  return images.initialize({
    autoFetch: options.autoFetch ?? options.fetchIfMissing,
  });
}

async function forceUpdateRemotePortraits(button?: unknown): Promise<boolean> {
  const element = button instanceof HTMLButtonElement ? button : null;
  if (element) element.disabled = true;
  try {
    const refreshed = await images.refresh();
    if (refreshed) globalThis.dispatchEvent?.(new CustomEvent("daoyuan_portraits_changed"));
    return refreshed;
  } finally {
    if (element) element.disabled = false;
  }
}

function showAchievement(title: unknown, description: unknown): void {
  achievements.show(title, description);
}

async function notifyDaoyuanMvuChanged(payload?: unknown): Promise<void> {
  try {
    await tavernEvents.emit("daoyuan_mvu_manual_updated", payload);
  } catch (reason) {
    console.warn("[道渊] 广播手动变量更新失败，改为刷新当前状态栏:", reason);
    statDataController.refresh(payload);
  }
}

function refreshUserAvatar(): string {
  return persona.refresh();
}

function syncPortraitPreferences(): void {
  portraits.reload();
  globalThis.dispatchEvent?.(new CustomEvent("daoyuan_portraits_changed"));
}

function getPortraitUrl(name: string, gender?: unknown): string {
  return portraits.getUrl(String(name || ""), gender);
}

function getPortraitDrawerOptions(name: string, gender?: unknown) {
  return portraits.drawerOptions(String(name || ""), gender);
}

function selectPortraitPool(name: string, poolId: string): boolean {
  const changed = portraits.setActiveTheme(String(name || ""), String(poolId || ""));
  if (changed) globalThis.dispatchEvent?.(new CustomEvent("daoyuan_portraits_changed"));
  return changed;
}

function switchPortraitInPool(name: string, poolId: string): boolean {
  if (!selectPortraitPool(name, poolId)) return false;
  return portraits.cycle(String(name || ""));
}

function switchPortrait(name: string): boolean {
  return portraits.cycle(String(name || ""));
}

function getSectMapImageUrl(name: string): string {
  return images.getSectMapUrl(String(name || ""));
}

const unregisterCompatibility = registerWindowExports({
  populateCharacterData,
  loadRemotePortraits,
  forceUpdateRemotePortraits,
  loadRemoteImages: loadRemotePortraits,
  forceUpdateRemoteImages: () => images.refresh(),
  getImageLibraryState,
  showAchievement,
  notifyDaoyuanMvuChanged,
  refreshUserAvatar,
  syncPortraitPreferences,
  getPortraitUrl,
  getPortraitDrawerOptions,
  selectPortraitPool,
  switchPortraitInPool,
  switchPortrait,
  getSectMapImageUrl,
  dyImageCacheMissing: !images.loaded,
  dyPortraitCacheMissing: !images.loaded,
  dySanitizeHtml: sanitizeNoticeHtmlCompat,
});

globalThis.addEventListener?.("pagehide", unregisterCompatibility, { once: true });
