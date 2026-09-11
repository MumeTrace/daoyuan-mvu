import { createApp } from "vue";
import StatusBar from "./components/layout/StatusBar.vue";
import { pinia } from "./stores/pinia";

const root = document.getElementById("app");

if (root) {
  document.documentElement.dataset.daoyuanVueTabs = "true";
  const app = createApp(StatusBar);
  app.use(pinia);
  app.mount(root);

  globalThis.addEventListener?.(
    "pagehide",
    () => {
      app.unmount();
      delete document.documentElement.dataset.daoyuanVueTabs;
    },
    { once: true },
  );
} else {
  console.error("[道渊] 缺少 #app 挂载点，Vue 状态栏未启动。");
}
