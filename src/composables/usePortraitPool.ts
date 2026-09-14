import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { usePortraitStore } from "../stores/portraits";
import { useUiStore } from "../stores/ui";

export function usePortraitPool(name: () => string, gender: () => unknown = () => "") {
  const store = usePortraitStore();
  const ui = useUiStore();
  const revision = ref(0);
  const refresh = (): void => { store.reload(); revision.value += 1; };
  const options = computed(() => { void revision.value; return store.drawerOptions(name(), gender()); });
  const active = computed(() => options.value.find((option) => option.active) ?? options.value[0]);
  const url = computed(() => { void revision.value; return store.getUrl(name(), gender()); });

  function select(poolId: string): boolean {
    const changed = store.setActiveTheme(name(), poolId);
    if (changed) refresh();
    return changed;
  }
  function cycle(): void { store.cycle(name(), gender()); refresh(); }
  function configure(): void { ui.openPortraitEditor(name(), active.value?.id ?? "default"); }
  function showMissing(): void { ui.openMissingPortrait(name(), active.value?.id ?? "default"); }
  function preload(): void {
    if (!url.value) return;
    const image = new Image();
    image.decoding = "async";
    image.src = url.value;
  }
  onMounted(() => {
    globalThis.addEventListener?.("daoyuan_portraits_changed", refresh);
    globalThis.addEventListener?.("daoyuan_images_changed", refresh);
    preload();
  });
  onBeforeUnmount(() => {
    globalThis.removeEventListener?.("daoyuan_portraits_changed", refresh);
    globalThis.removeEventListener?.("daoyuan_images_changed", refresh);
  });
  return { options, active, url, revision, select, cycle, configure, showMissing, preload, refresh };
}
