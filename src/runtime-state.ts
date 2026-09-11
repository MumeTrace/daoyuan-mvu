import { pinia } from "./stores/pinia";
import { createStatDataController } from "./composables/useStatData";

export const statDataController = createStatDataController(pinia);

void statDataController.start();

globalThis.addEventListener?.("pagehide", () => statDataController.stop(), {
  once: true,
});
