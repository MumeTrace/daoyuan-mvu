<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from "vue";
import { removeStatValue } from "../../composables/useMvuWrite";
import { useUiStore } from "../../stores/ui";

const props = defineProps<{
  kind: "npc" | "partner" | "pet" | "skill" | "quest" | "event" | "beauty" | "item" | "artifact" | "luck";
  name: string;
}>();
const ui = useUiStore();
const dataAttribute = computed(() => ({ [`data-${props.kind}`]: props.name }));
const roots = { npc: "人物", partner: "道侣", pet: "灵宠", skill: "主角|功法", quest: "机遇", event: "世界|动向", beauty: "绝色榜", item: "主角|储物袋", artifact: "主角|器物", luck: "主角|气运" } as const;
const armed = ref(false);
let resetTimer: ReturnType<typeof setTimeout> | undefined;
const path = computed(() => [...roots[props.kind].split("|"), props.name]);

async function click(event: Event): Promise<void> {
  event.stopPropagation();
  if (ui.editMode) {
    ui.openJiuqiEditor(path.value);
    return;
  }
  if (!armed.value) {
    armed.value = true;
    resetTimer = setTimeout(() => { armed.value = false; }, 2000);
    return;
  }
  armed.value = false;
  if (resetTimer) clearTimeout(resetTimer);
  await removeStatValue(path.value);
}
onBeforeUnmount(() => { if (resetTimer) clearTimeout(resetTimer); });
</script>

<template>
  <button
    class="card-discard"
    type="button"
    :title="ui.editMode ? '修改' : '删除'"
    :class="{ 'discard-confirm': armed }"
    v-bind="dataAttribute"
    @click="click"
  >{{ ui.editMode ? "✎" : armed ? "确认" : "✕" }}</button>
</template>
