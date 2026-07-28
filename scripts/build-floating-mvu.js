import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const distHtmlPath = path.join(projectRoot, "dist/index.html");
const outputPath = path.join(projectRoot, "dist/daoyuan-floating-mvu.json");
const legacyOutputPath = path.join(
  projectRoot,
  "dist/daoyuan-floating-mvu.js",
);

if (!fs.existsSync(distHtmlPath)) {
  throw new Error(
    `Build output not found at ${distHtmlPath}. Run the MVU Vite build first.`,
  );
}

const bootstrapSource = String.raw`
(() => {
  const bridge = window.frameElement && window.frameElement.__daoyuanFloatingBridge;
  if (!bridge) {
    throw new Error("[道渊悬浮状态栏] 未找到酒馆助手数据桥");
  }

  const hostJQuery = bridge.api.$;
  if (typeof hostJQuery !== "function") {
    throw new Error("[道渊悬浮状态栏] 酒馆助手未提供 jQuery");
  }

  function childJQuery(selector, context) {
    if (typeof selector === "function") {
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", selector, { once: true });
      } else {
        queueMicrotask(selector);
      }
      return hostJQuery(document);
    }
    if (typeof selector === "string" && context === undefined) {
      return hostJQuery(selector, document);
    }
    return hostJQuery(selector, context);
  }

  Object.setPrototypeOf(childJQuery, hostJQuery);
  Object.assign(childJQuery, hostJQuery);
  childJQuery.fn = hostJQuery.fn;

  window.$ = childJQuery;
  window.jQuery = childJQuery;
  window._ = bridge.api._;
  window.Mvu = bridge.Mvu;
  window.waitGlobalInitialized = bridge.waitGlobalInitialized;
  window.eventOn = bridge.eventOn;
  window.errorCatched = bridge.api.errorCatched;
  window.getAllVariables = bridge.getLatestMvuData;

  [
    "getLastMessageId",
    "getChatMessages",
    "getVariables",
    "replaceVariables",
    "updateVariablesWith",
    "getLorebookEntries",
    "getOrCreateChatLorebook",
    "getCurrentCharPrimaryLorebook",
    "getCharLorebooks",
    "getPersonaAvatarPath",
    "generate",
  ].forEach(name => {
    if (typeof bridge.api[name] === "function") {
      window[name] = bridge.api[name];
    }
  });

  const scrollSelectors = [
    ".tab-content",
    "#wx-chat-messages",
    "#wx-list-view",
    "#dy-notice-content",
  ];

  function captureViewState() {
    const scroll = [];
    document.querySelectorAll(scrollSelectors.join(",")).forEach((element, index) => {
      scroll.push({
        selector: element.id ? "#" + CSS.escape(element.id) : null,
        index,
        top: element.scrollTop,
        left: element.scrollLeft,
      });
    });
    return { scroll };
  }

  function restoreViewState(state) {
    if (!state) return;
    const elements = Array.from(
      document.querySelectorAll(scrollSelectors.join(",")),
    );
    state.scroll.forEach(item => {
      const element =
        (item.selector && document.querySelector(item.selector)) ||
        elements[item.index];
      if (element) {
        element.scrollTop = item.top;
        element.scrollLeft = item.left;
      }
    });
  }

  window.__daoyuanInstallStableRefresh = function() {
    const original = window.populateCharacterData;
    if (
      typeof original !== "function" ||
      original.__daoyuanStableRefresh
    ) {
      return;
    }
    const wrapped = function(...args) {
      const state = captureViewState();
      const result = original.apply(this, args);
      requestAnimationFrame(() => restoreViewState(state));
      return result;
    };
    wrapped.__daoyuanStableRefresh = true;
    window.populateCharacterData = wrapped;
  };

  const notifySize = () => {
    const height = Math.max(
      document.documentElement.scrollHeight,
      document.body ? document.body.scrollHeight : 0,
    );
    bridge.resize(height);
  };

  window.addEventListener("load", () => {
    window.__daoyuanInstallStableRefresh();
    notifySize();
    requestAnimationFrame(() => {
      notifySize();
      bridge.ready();
    });
  });

  window.addEventListener("error", event => {
    const message =
      event.error?.message || event.message || "悬浮界面脚本执行失败";
    if (message.includes("ResizeObserver loop")) return;
    bridge.fail(message);
  });
  window.addEventListener("unhandledrejection", event => {
    bridge.fail(event.reason?.message || String(event.reason || "悬浮界面初始化失败"));
  });

  if (typeof ResizeObserver === "function") {
    const resizeObserver = new ResizeObserver(notifySize);
    resizeObserver.observe(document.documentElement);
  }
})();
`;

