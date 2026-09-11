<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import registry from "../../../data/applause-character-registry.json";

const props = defineProps<{ name: string }>();
const runtimeState = ref<"loading" | "ready" | "unavailable">("loading");
let unavailableTimer: ReturnType<typeof setTimeout> | undefined;
let active = true;
const characterId = computed(() => {
  const record = registry.characters.find(
    (candidate) => candidate.status === "active" && candidate.name.trim() === props.name.trim(),
  );
  return record?.characterId ?? 0;
});

onMounted(() => {
  const registry = globalThis.customElements;
  if (!registry) {
    runtimeState.value = "unavailable";
    return;
  }
  if (registry.get("daoyuan-applause")) {
    runtimeState.value = "ready";
    return;
  }
  unavailableTimer = setTimeout(() => {
    if (active) runtimeState.value = "unavailable";
  }, 5000);
  void registry.whenDefined("daoyuan-applause").then(() => {
    if (!active) return;
    if (unavailableTimer !== undefined) clearTimeout(unavailableTimer);
    runtimeState.value = "ready";
  });
});

onBeforeUnmount(() => {
  active = false;
  if (unavailableTimer !== undefined) clearTimeout(unavailableTimer);
});
</script>

<template>
  <component
    :is="'daoyuan-applause'"
    v-if="characterId"
    class="portrait-applause"
    :character-id="characterId"
    :aria-label="`为${name}点赞`"
    :aria-disabled="runtimeState !== 'ready'"
    :data-busy="runtimeState === 'loading' ? '' : undefined"
    :data-runtime-blocked="runtimeState === 'unavailable' ? '' : undefined"
    :title="runtimeState === 'unavailable' ? '点赞服务暂时不可用' : runtimeState === 'loading' ? '点赞服务加载中' : `为${name}点赞`"
  ><span aria-hidden="true">👏</span></component>
</template>
