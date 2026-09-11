import { ref } from "vue";
import { defineStore } from "pinia";

export interface AchievementNotice {
  id: number;
  title: string;
  description: string;
}

export const useAchievementStore = defineStore("achievements", () => {
  const current = ref<AchievementNotice | null>(null);
  const pending = ref<AchievementNotice[]>([]);
  let nextId = 1;

  function plainText(value: unknown): string {
    const source = String(value ?? "");
    if (typeof DOMParser === "undefined") return source.replace(/<[^>]*>/g, "");
    return new DOMParser().parseFromString(source, "text/html").body.textContent ?? "";
  }

  function show(title: unknown, description: unknown): void {
    const notice = {
      id: nextId++,
      title: String(title ?? "天道传讯"),
      description: plainText(description),
    };
    if (current.value) pending.value.push(notice);
    else current.value = notice;
  }

  function dismiss(): void {
    current.value = pending.value.shift() ?? null;
  }

  return { current, show, dismiss };
});
