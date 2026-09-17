import { createApp } from "vue";
import StatusBar from "./components/layout/StatusBar.vue";
import { pinia } from "./stores/pinia";

const MOUNT_TIMEOUT_MS = 10_000;
let mountObserver: MutationObserver | undefined;
let mountTimeout: ReturnType<typeof setTimeout> | undefined;
let mountedApp: ReturnType<typeof createApp> | undefined;
let pageHidden = false;

function stopWaitingForRoot(): void {
  document.removeEventListener("DOMContentLoaded", mountStatusBar);
  mountObserver?.disconnect();
  mountObserver = undefined;
  if (mountTimeout !== undefined) {
    clearTimeout(mountTimeout);
    mountTimeout = undefined;
  }
}

function mountStatusBar(): void {
  if (pageHidden || mountedApp || document.readyState === "loading") return;

  const root = document.getElementById("app");
  if (!root) return;

  stopWaitingForRoot();
  document.documentElement.dataset.daoyuanVueTabs = "true";
  const app = createApp(StatusBar);
  mountedApp = app;
  app.use(pinia);
  app.mount(root);
}

function handlePageHide(): void {
  pageHidden = true;
  stopWaitingForRoot();
  mountedApp?.unmount();
  mountedApp = undefined;
  delete document.documentElement.dataset.daoyuanVueTabs;
}

globalThis.addEventListener?.("pagehide", handlePageHide, { once: true });
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", mountStatusBar, { once: true });
}

mountStatusBar();
if (!mountedApp) {
  mountObserver = new MutationObserver(mountStatusBar);
  mountObserver.observe(document, { childList: true, subtree: true });
  mountTimeout = setTimeout(() => {
    if (pageHidden || mountedApp) return;
    stopWaitingForRoot();
    console.error(
      `[道渊] 等待 #app 挂载点超时，Vue 状态栏未启动（文档状态：${document.readyState}；楼层 iframe：${window.self !== window.top}）。`,
    );
  }, MOUNT_TIMEOUT_MS);
  // The mount node may have appeared between the first check and observe().
  mountStatusBar();
}
