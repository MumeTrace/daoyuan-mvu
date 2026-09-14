import { safeImageUrl } from "../utils/safe-url";

export interface HostDomBridge {
  /** Project host DOM: resolve a relative asset URL against the containing page. */
  resolveAssetUrl(value: string): string;
  /** SillyTavern host DOM fallback used only when the persona API returns null. */
  getSelectedPersonaAvatarUrl(): string;
  /** Project host DOM: toggle a namespaced body class for external mascot hiding. */
  setBodyClass(className: string, enabled: boolean): void;
}

function parentWindow(): Window | null {
  try {
    return window.parent && window.parent !== window ? window.parent : window;
  } catch {
    return null;
  }
}

export const hostDom: HostDomBridge = {
  resolveAssetUrl(value) {
    if (!value) return "";
    try {
      const base = parentWindow()?.location.href || document.baseURI;
      return safeImageUrl(new URL(value, base).href);
    } catch {
      return safeImageUrl(value);
    }
  },

  getSelectedPersonaAvatarUrl() {
    try {
      return (
        parentWindow()
          ?.document.querySelector<HTMLImageElement>(
            "#user_avatar_block .avatar-container.selected img",
          )
          ?.getAttribute("src") || ""
      );
    } catch {
      return "";
    }
  },

  setBodyClass(className, enabled) {
    document.body?.classList.toggle(className, enabled);
  },
};
