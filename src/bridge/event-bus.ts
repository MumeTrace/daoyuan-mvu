import { requireCapability } from "./errors";
import type {
  TavernEventHandle,
  TavernEventHandler,
  TavernHost,
} from "../types/tavern";

export interface TavernEventBus {
  /** Tavern Helper: register a listener and always return an idempotent stop handle. */
  on(event: string, handler: TavernEventHandler): TavernEventHandle;
  /** Tavern Helper: eventEmit is asynchronous in the maintained contract. */
  emit(event: string, ...args: unknown[]): Promise<void>;
  stopAll(): void;
}

function browserHost(): TavernHost {
  return window;
}

export function createTavernEventBus(
  getHost: () => TavernHost = browserHost,
): TavernEventBus {
  const activeHandles = new Set<TavernEventHandle>();

  return {
    on(event, handler) {
      const host = getHost();
      const eventOn = requireCapability(host.eventOn, "eventOn", "Tavern Helper");
      let active = true;
      const guardedHandler: TavernEventHandler = (...args) => {
        if (active) return handler(...args);
      };
      const nativeHandle = eventOn.call(host, event, guardedHandler);

      const handle: TavernEventHandle = {
        stop() {
          if (!active) return;
          active = false;
          if (nativeHandle && typeof nativeHandle.stop === "function") {
            nativeHandle.stop();
          } else if (typeof host.eventOff === "function") {
            host.eventOff(event, guardedHandler);
          }
          activeHandles.delete(handle);
        },
      };
      activeHandles.add(handle);
      return handle;
    },

    async emit(event, ...args) {
      const host = getHost();
      const eventEmit = requireCapability(
        host.eventEmit,
        "eventEmit",
        "Tavern Helper",
      );
      await eventEmit.call(host, event, ...args);
    },

    stopAll() {
      [...activeHandles].forEach((handle) => handle.stop());
    },
  };
}

export const tavernEvents = createTavernEventBus();