function injectBootstrap(html) {
  const bootstrapTag = `<script>${bootstrapSource}<\/script>`;
  const floatingStyleTag = `<style>
html,body{width:100%!important;height:100%!important;overflow:hidden!important;background:transparent!important;}
body{margin:0!important;padding:0!important;}
.terminal-container{box-sizing:border-box!important;width:100%!important;height:100%!important;max-width:none!important;min-height:0!important;border:0!important;border-radius:12px!important;}
.terminal-container>.top-bar,.terminal-container>.header{flex:0 0 auto!important;}
.terminal-container>.content-grid{flex:1 1 auto!important;min-width:0!important;min-height:0!important;}
.terminal-container>.content-grid>.status-panel,.terminal-container>.content-grid>.main-panel{min-width:0!important;}
@media (min-width:701px){
  .terminal-container>.content-grid{overflow:hidden!important;}
  .terminal-container>.content-grid>.status-panel{min-height:0!important;overflow-x:hidden!important;overflow-y:auto!important;}
  .terminal-container>.content-grid>.main-panel{min-height:0!important;overflow:hidden!important;}
  .terminal-container>.content-grid>.main-panel>.nav-tabs{flex:0 0 auto!important;}
  .terminal-container>.content-grid>.main-panel>.tab-content{flex:1 1 auto!important;min-height:0!important;max-height:none!important;overflow-x:hidden!important;overflow-y:auto!important;}
}
@media (max-width:700px){
  .terminal-container>.content-grid{overflow-x:hidden!important;overflow-y:auto!important;}
  .terminal-container>.content-grid>.status-panel{overflow:visible!important;}
  .terminal-container>.content-grid>.main-panel{min-height:auto!important;overflow:visible!important;}
  .terminal-container>.content-grid>.main-panel>.tab-content{flex:none!important;max-height:none!important;overflow:visible!important;}
}
*{scrollbar-width:thin;scrollbar-color:rgba(220,177,75,.58) rgba(5,6,9,.2);}
*::-webkit-scrollbar{width:6px!important;height:6px!important;}
*::-webkit-scrollbar-track{background:rgba(5,6,9,.2)!important;border-radius:999px!important;}
*::-webkit-scrollbar-thumb{background:linear-gradient(180deg,rgba(241,205,111,.68),rgba(151,108,34,.6))!important;border:1px solid transparent!important;border-radius:999px!important;background-clip:padding-box!important;}
*::-webkit-scrollbar-thumb:hover{background:linear-gradient(180deg,rgba(255,224,137,.92),rgba(188,137,41,.82))!important;background-clip:padding-box!important;}
*::-webkit-scrollbar-button{display:none!important;width:0!important;height:0!important;}
*::-webkit-scrollbar-corner{background:transparent!important;}
</style>`;
  if (!html.includes("</head>")) {
    throw new Error("MVU HTML build does not contain </head>");
  }
  return html.replace(
    "</head>",
    `${floatingStyleTag}\n${bootstrapTag}\n</head>`,
  );
}

