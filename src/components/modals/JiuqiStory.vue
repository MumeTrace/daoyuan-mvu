<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from "vue";
import { useHeroStore } from "../../stores/hero";
import { useUiStore } from "../../stores/ui";

const ui = useUiStore();
const hero = useHeroStore();
const seconds = ref(10);
const scrolled = ref(false);
const storyBox = ref<HTMLElement | null>(null);
let timer: ReturnType<typeof setInterval> | undefined;
const ready = computed(() => seconds.value <= 0 && scrolled.value);
const buttonText = computed(() => seconds.value > 0 ? `须静心感悟 (${seconds.value}s)` : scrolled.value ? "返回现实（开启修改）" : "请下拉阅尽真言");

function stopTimer(): void { if (timer) clearInterval(timer); timer = undefined; }
watch(() => ui.activeModal, (modal) => {
  stopTimer();
  if (modal !== "jiuqi-story") return;
  seconds.value = 10;
  scrolled.value = false;
  timer = setInterval(() => { if (seconds.value > 0) seconds.value -= 1; else stopTimer(); }, 1000);
  void nextTick(() => checkScrollElement(storyBox.value));
}, { immediate: true });
onBeforeUnmount(stopTimer);
function checkScrollElement(box: HTMLElement | null): void {
  if (box && box.scrollHeight - box.scrollTop <= box.clientHeight + 40) scrolled.value = true;
}
function checkScroll(event: Event): void {
  checkScrollElement(event.currentTarget as HTMLElement);
}
</script>

<template>
  <div v-if="ui.activeModal === 'jiuqi-story'" class="jiuqi-overlay">
    <section class="jiuqi-story-dialog">
      <h2>✨ 坠入瑶池 ✨</h2>
      <div ref="storyBox" class="jiuqi-story-scroll" @scroll="checkScroll">
        <p>你点下了那个闪烁着奇异紫芒的按钮。指尖触碰的瞬间，周遭的空间如同琉璃般轰然碎裂。</p>
        <p>一阵天旋地转后，你跌落在一片开满赤红彼岸花的云海之中。</p>
        <p>清脆的铃铛声<span class="jiuqi-dim">『叮当』</span>作响，由远及近。一袭玄色帝袍映入眼帘，来人银白长发随意用木簪挽起，那双宛如深渊与明月交织的眼眸正似笑非笑地睨着你。</p>
        <p><strong>“哦？又是哪个误触了本尊留下的锚点？”</strong></p>
        <p>她轻摇手中的红玖鸯折扇，语气慵懒却带着不容直视的威压。这便是仙界唯一的超脱境至尊——<strong class="jiuqi-name">玖柒</strong>。</p>
        <p>你咽了口唾沫，小心翼翼地说明了想请她帮忙<em class="jiuqi-mana">『拨弄命理法则』</em>的来意。</p>
        <p>她用扇骨挑起你的下巴，轻笑一声：<strong>“改写命运？倒是不难。不过……”</strong></p>
        <p>她眼神微转，透出几分护短的愠怒与锐利：<strong>“本尊不知你平时用的何种灵力源泉，但近期下界多有<em class="jiuqi-danger">『二道贩子』</em>招摇撞骗，卖些掺水的<em class="jiuqi-danger">『假酒』</em>！不仅窃取修士因果隐私，还骗光了你们的灵石！”</strong></p>
        <p>玖柒收拢折扇，轻轻敲了敲你的额头：<strong>“若是你正用着那些腌臜物，趁早悬崖勒马！去寻那<em class="jiuqi-gold">『类脑公益站』</em>，或是正经的<em class="jiuqi-exp">『官方 API』</em>。若是没用，便算本尊多嘴。”</strong></p>
        <p><strong>“若是好奇那帮蝼蚁究竟是如何作恶的，南可熙那丫头在仙途起点留了一道详尽的警示符箓。”</strong>玖柒轻摇折扇，眼底闪过一丝戏谑，<strong>“只需在<em class="jiuqi-gold">『开启新历练』</em>（开始游戏）时，择那<em class="jiuqi-gold">『平波缓进』</em>（简单模式）之道，于<em class="jiuqi-gold">『自选气运』</em>中便能寻见。本尊嫌她聒噪，你若有闲心，大可去细看。”</strong></p>
        <p><strong>“看在你寻到此处的缘分，这万千法则，全凭你心意揉捏。”</strong></p>
        <p>说罢，玖柒手中折扇向你轻挥。一阵清风拂过，你的意识猛然抽离……</p>
        <img src="https://free-img.400040.xyz/4/2026/05/13/6a041fca5427f.png" alt="玖柒" />
      </div>
      <p class="jiuqi-story-once">此段感悟仅在当前主角档案首次开启修改时出现。</p>
      <button type="button" :disabled="!ready" @click="ui.completeJiuqiStory(String(hero.data.姓名 || 'default'))">{{ buttonText }}</button>
    </section>
  </div>
</template>
