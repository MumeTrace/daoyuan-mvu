import { computed, ref } from "vue";
import { defineStore } from "pinia";
import { tavernEvents } from "../bridge/event-bus";
import { tavernApi } from "../bridge/tavern-api";
import { hostDom } from "../bridge/host-dom";
import type { TavernEventHandle } from "../types/tavern";

export const usePersonaStore = defineStore("persona", () => {
  const avatarUrl = ref("");
  const handles: TavernEventHandle[] = [];
  let started = false;

  const avatarStyle = computed(() =>
    avatarUrl.value ? { backgroundImage: `url(${JSON.stringify(avatarUrl.value)})` } : {},
  );

  function refresh(): string {
    const candidate =
      tavernApi.getPersonaAvatarPath("current") || hostDom.getSelectedPersonaAvatarUrl();
    avatarUrl.value = hostDom.resolveAssetUrl(candidate);
    return avatarUrl.value;
  }

  function start(): void {
    if (started) return;
    started = true;
    refresh();
    try {
      handles.push(
        tavernEvents.on("persona_changed", refresh),
        tavernEvents.on("persona_updated", refresh),
      );
    } catch (reason) {
      console.warn("[道渊] 当前宿主不支持化身变更监听:", reason);
    }
  }

  function stop(): void {
    handles.splice(0).forEach((handle) => handle.stop());
    started = false;
  }

  return { avatarUrl, avatarStyle, refresh, start, stop };
});
