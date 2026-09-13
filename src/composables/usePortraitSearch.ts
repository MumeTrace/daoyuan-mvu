import { ref, watch } from "vue";
import { searchPermittedCharacters } from "../features/character-lore";
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
    loading.value = true;
    error.value = "";
    const portraitResults = portraits.search(keyword).map((result) => ({
      ...result,
      sourceLabel: "图片库",
    }));

    try {
      const loreResults = keyword === "随机"
        ? []
        : await searchPermittedCharacters(keyword);
      if (currentRevision !== requestRevision) return;

      const merged = new Map<string, PortraitSearchResult>();
      for (const result of portraitResults) {
        merged.set(normalize(result.name), result);
      }
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
      results.value = portraitResults;
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

  return { query, results, searched, loading, error, search };
}
