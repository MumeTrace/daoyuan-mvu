<script setup lang="ts">
import { ref } from "vue";
import { usePortraitPool } from "../../composables/usePortraitPool";
import { useUiStore } from "../../stores/ui";
import ApplauseButton from "./ApplauseButton.vue";
import PortraitDrawer from "./PortraitDrawer.vue";
import PortraitImage from "./PortraitImage.vue";

const props = defineProps<{
  name: string;
  gender?: unknown;
  applause?: boolean;
  compact?: boolean;
}>();
const ui = useUiStore();
const expanded = ref(false);
const pool = usePortraitPool(() => props.name, () => props.gender ?? "");
const portraitUrl = pool.url;

function switchPortrait(): void {
  pool.cycle();
}

function openImage(): void {
  if (portraitUrl.value) ui.openImageModal(portraitUrl.value);
}

</script>

<template>
  <div class="portrait-wrapper" data-vue-portrait="true" :class="{ 'portrait-wrapper--compact': compact }">
    <div class="portrait-actions" :class="{ 'portrait-actions--two': !applause }">
      <button
        v-if="portraitUrl"
        class="portrait-toggle-btn"
        type="button"
        @click="expanded = !expanded"
      >{{ expanded ? "收起立绘 ▲" : "查看立绘 ▼" }}</button>
      <button
        v-else
        class="portrait-toggle-btn dy-muted-action"
        type="button"
        title="配置或获取角色立绘"
        @click="pool.showMissing"
      >暂无立绘</button>
      <button class="portrait-custom-btn" type="button" title="设置立绘" @click="pool.configure">🎨</button>
      <button class="portrait-custom-btn" type="button" title="切换立绘" @click="switchPortrait">🔄</button>
      <ApplauseButton v-if="applause" :name="name" />
      <PortraitDrawer :name="name" :opens-up="!expanded" @selected="pool.refresh" />
    </div>
    <div v-if="portraitUrl" class="large-portrait" :class="{ show: expanded }">
      <PortraitImage
        :src="expanded ? portraitUrl : ''"
        :alt="name"
        :retry-key="pool.revision.value"
        fallback-label="立绘加载失败"
        @activate="openImage"
      />
    </div>
    <div v-else class="large-portrait dy-missing-portrait">
      点击「🎨」上传本地图片
    </div>
  </div>
</template>
