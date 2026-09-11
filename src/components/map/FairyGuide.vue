<script setup lang="ts">
import { computed, ref } from "vue";
import { useFairyStore } from "../../stores/fairy";
import { useUiStore } from "../../stores/ui";

const fairy = useFairyStore();
const ui = useUiStore();
const images = [
  "https://i.postimg.cc/rpz2PCrZ/Image-1765540443504.jpg",
  "https://i.postimg.cc/B6bsPC8Q/Image-1765540442059.jpg",
];
const imageIndex = ref(0);
const visible = ref(false);
const message = ref("...");
const imageUrl = computed(() => images[imageIndex.value] ?? "");

function activate(): void {
  imageIndex.value = (imageIndex.value + 1) % images.length;
  visible.value = !visible.value;
  if (visible.value) {
    message.value = fairy.lines.length
      ? fairy.lines[Math.floor(Math.random() * fairy.lines.length)] ?? "..."
      : "道友，此地天机混沌，竟无一言可示...";
  }
}
</script>

<template>
  <div class="fairy-bubble" :class="{ 'dy-fairy-visible': visible }"><span>{{ message }}</span></div>
  <button
    class="fairy-avatar"
    type="button"
    title="点击器灵查看提示，右键/长按查看大图"
    :style="{ backgroundImage: `url(${JSON.stringify(imageUrl)})` }"
    @click="activate"
    @contextmenu.prevent="ui.openImageModal(imageUrl)"
  ></button>
</template>
