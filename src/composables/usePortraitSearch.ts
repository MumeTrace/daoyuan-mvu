import { ref } from "vue";
import { usePortraitStore } from "../stores/portraits";
export interface PortraitSearchResult { name: string; gender: string; url: string }
export function usePortraitSearch() {
  const portraits = usePortraitStore();
  const query = ref("");
  const results = ref<PortraitSearchResult[]>([]);
  const searched = ref(false);
  function search(): void {
    const keyword = query.value.trim();
    if (!keyword) {
      searched.value = false;
      results.value = [];
      return;
    }
    searched.value = true;
    results.value = portraits.search(keyword);
  }
  return { query, results, searched, search };
}
