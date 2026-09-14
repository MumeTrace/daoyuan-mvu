<script setup lang="ts">
import { ref, watch } from "vue";
import { readWritableData, setStatValue } from "../../composables/useMvuWrite";
import { useUiStore } from "../../stores/ui";
import { deepGet } from "../../utils/deep-utils";

const ui = useUiStore();
const fields = ref<Array<{ key: string; value: string; original: unknown }>>([]);
const loading = ref(false);
const error = ref("");

watch(() => [ui.activeModal, ...ui.jiuqiEditPath], async ([modal]) => {
  if (modal !== "jiuqi-edit") return;
  loading.value = true;
  error.value = "";
  try {
    const data = await readWritableData();
    const target = deepGet(data?.stat_data, ui.jiuqiEditPath);
    const record = target && typeof target === "object" && !Array.isArray(target)
      ? target as Record<string, unknown>
      : { 值: target };
    fields.value = Object.entries(record)
      .filter(([, value]) => value === null || typeof value !== "object")
      .map(([key, value]) => ({ key, value: String(value ?? ""), original: value }));
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : String(reason);
  } finally { loading.value = false; }
}, { immediate: true });

function converted(field: { value: string; original: unknown }): unknown {
  if (typeof field.original === "number" && field.value.trim() !== "" && Number.isFinite(Number(field.value))) return Number(field.value);
  if (typeof field.original === "boolean") return field.value === "true";
  return field.value;
}

async function save(): Promise<void> {
  loading.value = true;
  error.value = "";
  try {
    const current = await readWritableData();
    const target = deepGet(current.stat_data, ui.jiuqiEditPath);
    if (target && typeof target === "object" && !Array.isArray(target)) {
      const next = { ...(target as Record<string, unknown>) };
      fields.value.forEach((field) => { next[field.key] = converted(field); });
      await setStatValue(ui.jiuqiEditPath, next);
    } else {
      const valueField = fields.value.find((field) => field.key === "值");
      if (!valueField) throw new Error("当前值不可修改。");
      await setStatValue(ui.jiuqiEditPath, converted(valueField));
    }
    ui.closeModal();
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : String(reason);
  } finally { loading.value = false; }
}
</script>

<template>
  <div v-if="ui.activeModal === 'jiuqi-edit'" class="jiuqi-overlay" @click.self="ui.closeModal">
    <section class="jiuqi-edit-dialog" role="dialog" aria-modal="true">
      <h2>✨ 修改变量：{{ ui.jiuqiEditPath.at(-1) }}</h2>
      <p v-if="loading && !fields.length" class="dy-mana-text">正在读取当前楼层变量…</p>
      <p v-else-if="!fields.length && !error" class="dy-empty-state">该对象没有可直接修改的基础字段。</p>
      <div class="jiuqi-edit-fields">
        <label v-for="field in fields" :key="field.key">{{ field.key }}<textarea v-model="field.value" :rows="field.value.length > 25 ? 3 : 1"></textarea></label>
      </div>
      <p v-if="error" class="danger-text">{{ error }}</p>
      <div class="jiuqi-edit-actions"><button type="button" @click="ui.closeModal">取消</button><button type="button" :disabled="loading || !fields.length" @click="save">保存修改</button></div>
    </section>
  </div>
</template>
