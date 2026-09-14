import { ref, watch } from "vue";
import { searchPermittedCharacters } from "../features/character-lore";
import { shouldPreserveRandomPortraitResult } from "../features/portraits/search";
import { usePortraitStore } from "../stores/portraits";

export interface PortraitSearchResult {
  name: string;
  gender: string;
  url: string;
  sourceLabel: string;
}

function normalize(value: unknown): string {
  return String(value ?? "").trim().toLocaleLowerCase("zh-CN");
}

export function usePortraitSearch() {
  const portraits = usePortraitStore();
  const query = ref("");
  const results = ref<PortraitSearchResult[]>([]);
  const searched = ref(false);
  const loading = ref(false);
  const error = ref("");
  let requestRevision = 0;

  async function search(): Promise<void> {
    const keyword = query.value.trim();
    const currentRevision = ++requestRevision;
    if (!keyword) {
      searched.value = false;
      loading.value = false;
      error.value = "";
      results.value = [];
      return;
    }

    searched.value = true;
    error.value = "";
    const portraitResults = portraits.search(keyword).map((result) => ({
      ...result,
      sourceLabel: "图片库",
    }));

    // Preserve the workshop-preview behavior as the primary path: main,
    // Workshop and custom portrait names are available synchronously from the
    // merged portrait store. Only scan permitted lorebooks when that index has
    // no match, so a usable portrait result is never held behind host APIs.
    if (portraitResults.length > 0 || keyword === "随机") {
      results.value = portraitResults;
      loading.value = false;
      return;
    }

    loading.value = true;

    try {
      const loreResults = await searchPermittedCharacters(keyword);
      if (currentRevision !== requestRevision) return;

      const merged = new Map<string, PortraitSearchResult>();
      for (const lore of loreResults) {
        const identity = normalize(lore.name);
        const existing = merged.get(identity);
        if (existing) {
          const sources = new Set(
            `${existing.sourceLabel} / ${lore.sourceLabel}`
              .split("/")
              .map((source) => source.trim())
              .filter(Boolean),
          );
          existing.sourceLabel = [...sources].join(" / ");
          continue;
        }
        merged.set(identity, {
          name: lore.name,
          gender: "",
          url: portraits.getUrl(lore.name),
          sourceLabel: lore.sourceLabel,
        });
      }
      results.value = [...merged.values()];
    } catch (reason) {
      if (currentRevision !== requestRevision) return;
      results.value = [];
      error.value = reason instanceof Error
        ? reason.message
        : "人物世界书查询暂时不可用。";
    } finally {
      if (currentRevision === requestRevision) loading.value = false;
    }
  }

  watch(query, () => {
    requestRevision += 1;
    loading.value = false;
    error.value = "";
    searched.value = false;
    results.value = [];
  });

  // Workshop snapshots arrive after first paint. Match the legacy branch's
  // visible-search refresh without recreating DOM or forcing a status-bar
  // reload; an in-flight lorebook fallback is cancelled by requestRevision.
  watch(
    () => portraits.revision,
    () => {
      if (!searched.value || !query.value.trim()) return;
      if (shouldPreserveRandomPortraitResult(query.value, results.value.length)) {
        // Changing this character's drawer/theme also increments the portrait
        // revision. Refresh the rendered URL without performing another
        // random draw, otherwise selecting a portrait would replace the
        // character card itself.
        results.value = results.value.map((result) => ({
          ...result,
          url: portraits.getUrl(result.name, result.gender),
        }));
        return;
      }
      void search();
    },
  );

  return { query, results, searched, loading, error, search };
}
