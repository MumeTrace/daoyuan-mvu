import { ref, type Ref } from "vue";
import type { Pinia } from "pinia";
import { mvuBridge, type MvuBridge } from "../bridge/mvu-bridge";
import { tavernApi, type TavernApi } from "../bridge/tavern-api";
import { tavernEvents, type TavernEventBus } from "../bridge/event-bus";
import { shujukuApi, type ShujukuApi } from "../bridge/shujuku-api";
import { asRecord } from "../stores/helpers";
import { useBeautyRankStore } from "../stores/beauty-rank";
import { useAchievementStore } from "../stores/achievements";
import { useHeroStore } from "../stores/hero";
import { useFairyStore } from "../stores/fairy";
import { useInventoryStore } from "../stores/inventory";
import { useJadeStore } from "../stores/jade-messenger";
import { useNpcsStore } from "../stores/npcs";
import { usePartnersStore } from "../stores/partners";
import { usePetsStore } from "../stores/pets";
import { useQuestsStore } from "../stores/quests";
import { useSkillsStore } from "../stores/skills";
import { useWorldStore } from "../stores/world";
import type { MvuData, StatData } from "../types/stat-data";
import type { TavernEventHandle } from "../types/tavern";

export interface StatDataController {
  statData: Ref<StatData>;
  ready: Ref<boolean>;
  error: Ref<Error | null>;
  start(): Promise<void>;
  stop(): void;
  refresh(payload?: unknown): boolean;
  distribute(nextStatData: StatData): void;
}

function statDataFrom(value: unknown): StatData | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const candidate = value as MvuData;
  return candidate.stat_data && typeof candidate.stat_data === "object"
    ? candidate.stat_data
    : null;
}

export function createStatDataController(
  pinia: Pinia,
  dependencies: {
    mvu?: MvuBridge;
    tavern?: TavernApi;
    events?: TavernEventBus;
    shujuku?: ShujukuApi;
  } = {},
): StatDataController {
  const mvu = dependencies.mvu ?? mvuBridge;
  const tavern = dependencies.tavern ?? tavernApi;
  const events = dependencies.events ?? tavernEvents;
  const shujuku = dependencies.shujuku ?? shujukuApi;
  const statData = ref<StatData>({});
  const ready = ref(false);
  const error = ref<Error | null>(null);
  const handles: TavernEventHandle[] = [];
  let startPromise: Promise<void> | null = null;
  let listenersRegistered = false;
  let previousPartnerNames: Set<string> | null = null;
  let previousJadeNames: Set<string> | null = null;

  const stores = {
    hero: useHeroStore(pinia),
    fairy: useFairyStore(pinia),
    skills: useSkillsStore(pinia),
    inventory: useInventoryStore(pinia),
    partners: usePartnersStore(pinia),
    npcs: useNpcsStore(pinia),
    pets: usePetsStore(pinia),
    quests: useQuestsStore(pinia),
    world: useWorldStore(pinia),
    beauty: useBeautyRankStore(pinia),
    jade: useJadeStore(pinia),
    achievements: useAchievementStore(pinia),
  };

  function distribute(nextStatData: StatData): void {
    const partnerNames = new Set(Object.keys(asRecord(nextStatData.道侣)));
    const jadeNames = new Set(Object.keys(asRecord(nextStatData.玉简)));
    if (previousPartnerNames) {
      partnerNames.forEach((name) => {
        if (!previousPartnerNames?.has(name)) {
          stores.achievements.show(
            "结为道侣",
            `天道见证，你与【${name}】结为修仙道侣，长生路远，大道同行。`,
          );
        }
      });
    }
    if (previousJadeNames) {
      jadeNames.forEach((name) => {
        if (!previousJadeNames?.has(name)) {
          stores.achievements.show(
            "获得玉简",
            `你获取了与【${name}】的传讯玉简，可通过神念随时交流。`,
          );
        }
      });
    }
    previousPartnerNames = partnerNames;
    previousJadeNames = jadeNames;
    statData.value = { ...nextStatData };
    stores.hero.updateFromStatData(statData.value);
    stores.fairy.updateFromStatData(statData.value);
    stores.skills.updateFromStatData(statData.value);
    stores.inventory.updateFromStatData(statData.value);
    stores.partners.updateFromStatData(statData.value);
    stores.npcs.updateFromStatData(statData.value);
    stores.pets.updateFromStatData(statData.value);
    stores.quests.updateFromStatData(statData.value);
    stores.world.updateFromStatData(statData.value);
    stores.beauty.updateFromStatData(statData.value);
    stores.jade.updateFromStatData(statData.value);
    ready.value = true;
    error.value = null;
  }

  function readScopedStatData(): StatData | null {
    const currentMessageId = tavern.getCurrentMessageId();
    if (currentMessageId !== null && mvu.isAvailable()) {
      return statDataFrom(
        mvu.getMvuData({ type: "message", message_id: currentMessageId }),
      );
    }

    // getAllVariables is a read-only merged view whose end floor is iframe-specific.
    return statDataFrom(tavern.getAllVariables());
  }

  function refresh(payload?: unknown): boolean {
    try {
      const fromPayload = Array.isArray(payload)
        ? payload.map(statDataFrom).find((value) => value !== null) ?? null
        : statDataFrom(payload);
      const nextStatData = fromPayload ?? readScopedStatData();
      if (!nextStatData) return false;
      distribute(nextStatData);
      return true;
    } catch (reason) {
      error.value = reason instanceof Error ? reason : new Error(String(reason));
      return false;
    }
  }

  async function start(): Promise<void> {
    if (startPromise) return startPromise;
    startPromise = (async () => {
      try {
        if (shujuku.isAvailable()) await shujuku.ready();
        else await mvu.waitUntilReady();
        refresh();

      } catch (reason) {
        // Shujuku/older hosts may expose only getAllVariables during early startup.
        if (!refresh()) {
          error.value = reason instanceof Error ? reason : new Error(String(reason));
          console.warn("[道渊] 状态层初始化失败:", error.value);
        }
      }

      if (!listenersRegistered) {
        const shujukuHandle = shujuku.subscribe(() => refresh());
        if (shujukuHandle) handles.push(shujukuHandle);
        try {
          const updateEvent = mvu.getVariableUpdateEndedEvent();
          if (updateEvent) {
            handles.push(events.on(updateEvent, (...args) => refresh(args)));
          }
          handles.push(
            events.on("daoyuan_mvu_manual_updated", (...args) => refresh(args)),
          );
          listenersRegistered = true;
        } catch (reason) {
          console.warn("[道渊] 状态监听不可用:", reason);
        }
      }
    })();
    return startPromise;
  }

  function stop(): void {
    handles.splice(0).forEach((handle) => handle.stop());
    listenersRegistered = false;
    startPromise = null;
  }

  return { statData, ready, error, start, stop, refresh, distribute };
}

export function isStatData(value: unknown): value is StatData {
  return Object.keys(asRecord(value)).length > 0;
}
