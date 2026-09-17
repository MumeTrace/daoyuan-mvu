import { shallowRef } from "vue";

/** A presentation-only portal. Never moves/reloads the Tavern message iframe. */
export const overlayHostTarget = shallowRef<HTMLElement | null>(null);
const leases = new Set<symbol>();
let disposeHost: (() => void) | undefined;

function accessibleHost(): Document {
  let current: Window = window;
  try {
    while (current.parent !== current && current.parent.document.body) current = current.parent;
  } catch { /* Cross-origin ancestors are not accessible; do not bypass them. */ }
  return current.document;
}

function resetHost(): void {
  overlayHostTarget.value = null;
  disposeHost?.();
  disposeHost = undefined;
  leases.clear();
}

export function acquireOverlayHost(source: HTMLElement | null = null): { release: () => void; hostWide: boolean } {
  const token = Symbol("overlay");
  const hostDocument = accessibleHost();
  const hostWide = hostDocument.defaultView?.parent === hostDocument.defaultView;
  if (hostDocument !== document && !overlayHostTarget.value) {
    const host = hostDocument.createElement("div");
    host.dataset.daoyuanOverlayHost = "true";
    host.style.cssText = "position:fixed;inset:0;z-index:2147483000;pointer-events:none;";
    const hostWindow = hostDocument.defaultView;
    const syncViewport = () => {
      if (!hostWindow) return;
      const viewport = hostWindow.visualViewport;
      host.style.setProperty("--dy-overlay-width", `${viewport?.width ?? hostWindow.innerWidth}px`);
      host.style.setProperty("--dy-overlay-height", `${viewport?.height ?? hostWindow.innerHeight}px`);
    };
    syncViewport();
    hostWindow?.addEventListener("resize", syncViewport);
    hostWindow?.visualViewport?.addEventListener("resize", syncViewport);
    const shadow = host.attachShadow({ mode: "open" });
    const styles = hostDocument.createElement("div");
    const boundary = hostDocument.createElement("style");
    boundary.textContent = ":host{font-family:serif;line-height:1.5;color-scheme:dark}#dy-host-overlay-target{pointer-events:none}#dy-host-overlay-target>*{pointer-events:auto}";
    function syncStyles() {
      // Tavern may place the inlined build stylesheet in body rather than head.
      styles.replaceChildren(...[...document.querySelectorAll("style,link[rel='stylesheet']")].map(node => {
        const copy = node.cloneNode(true) as HTMLElement;
        if (node instanceof HTMLLinkElement) (copy as HTMLLinkElement).href = node.href;
        return copy;
      }));
      const computed = getComputedStyle(source ?? document.querySelector<HTMLElement>("#status-bar") ?? document.documentElement);
      for (let i = 0; i < computed.length; i++) {
        const key = computed[i]!;
        if (key.startsWith("--")) host.style.setProperty(key, computed.getPropertyValue(key));
      }
    }
    syncStyles();
    const target = hostDocument.createElement("div");
    target.id = "dy-host-overlay-target";
    shadow.append(styles, boundary, target);
    hostDocument.body.append(host);
    const isStyleNode = (node: Node): boolean => node instanceof Element &&
      (node.matches("style,link[rel='stylesheet']") || !!node.querySelector("style,link[rel='stylesheet']"));
    const observer = new MutationObserver(records => {
      if (records.some(record => record.type === "characterData"
        ? record.target.parentElement?.matches("style")
        : [...record.addedNodes, ...record.removedNodes].some(isStyleNode))) syncStyles();
    });
    observer.observe(document.head, { childList: true, subtree: true, characterData: true });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    const oldOverflow = hostDocument.body.style.getPropertyValue("overflow");
    const oldPriority = hostDocument.body.style.getPropertyPriority("overflow");
    hostDocument.body.style.setProperty("overflow", "hidden", "important");
    disposeHost = () => {
      observer.disconnect();
      host.remove();
      hostWindow?.removeEventListener("resize", syncViewport);
      hostWindow?.visualViewport?.removeEventListener("resize", syncViewport);
      if (hostDocument.body.style.getPropertyValue("overflow") === "hidden") {
        if (oldOverflow) hostDocument.body.style.setProperty("overflow", oldOverflow, oldPriority);
        else hostDocument.body.style.removeProperty("overflow");
      }
      window.removeEventListener("pagehide", resetHost);
    };
    window.addEventListener("pagehide", resetHost);
    overlayHostTarget.value = target;
  }
  leases.add(token);
  return { hostWide, release() { if (leases.delete(token) && !leases.size) resetHost(); } };
}
