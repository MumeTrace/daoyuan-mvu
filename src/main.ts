import "./core-ui";
import "./runtime-state";
import "./compatibility-runtime";
import { pinia } from "./stores/pinia";
import { useImageLibraryStore } from "./stores/image-library";
import { scheduleAfterFirstPaint } from "./utils/schedule-idle";

const imageLibrary = useImageLibraryStore(pinia);
const cancelImageLibrarySchedule = scheduleAfterFirstPaint(
  () => void imageLibrary.initialize(),
  1500,
);

globalThis.addEventListener?.("pagehide", cancelImageLibrarySchedule, {
  once: true,
});