function floatingMvuRuntime(uiHtml) {
  "use strict";

  const ROOT_ID = "daoyuan-floating-mvu-root";
  const LAUNCHER_ID = "daoyuan-floating-mvu-launcher";
  const CLEANUP_KEY = "__daoyuanFloatingMvuCleanup";
  const LAYOUT_KEY = "daoyuan-floating-mvu-layout-v3";
  const LAUNCHER_SIZE = 40;
  const DRAG_THRESHOLD = 5;
  const MIN_WIDTH = 320;
  const MIN_HEIGHT = 192;
  const scriptWindow = window;
  const tavernWindow = window.parent || window;
  const tavernDocument = tavernWindow.document;
  const stopHandles = [];
  let disposed = false;
  let latestMvuData = null;
  let refreshTimer = null;
  let frame = null;
  let root = null;
  let status = null;
  let viewport = null;
  let launcher = null;
  let panelDragHandle = null;
  let resizeHandles = [];
  let collapsed = false;
  let manualSize = false;
  let layoutState = null;

  function bindHostFunction(name) {
    const candidate = scriptWindow[name];
    return typeof candidate === "function"
      ? Function.prototype.bind.call(candidate, scriptWindow)
      : undefined;
  }

  function rememberStopHandle(handle) {
    if (handle && typeof handle.stop === "function") {
      stopHandles.push(() => handle.stop());
    } else if (typeof handle === "function") {
      stopHandles.push(handle);
    }
    return handle;
  }

  function listen(target, eventType, listener, options) {
    target.addEventListener(eventType, listener, options);
    stopHandles.push(() =>
      target.removeEventListener(eventType, listener, options),
    );
  }

  function cleanup() {
    if (disposed) return;
    disposed = true;
    clearTimeout(refreshTimer);
    while (stopHandles.length > 0) {
      const stop = stopHandles.pop();
      try {
        stop();
      } catch (error) {
        console.warn("[道渊悬浮状态栏] 取消监听失败", error);
      }
    }
    if (root && root.isConnected) root.remove();
    if (launcher && launcher.isConnected) launcher.remove();
    if (tavernWindow[CLEANUP_KEY] === cleanup) {
      delete tavernWindow[CLEANUP_KEY];
    }
  }

  async function waitForTavernBody() {
    if (tavernDocument.body) return tavernDocument.body;
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error("等待酒馆页面加载超时")),
        10000,
      );
      tavernDocument.addEventListener(
        "DOMContentLoaded",
        () => {
          clearTimeout(timeout);
          resolve();
        },
        { once: true },
      );
    });
    return tavernDocument.body;
  }

  function showStatus(message, isError = false) {
    if (!status) return;
    status.textContent = message;
    status.style.color = isError ? "#ffb4b4" : "#f7ead6";
    status.style.borderColor = isError
      ? "rgba(255,92,92,.65)"
      : "rgba(209,169,105,.48)";
    status.style.background = isError
      ? "rgba(72,18,18,.94)"
      : "rgba(26,20,16,.94)";
  }

  function clamp(value, minimum, maximum) {
    return Math.min(Math.max(value, minimum), Math.max(minimum, maximum));
  }

  function getViewportSize() {
    return {
      width:
        tavernWindow.innerWidth ||
        tavernDocument.documentElement.clientWidth ||
        1024,
      height:
        tavernWindow.innerHeight ||
        tavernDocument.documentElement.clientHeight ||
        768,
    };
  }

  function positionLauncher() {
    if (!launcher || !layoutState) return;
    const viewportSize = getViewportSize();
    launcher.style.left = `${clamp(
      layoutState.launcherLeft,
      4,
      viewportSize.width - LAUNCHER_SIZE - 4,
    )}px`;
    launcher.style.top = `${clamp(
      layoutState.launcherTop,
      4,
      viewportSize.height - LAUNCHER_SIZE - 4,
    )}px`;
  }

  function loadLayout() {
    const viewportSize = getViewportSize();
    const defaultWidth = Math.min(820, viewportSize.width - 24);
    const defaultHeight = Math.min(650, viewportSize.height - 24);
    let saved = {};
    try {
      saved = JSON.parse(tavernWindow.localStorage.getItem(LAYOUT_KEY) || "{}");
    } catch (error) {
      console.warn("[道渊悬浮状态栏] 读取布局设置失败", error);
    }

    const minimumWidth = Math.min(MIN_WIDTH, viewportSize.width - 8);
    const minimumHeight = Math.min(MIN_HEIGHT, viewportSize.height - 8);
    const width = clamp(
      Number(saved.width) || defaultWidth,
      minimumWidth,
      viewportSize.width - 8,
    );
    const height = clamp(
      Number(saved.height) || defaultHeight,
      minimumHeight,
      viewportSize.height - 8,
    );
    return {
      left: clamp(
        Number.isFinite(Number(saved.left))
          ? Number(saved.left)
          : viewportSize.width - width - 12,
        4,
        viewportSize.width - width - 4,
      ),
      top: clamp(
        Number.isFinite(Number(saved.top))
          ? Number(saved.top)
          : viewportSize.height - height - 12,
        4,
        viewportSize.height - height - 4,
      ),
      width,
      height,
      launcherLeft: clamp(
        Number.isFinite(Number(saved.launcherLeft))
          ? Number(saved.launcherLeft)
          : 16,
        4,
        viewportSize.width - LAUNCHER_SIZE - 4,
      ),
      launcherTop: clamp(
        Number.isFinite(Number(saved.launcherTop))
          ? Number(saved.launcherTop)
          : Math.round(viewportSize.height * 0.4),
        4,
        viewportSize.height - LAUNCHER_SIZE - 4,
      ),
      collapsed: saved.collapsed === true,
      manualSize: saved.manualSize === true,
    };
  }

  function persistLayout() {
    if (!root || !layoutState) return;
    const rect = root.getBoundingClientRect();
    layoutState.left = Math.round(rect.left);
    layoutState.top = Math.round(rect.top);
    layoutState.width = Math.round(rect.width);
    layoutState.height = Math.round(rect.height);
    if (launcher) {
      const launcherRect = launcher.getBoundingClientRect();
      layoutState.launcherLeft = Math.round(launcherRect.left);
      layoutState.launcherTop = Math.round(launcherRect.top);
    }
    layoutState.collapsed = collapsed;
    layoutState.manualSize = manualSize;
    try {
      tavernWindow.localStorage.setItem(
        LAYOUT_KEY,
        JSON.stringify(layoutState),
      );
    } catch (error) {
      console.warn("[道渊悬浮状态栏] 保存布局设置失败", error);
    }
  }

  function clampRootToViewport() {
    if (!root) return;
    const viewportSize = getViewportSize();
    const rect = root.getBoundingClientRect();
    const width = clamp(
      rect.width,
      Math.min(MIN_WIDTH, viewportSize.width - 8),
      viewportSize.width - 8,
    );
    const height = clamp(
      rect.height,
      Math.min(MIN_HEIGHT, viewportSize.height - 8),
      viewportSize.height - 8,
    );
    root.style.width = `${width}px`;
    root.style.height = `${height}px`;
    root.style.left = `${clamp(
      rect.left,
      4,
      viewportSize.width - width - 4,
    )}px`;
    root.style.top = `${clamp(rect.top, 4, viewportSize.height - height - 4)}px`;
    positionLauncher();
  }

  function setCollapsed(nextCollapsed, shouldPersist = true) {
    if (!root || !launcher) return;
    collapsed = nextCollapsed;
    root.style.visibility = collapsed ? "hidden" : "visible";
    root.style.pointerEvents = collapsed ? "none" : "auto";
    launcher.title = collapsed ? "显示道渊状态栏" : "隐藏道渊状态栏";
    launcher.setAttribute("aria-label", launcher.title);
    launcher.setAttribute("aria-expanded", String(!collapsed));
    if (shouldPersist) persistLayout();
  }

  function togglePanel() {
    setCollapsed(!collapsed);
  }

  async function createHostShell() {
    const body = await waitForTavernBody();
    if (typeof tavernWindow[CLEANUP_KEY] === "function") {
      tavernWindow[CLEANUP_KEY]();
    }
    tavernDocument.getElementById(ROOT_ID)?.remove();
    tavernDocument.getElementById(LAUNCHER_ID)?.remove();
    tavernWindow[CLEANUP_KEY] = cleanup;
    layoutState = loadLayout();
    manualSize = layoutState.manualSize;

    root = tavernDocument.createElement("div");
    root.id = ROOT_ID;
    root.style.cssText = [
      "position:fixed",
      `left:${layoutState.left}px`,
      `top:${layoutState.top}px`,
      `width:${layoutState.width}px`,
      `height:${layoutState.height}px`,
      `min-width:${MIN_WIDTH}px`,
      `min-height:${MIN_HEIGHT}px`,
      "box-sizing:border-box",
      "display:flex",
      "flex-direction:column",
      "z-index:2147483000",
      "overflow:visible",
      "border:0",
      "outline:0",
      "border-radius:12px",
      "background:transparent",
      "box-shadow:0 12px 34px rgba(0,0,0,.46),0 0 14px rgba(211,169,72,.055)",
      "pointer-events:auto",
    ].join(";");

    launcher = tavernDocument.createElement("button");
    launcher.id = LAUNCHER_ID;
    launcher.type = "button";
    launcher.textContent = "玖";
    launcher.style.cssText = [
      "position:fixed",
      `width:${LAUNCHER_SIZE}px`,
      `height:${LAUNCHER_SIZE}px`,
      "box-sizing:border-box",
      "display:flex",
      "align-items:center",
      "justify-content:center",
      "z-index:2147483002",
      "padding:0",
      "margin:0",
      "overflow:hidden",
      "border:1px solid rgba(229,190,89,.72)",
      "outline:0",
      "border-radius:50%",
      "background:radial-gradient(circle at 35% 28%,rgba(69,55,28,.96),rgba(10,10,13,.98) 68%)",
      "color:#f0cf78",
      "font:700 22px/1 'Noto Serif SC','Songti SC','SimSun',serif",
      "text-shadow:0 0 7px rgba(236,190,73,.48)",
      "box-shadow:inset 0 0 0 1px rgba(255,225,145,.08),0 0 12px rgba(225,183,75,.24),0 3px 10px rgba(0,0,0,.56)",
      "cursor:grab",
      "touch-action:none",
      "user-select:none",
      "-webkit-user-select:none",
      "-webkit-tap-highlight-color:transparent",
    ].join(";");

    viewport = tavernDocument.createElement("div");
    viewport.id = "daoyuan-floating-mvu-viewport";
    viewport.style.cssText = [
      "position:relative",
      "display:flex",
      "flex:1",
      "min-width:0",
      "min-height:0",
      "overflow:hidden",
      "border:0",
      "border-radius:12px",
      "background:transparent",
    ].join(";");

    status = tavernDocument.createElement("div");
    status.id = "daoyuan-floating-mvu-status";
    status.style.cssText = [
      "box-sizing:border-box",
      "display:flex",
      "align-items:center",
      "justify-content:center",
      "width:100%",
      "height:100%",
      "padding:16px",
      "border:0",
      "border-radius:12px",
      "background:rgba(26,20,16,.94)",
      "color:#f7ead6",
      "font:14px/1.6 sans-serif",
      "text-align:center",
    ].join(";");
    status.textContent = "道渊 MVU 悬浮状态栏正在连接……";

    panelDragHandle = tavernDocument.createElement("div");
    panelDragHandle.id = "daoyuan-floating-mvu-panel-drag";
    panelDragHandle.title = "拖动状态栏";
    panelDragHandle.style.cssText = [
      "position:absolute",
      "left:28px",
      "right:28px",
      "top:0",
      "height:14px",
      "z-index:11",
      "cursor:move",
      "touch-action:none",
      "user-select:none",
      "display:flex",
      "align-items:flex-start",
      "justify-content:center",
    ].join(";");
    const panelDragIndicator = tavernDocument.createElement("div");
    panelDragIndicator.style.cssText = [
      "width:42px",
      "height:2px",
      "margin-top:3px",
      "border-radius:999px",
      "background:linear-gradient(90deg,transparent,rgba(231,194,100,.48),transparent)",
      "box-shadow:0 0 5px rgba(225,183,75,.12)",
      "opacity:.42",
      "transition:opacity .18s ease,transform .18s ease,box-shadow .18s ease",
      "pointer-events:none",
    ].join(";");
    panelDragHandle.appendChild(panelDragIndicator);
    listen(panelDragHandle, "pointerenter", () => {
      panelDragIndicator.style.opacity = ".82";
      panelDragIndicator.style.transform = "scaleX(1.12)";
      panelDragIndicator.style.boxShadow = "0 0 7px rgba(225,183,75,.3)";
    });
    listen(panelDragHandle, "pointerleave", () => {
      panelDragIndicator.style.opacity = ".42";
      panelDragIndicator.style.transform = "scaleX(1)";
      panelDragIndicator.style.boxShadow = "0 0 5px rgba(225,183,75,.12)";
    });

    const resizeHandleSettings = {
      nw: {
        inset: "left:0;top:0",
        cursor: "nwse-resize",
        markInset: "left:3px;top:3px",
        border: "border-left:1px solid rgba(232,196,108,.7);border-top:1px solid rgba(232,196,108,.7)",
        radius: "border-top-left-radius:7px",
        origin: "top left",
      },
      ne: {
        inset: "right:0;top:0",
        cursor: "nesw-resize",
        markInset: "right:3px;top:3px",
        border: "border-right:1px solid rgba(232,196,108,.7);border-top:1px solid rgba(232,196,108,.7)",
        radius: "border-top-right-radius:7px",
        origin: "top right",
      },
      sw: {
        inset: "left:0;bottom:0",
        cursor: "nesw-resize",
        markInset: "left:3px;bottom:3px",
        border: "border-left:1px solid rgba(232,196,108,.7);border-bottom:1px solid rgba(232,196,108,.7)",
        radius: "border-bottom-left-radius:7px",
        origin: "bottom left",
      },
      se: {
        inset: "right:0;bottom:0",
        cursor: "nwse-resize",
        markInset: "right:3px;bottom:3px",
        border: "border-right:1px solid rgba(232,196,108,.7);border-bottom:1px solid rgba(232,196,108,.7)",
        radius: "border-bottom-right-radius:7px",
        origin: "bottom right",
      },
    };
    resizeHandles = Object.entries(resizeHandleSettings).map(
      ([direction, settings]) => {
        const handle = tavernDocument.createElement("div");
        handle.id = `daoyuan-floating-mvu-resize-${direction}`;
        handle.dataset.direction = direction;
        handle.title = `拖动${direction.toUpperCase()}角调整状态栏大小`;
        handle.style.cssText = [
          "position:absolute",
          settings.inset,
          "width:26px",
          "height:26px",
          "box-sizing:border-box",
          "z-index:12",
          `cursor:${settings.cursor}`,
          "touch-action:none",
          "background:rgba(0,0,0,.01)",
        ].join(";");
        const mark = tavernDocument.createElement("div");
        mark.style.cssText = [
          "position:absolute",
          settings.markInset,
          "width:11px",
          "height:11px",
          "box-sizing:border-box",
          settings.border,
          settings.radius,
          `transform-origin:${settings.origin}`,
          "opacity:.46",
          "filter:drop-shadow(0 0 2px rgba(226,184,82,.16))",
          "transition:opacity .16s ease,transform .16s ease,filter .16s ease",
          "pointer-events:none",
        ].join(";");
        handle.appendChild(mark);
        listen(handle, "pointerenter", () => {
          mark.style.opacity = ".92";
          mark.style.transform = "scale(1.12)";
          mark.style.filter = "drop-shadow(0 0 4px rgba(226,184,82,.4))";
        });
        listen(handle, "pointerleave", () => {
          mark.style.opacity = ".46";
          mark.style.transform = "scale(1)";
          mark.style.filter = "drop-shadow(0 0 2px rgba(226,184,82,.16))";
        });
        return handle;
      },
    );

    viewport.append(status);
    root.append(viewport, panelDragHandle, ...resizeHandles);
    body.append(root, launcher);

    let dragSession = null;
    let panelDragSession = null;
    let resizeSession = null;
    let suppressLauncherClick = false;

    listen(launcher, "pointerdown", event => {
      if (event.button !== 0) return;
      event.preventDefault();
      const rect = launcher.getBoundingClientRect();
      dragSession = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        left: rect.left,
        top: rect.top,
        moved: false,
      };
      launcher.style.cursor = "grabbing";
      launcher.setPointerCapture?.(event.pointerId);
    });

    listen(launcher, "click", event => {
      if (suppressLauncherClick) {
        suppressLauncherClick = false;
        event.preventDefault();
        return;
      }
      togglePanel();
    });

    listen(panelDragHandle, "pointerdown", event => {
      if (event.button !== 0 || collapsed) return;
      event.preventDefault();
      const rect = root.getBoundingClientRect();
      panelDragSession = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        left: rect.left,
        top: rect.top,
      };
      panelDragIndicator.style.opacity = ".95";
      panelDragIndicator.style.transform = "scaleX(1.18)";
      panelDragIndicator.style.boxShadow = "0 0 8px rgba(225,183,75,.4)";
      panelDragHandle.setPointerCapture?.(event.pointerId);
    });

    resizeHandles.forEach(handle => {
      listen(handle, "pointerdown", event => {
        if (event.button !== 0 || collapsed) return;
        event.preventDefault();
        event.stopPropagation();
        const rect = root.getBoundingClientRect();
        manualSize = true;
        resizeSession = {
          pointerId: event.pointerId,
          direction: handle.dataset.direction,
          startX: event.clientX,
          startY: event.clientY,
          left: rect.left,
          top: rect.top,
          right: rect.right,
          bottom: rect.bottom,
          width: rect.width,
          height: rect.height,
          mark: handle.firstElementChild,
        };
        if (resizeSession.mark) {
          resizeSession.mark.style.opacity = "1";
          resizeSession.mark.style.transform = "scale(1.14)";
          resizeSession.mark.style.filter =
            "drop-shadow(0 0 5px rgba(226,184,82,.48))";
        }
        handle.setPointerCapture?.(event.pointerId);
      });
    });

    listen(tavernWindow, "pointermove", event => {
      if (dragSession?.pointerId === event.pointerId) {
        const deltaX = event.clientX - dragSession.startX;
        const deltaY = event.clientY - dragSession.startY;
        if (
          Math.hypot(deltaX, deltaY) >= DRAG_THRESHOLD
        ) {
          dragSession.moved = true;
        }
        const viewportSize = getViewportSize();
        launcher.style.left = `${clamp(
          dragSession.left + deltaX,
          4,
          viewportSize.width - LAUNCHER_SIZE - 4,
        )}px`;
        launcher.style.top = `${clamp(
          dragSession.top + deltaY,
          4,
          viewportSize.height - LAUNCHER_SIZE - 4,
        )}px`;
      }
      if (panelDragSession?.pointerId === event.pointerId) {
        const viewportSize = getViewportSize();
        const rect = root.getBoundingClientRect();
        root.style.left = `${clamp(
          panelDragSession.left + event.clientX - panelDragSession.startX,
          4,
          viewportSize.width - rect.width - 4,
        )}px`;
        root.style.top = `${clamp(
          panelDragSession.top + event.clientY - panelDragSession.startY,
          4,
          viewportSize.height - rect.height - 4,
        )}px`;
      }
      if (resizeSession?.pointerId === event.pointerId) {
        const viewportSize = getViewportSize();
        const deltaX = event.clientX - resizeSession.startX;
        const deltaY = event.clientY - resizeSession.startY;
        const direction = resizeSession.direction;
        let nextLeft = resizeSession.left;
        let nextTop = resizeSession.top;
        let nextWidth = resizeSession.width;
        let nextHeight = resizeSession.height;

        if (direction.includes("e")) {
          nextWidth = clamp(
            resizeSession.width + deltaX,
            Math.min(MIN_WIDTH, viewportSize.width - resizeSession.left - 4),
            viewportSize.width - resizeSession.left - 4,
          );
        }
        if (direction.includes("w")) {
          nextWidth = clamp(
            resizeSession.width - deltaX,
            Math.min(
              MIN_WIDTH,
              resizeSession.right - 8,
            ),
            resizeSession.right - 4,
          );
          nextLeft = resizeSession.right - nextWidth;
        }
        if (direction.includes("s")) {
          nextHeight = clamp(
            resizeSession.height + deltaY,
            Math.min(MIN_HEIGHT, viewportSize.height - resizeSession.top - 4),
            viewportSize.height - resizeSession.top - 4,
          );
        }
        if (direction.includes("n")) {
          nextHeight = clamp(
            resizeSession.height - deltaY,
            Math.min(MIN_HEIGHT, resizeSession.bottom - 8),
            resizeSession.bottom - 4,
          );
          nextTop = resizeSession.bottom - nextHeight;
        }

        root.style.left = `${nextLeft}px`;
        root.style.top = `${nextTop}px`;
        root.style.width = `${nextWidth}px`;
        root.style.height = `${nextHeight}px`;
      }
    });

    const finishPointerAction = event => {
      if (dragSession?.pointerId === event.pointerId) {
        suppressLauncherClick = dragSession.moved;
        dragSession = null;
        launcher.style.cursor = "grab";
        persistLayout();
      }
      if (panelDragSession?.pointerId === event.pointerId) {
        panelDragSession = null;
        panelDragIndicator.style.opacity = ".42";
        panelDragIndicator.style.transform = "scaleX(1)";
        panelDragIndicator.style.boxShadow =
          "0 0 5px rgba(225,183,75,.12)";
        persistLayout();
      }
      if (resizeSession?.pointerId === event.pointerId) {
        if (resizeSession.mark) {
          resizeSession.mark.style.opacity = ".46";
          resizeSession.mark.style.transform = "scale(1)";
          resizeSession.mark.style.filter =
            "drop-shadow(0 0 2px rgba(226,184,82,.16))";
        }
        resizeSession = null;
        persistLayout();
      }
    };
    listen(tavernWindow, "pointerup", finishPointerAction);
    listen(tavernWindow, "pointercancel", finishPointerAction);
    listen(tavernWindow, "resize", () => {
      clampRootToViewport();
      persistLayout();
    });
    listen(scriptWindow, "pagehide", cleanup);

    collapsed = false;
    clampRootToViewport();
    setCollapsed(layoutState.collapsed, false);
  }

  function getLatestAssistantMessageId() {
    try {
      const getLastMessageId = bindHostFunction("getLastMessageId");
      const getChatMessages = bindHostFunction("getChatMessages");
      if (!getLastMessageId || !getChatMessages) return "latest";
      const lastMessageId = getLastMessageId();
      const messages = getChatMessages(`0-${lastMessageId}`, {
        role: "assistant",
      });
      return messages && messages.length > 0
        ? messages[messages.length - 1].message_id
        : "latest";
    } catch (error) {
      console.warn("[道渊悬浮状态栏] 查找最新助手消息失败", error);
      return "latest";
    }
  }

  function readLatestMvuData() {
    try {
      const messageId = getLatestAssistantMessageId();
      const data = scriptWindow.Mvu.getMvuData({
        type: "message",
        message_id: messageId,
      });
      if (data && typeof data === "object") latestMvuData = data;
    } catch (error) {
      console.warn("[道渊悬浮状态栏] 读取最新 MVU 数据失败", error);
    }
    return latestMvuData || { stat_data: {} };
  }

  function refreshVisibleState(data) {
    if (data && typeof data === "object") {
      latestMvuData = data;
    } else {
      readLatestMvuData();
    }
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(() => {
      if (disposed || !frame || !frame.contentWindow) return;
      const frameWindow = frame.contentWindow;
      if (typeof frameWindow.__daoyuanInstallStableRefresh === "function") {
        frameWindow.__daoyuanInstallStableRefresh();
      }
      if (typeof frameWindow.populateCharacterData === "function") {
        frameWindow.populateCharacterData();
      }
    }, 0);
  }

  function subscribe(eventType, listener) {
    if (!eventType || typeof scriptWindow.eventOn !== "function") return null;
    return rememberStopHandle(scriptWindow.eventOn(eventType, listener));
  }

  async function start() {
    await createHostShell();

    if (typeof scriptWindow.waitGlobalInitialized !== "function") {
      throw new Error("酒馆助手未提供 waitGlobalInitialized");
    }
    await Promise.race([
      scriptWindow.waitGlobalInitialized("Mvu"),
      new Promise((_, reject) => {
        setTimeout(
          () => reject(new Error("等待 MVU 初始化超时，请确认已启用 MVU 脚本")),
          20000,
        );
      }),
    ]);
    if (
      !scriptWindow.Mvu ||
      typeof scriptWindow.Mvu.getMvuData !== "function" ||
      typeof scriptWindow.Mvu.replaceMvuData !== "function"
    ) {
      throw new Error("MVU 未正确初始化，请确认已启用 MVU 脚本");
    }

    readLatestMvuData();

    frame = tavernDocument.createElement("iframe");
    frame.id = "daoyuan-floating-mvu-frame";
    frame.title = "道渊 MVU 悬浮状态栏";
    frame.style.cssText = [
      "display:none",
      "width:100%",
      "height:100%",
      "border:0",
      "outline:0",
      "border-radius:12px",
      "background:transparent",
      "color-scheme:dark",
    ].join(";");

    const mvuProxy = new Proxy(scriptWindow.Mvu, {
      get(target, property) {
        const value = Reflect.get(target, property);
        return typeof value === "function" ? value.bind(target) : value;
      },
    });

    const apiNames = [
      "$",
      "_",
      "errorCatched",
      "getLastMessageId",
      "getChatMessages",
      "getVariables",
      "replaceVariables",
      "updateVariablesWith",
      "getLorebookEntries",
      "getOrCreateChatLorebook",
      "getCurrentCharPrimaryLorebook",
      "getCharLorebooks",
      "getPersonaAvatarPath",
      "appendInexistentScriptButtons",
      "getButtonEvent",
      "generate",
    ];
    const api = Object.fromEntries(
      apiNames.map(name => [
        name,
        name === "$" || name === "_"
          ? scriptWindow[name]
          : typeof scriptWindow[name] === "function"
            ? Function.prototype.bind.call(scriptWindow[name], scriptWindow)
            : scriptWindow[name],
      ]),
    );

    frame.__daoyuanFloatingBridge = {
      Mvu: mvuProxy,
      api,
      getLatestMvuData: () => latestMvuData || readLatestMvuData(),
      waitGlobalInitialized: async name => {
        if (name === "Mvu") return scriptWindow.Mvu;
        return scriptWindow.waitGlobalInitialized(name);
      },
      eventOn: (eventType, listener) => {
        const wrapped = (...args) => {
          if (
            eventType === scriptWindow.Mvu.events.VARIABLE_UPDATE_ENDED &&
            args[0] &&
            typeof args[0] === "object"
          ) {
            latestMvuData = args[0];
          }
          return listener(...args);
        };
        return subscribe(eventType, wrapped);
      },
      ready: () => {
        if (disposed || !root || !frame) return;
        status?.remove();
        status = null;
        frame.style.display = "block";
      },
      fail: message => {
        console.error("[道渊悬浮状态栏] 界面加载失败", message);
        showStatus(`道渊悬浮状态栏加载失败：${message}`, true);
      },
      resize: requestedHeight => {
        if (disposed || !root || collapsed || manualSize) return;
        const viewportHeight =
          tavernWindow.innerHeight || tavernDocument.documentElement.clientHeight;
        const rootTop = root.getBoundingClientRect().top;
        const maximum = Math.max(
          MIN_HEIGHT,
          viewportHeight - rootTop - 4,
        );
        const height = Math.max(
          MIN_HEIGHT,
          Math.min(
            maximum,
            Math.ceil(Number(requestedHeight) || MIN_HEIGHT),
          ),
        );
        if (height <= root.getBoundingClientRect().height + 1) return;
        root.style.height = `${height}px`;
        layoutState.height = height;
      },
    };

    frame.srcdoc = uiHtml;
    viewport.prepend(frame);

    const appendScriptButtons = bindHostFunction(
      "appendInexistentScriptButtons",
    );
    const getButtonEvent = bindHostFunction("getButtonEvent");
    if (appendScriptButtons) {
      appendScriptButtons([{ name: "切换悬浮窗", visible: true }]);
    }
    if (getButtonEvent) {
      subscribe(getButtonEvent("切换悬浮窗"), togglePanel);
    }

    subscribe(scriptWindow.Mvu.events.VARIABLE_INITIALIZED, variables => {
      refreshVisibleState(variables);
    });

    const tavernEvents = scriptWindow.tavern_events || {};
    [
      tavernEvents.CHAT_CHANGED,
      tavernEvents.MESSAGE_SWIPED,
      tavernEvents.MESSAGE_UPDATED,
      tavernEvents.MESSAGE_DELETED,
    ]
      .filter(Boolean)
      .forEach(eventType => {
        subscribe(eventType, () => {
          latestMvuData = null;
          setTimeout(() => refreshVisibleState(), 0);
        });
      });
  }

  start().catch(error => {
    console.error("[道渊悬浮状态栏] 启动失败", error);
    showStatus(`道渊悬浮状态栏启动失败：${error.message}`, true);
    if (typeof scriptWindow.toastr?.error === "function") {
      scriptWindow.toastr.error(
        `道渊悬浮状态栏启动失败：${error.message}`,
      );
    }
  });
}

const uiHtml = injectBootstrap(fs.readFileSync(distHtmlPath, "utf8"));
const serializedUiHtml = JSON.stringify(uiHtml).replace(
  /<\/script/gi,
  "<\\/script",
);
const scriptContent = `/*
 * 道渊 MVU 悬浮状态栏
 * 由 pnpm build:floating-mvu 自动生成，请勿直接修改此文件。
 */
(${floatingMvuRuntime.toString()})(${serializedUiHtml});
`;

const output = {
  type: "script",
  enabled: false,
  name: "道渊 MVU 悬浮状态栏",
  id: "daoyuan-floating-mvu",
  content: scriptContent,
  info: "在酒馆父页面显示道渊 MVU 状态栏；MVU 更新时刷新同一个悬浮窗口。",
  button: {
    enabled: true,
    buttons: [{ name: "切换悬浮窗", visible: true }],
  },
  data: {},
  export_with: {
    data: true,
    button: true,
  },
};

fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), "utf8");
if (fs.existsSync(legacyOutputPath)) {
  fs.rmSync(legacyOutputPath);
}
console.log(`Generated importable Tavern Helper script at ${outputPath}`);
