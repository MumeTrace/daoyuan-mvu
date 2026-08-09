<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, watch } from "vue";
import { renderDaoyuanApplause } from "./applause.js";
import {
  beautyForumState,
  applyBeautyForumPreset,
  deleteBeautyForumPreset,
  refreshBeautyForumPresets,
  saveBeautyForumSettings,
  saveBeautyForumPreset,
  setBeautyForumStatus,
} from "./beauty-forum-store.js";

const portraitOpen = reactive({});
const deleteTimers = new Map();

const cards = computed(() => beautyForumState.cards);
const portraitRevision = computed(() => beautyForumState.portraitRevision);

function hasPortrait(card) {
  void portraitRevision.value;
  const name = String(card?.name || "");
  if (!name) return false;
  const gender = card?.data?.性别;
  return Boolean(window.getPortraitUrl?.(name, gender));
}

function portraitUrl(card) {
  void portraitRevision.value;
  const name = String(card?.name || "");
  const gender = card?.data?.性别;
  return window.getPortraitUrl?.(name, gender) || "";
}

function rankLabel(card, index) {
  return card?.data?.排名 || index + 1;
}

function threadFor(name) {
  const key = String(name || "");
  if (!beautyForumState.threads[key]) beautyForumState.threads[key] = [];
  return beautyForumState.threads[key];
}

function draftFor(name) {
  const key = String(name || "");
  if (beautyForumState.drafts[key] === undefined) beautyForumState.drafts[key] = "";
  return beautyForumState.drafts[key];
}

function isExpanded(name) {
  return beautyForumState.expanded[String(name || "")] !== false;
}

function isDeleteArmed(name) {
  return beautyForumState.deleteArmed[String(name || "")] === true;
}

function setDeleteArmed(name, value) {
  beautyForumState.deleteArmed[String(name || "")] = Boolean(value);
}

function setExpanded(name, value) {
  beautyForumState.expanded[String(name || "")] = Boolean(value);
}

function toggleThread(name) {
  setExpanded(name, !isExpanded(name));
}

function cardFloorCount(name) {
  return threadFor(name).length;
}

function floorLabel(index) {
  return `${index + 1}楼`;
}

function floorTime(floor) {
  if (!floor?.createdAt) return "";
  const date = new Date(floor.createdAt);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function escapeSelectorValue(value) {
  if (window.CSS && typeof window.CSS.escape === "function") {
    return window.CSS.escape(String(value || ""));
  }
  return String(value || "").replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

async function scrollThreadToBottom(name) {
  await nextTick();
  const selector = `[data-beauty="${escapeSelectorValue(name)}"]`;
  const card = document.querySelector(selector);
  const list = card?.querySelector(".forum-thread-list");
  if (list) {
    list.scrollTop = list.scrollHeight;
  }
}

function togglePortrait(name) {
  const key = String(name || "");
  portraitOpen[key] = !portraitOpen[key];
}

function syncPortraitState() {
  cards.value.forEach((card) => {
    const key = String(card.name || "");
    if (!key) return;
    if (portraitOpen[key] === undefined) {
      portraitOpen[key] = false;
    }
    if (!hasPortrait(card)) {
      portraitOpen[key] = false;
    }
    if (beautyForumState.deleteArmed[key] === undefined) {
      beautyForumState.deleteArmed[key] = false;
    }
    if (beautyForumState.expanded[key] === undefined) {
      beautyForumState.expanded[key] = false;
    }
  });
}

watch(
  () =>
    cards.value
      .map((card) => `${card.name}:${card.data?.排名 || ""}:${card.data?.性别 || ""}`)
      .join("|"),
  async () => {
    syncPortraitState();
    await nextTick();
    if (typeof window.injectPortraitDrawers === "function") {
      window.injectPortraitDrawers();
    }
  },
  { immediate: true },
);

watch(portraitRevision, async () => {
  syncPortraitState();
  await nextTick();
  if (typeof window.injectPortraitDrawers === "function") {
    window.injectPortraitDrawers();
  }
});

function normalizeApiRoot(url) {
  let root = String(url || "").trim();
  if (!root) return "";
  root = root.replace(/\/chat\/completions\/?$/i, "");
  root = root.replace(/\/models\/?$/i, "");
  if (root.endsWith("/")) root = root.slice(0, -1);
  return root;
}

function normalizeChatEndpoint(url) {
  const root = normalizeApiRoot(url);
  if (!root) return "";
  return `${root}/chat/completions`;
}

function buildHeroContext() {
  try {
    const allVariables =
      typeof window.getAllVariables === "function" ? window.getAllVariables() : {};
    const stat = allVariables?.stat_data || {};
    const hero = stat.主角 || {};
    const world = stat.世界 || {};
    const skills = hero.功法 || {};
    const skillNames = Object.entries(skills)
      .map(([name, data]) => `${name}(${data?.境界 || "未知"})`)
      .join("、");
    return (
      `[主角当前状态]\n` +
      `境界: ${hero.境界 || "未知"}\n` +
      `所在界域: ${hero.所在界 || "未知"}\n` +
      `当前地点: ${world.当前地点 || "未知"}\n` +
      `当前时间: ${world.当前时间 || "未知"}\n` +
      `灵根: ${hero.灵根 || "无"}\n` +
      `功法: ${skillNames || "无"}`
    );
  } catch (error) {
    return "";
  }
}

function buildCharacterContext(card) {
  try {
    const allVariables =
      typeof window.getAllVariables === "function" ? window.getAllVariables() : {};
    const stat = allVariables?.stat_data || {};
    const yujianData = stat.玉简?.[card.name] || {};
    const mergedData = { ...(card?.data || {}) };
    if (yujianData.境界) mergedData.境界 = yujianData.境界;
    if (yujianData.性别) mergedData.性别 = yujianData.性别;
    if (yujianData.关系) mergedData.关系 = yujianData.关系;
    if (yujianData.好感度) mergedData.好感度 = yujianData.好感度;

    let output = "\n\n[你的当前状态/面板设定]\n";
    let hasValue = false;
    Object.entries(mergedData).forEach(([key, value]) => {
      if (typeof value !== "object" && value !== undefined && value !== null) {
        output += `${key}: ${value}\n`;
        hasValue = true;
      }
    });
    return hasValue ? output : "";
  } catch (error) {
    return "";
  }
}

function buildThreadHistory(floors, skipId) {
  const lines = [];
  const visibleFloors = skipId
    ? floors.filter((floor) => floor.id !== skipId)
    : floors;
  visibleFloors.forEach((floor, index) => {
    lines.push(
      `[${index + 1}楼] 主角: ${floor.userContent || ""}\n` +
        (floor.aiContent ? `【回复】${floor.aiContent}` : ""),
    );
  });
  return lines.join("\n\n");
}

function cleanForumReply(rawReply) {
  let extracted = String(rawReply || "");
  extracted = extracted.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
  const replyMatch =
    extracted.match(/\[REPLY\]([\s\S]*?)\[\/REPLY\]/i) ||
    extracted.match(/【回复】([\s\S]*?)【\/回复】/);
  if (replyMatch && replyMatch[1]) {
    extracted = replyMatch[1].trim();
  } else {
    extracted = extracted.replace(/^[<q>"'「”]|["</q>'」]$/g, "").trim();
  }
  return extracted || "对方传来了模糊不清的神念...";
}

async function callForumGenerateReply(card, userMessage, floors, floorId) {
  const settings = beautyForumState.settings || {};
  const extraPrompt = String(settings.extraPrompt || "").trim();
  const heroContext = buildHeroContext();
  const characterContext = buildCharacterContext(card);
  const historyText = buildThreadHistory(floors, floorId);

  let systemPrompt =
    `[绝色榜回帖系统]\n` +
    `你正在绝色榜下方的回帖区，以【${card.name}】的身份回复主角的留言。` +
    `回复必须口语化、自然、简短，贴合人物性格，不要输出角色名、动作说明、标签或多余解释。`;

  systemPrompt += `\n\n[绝色榜人物]\n`;
  systemPrompt += `姓名: ${card.name}\n`;
  systemPrompt += `排名: ${card?.data?.排名 || "未知"}\n`;
  systemPrompt += `头衔: ${card?.data?.头衔 || "无"}\n`;
  systemPrompt += `仙姿: ${card?.data?.仙姿 || "无"}\n`;
  systemPrompt += `群芳谱: ${card?.data?.群芳谱 || "无"}`;

  if (heroContext) systemPrompt += `\n\n${heroContext}`;
  if (characterContext) systemPrompt += characterContext;
  if (historyText) systemPrompt += `\n\n[历史回帖记录]\n${historyText}`;
  if (extraPrompt) systemPrompt += `\n\n[附加设定/规则]\n${extraPrompt}`;

  const userInput = String(userMessage || "").trim();
  const customBase = normalizeApiRoot(settings.apiBaseUrl);
  const customModel = String(settings.apiModel || "").trim();

  if (customBase && customModel) {
    const endpoint = normalizeChatEndpoint(customBase);
    const payload = {
      model: customModel,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userInput },
      ],
      temperature: Number.isFinite(Number(settings.temperature))
        ? Number(settings.temperature)
        : 0.7,
      max_tokens: 1200,
    };
    const headers = { "Content-Type": "application/json" };
    if (settings.apiKey) headers.Authorization = `Bearer ${settings.apiKey}`;

    const response = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`API 请求失败: ${response.status} - ${text}`);
    }
    const data = await response.json();
    const content =
      data?.choices?.[0]?.message?.content ??
      data?.choices?.[0]?.text ??
      data?.reply ??
      data?.text ??
      "";
    return cleanForumReply(content);
  }

  if (typeof window.generate === "function") {
    const combinedPrompt = `${systemPrompt}\n\n${userInput}`;
    const rawReply = await window.generate({
      user_input: combinedPrompt,
      should_stream: false,
      max_chat_history: 15,
    });

    if (typeof rawReply === "string") return cleanForumReply(rawReply);
    if (rawReply && typeof rawReply === "object") {
      return cleanForumReply(
        rawReply.text || rawReply.reply || rawReply.content || "",
      );
    }
    return cleanForumReply(String(rawReply || ""));
  }

  throw new Error("未找到可用的回复生成接口");
}

async function fetchApiModels() {
  const base = normalizeApiRoot(beautyForumState.settings.apiBaseUrl);
  if (!base) {
    setBeautyForumStatus("请先填写基础 URL 再获取模型。", "warn");
    return;
  }
  try {
    const headers = {};
    if (beautyForumState.settings.apiKey) {
      headers.Authorization = `Bearer ${beautyForumState.settings.apiKey}`;
    }
    const response = await fetch(`${base}/models`, { headers });
    if (!response.ok) {
      throw new Error(`模型列表请求失败: ${response.status}`);
    }
    const data = await response.json();
    const models = Array.isArray(data?.data)
      ? data.data
          .map((item) => item?.id || item?.name)
          .filter((item) => typeof item === "string" && item.trim())
      : [];
    beautyForumState.modelOptions = models;
    if (models.length > 0 && !beautyForumState.settings.apiModel) {
      beautyForumState.settings.apiModel = models[0];
    }
    setBeautyForumStatus(
      models.length > 0 ? "模型列表已更新。" : "未获取到可用模型。",
      models.length > 0 ? "success" : "warn",
    );
  } catch (error) {
    console.error("[道渊] 获取绝色榜回帖模型失败:", error);
    setBeautyForumStatus(`获取模型失败：${error.message}`, "error");
  }
}

function saveSettings() {
  saveBeautyForumSettings(beautyForumState.settings);
  setBeautyForumStatus("绝色榜回帖设定已保存。", "success");
}

function openSettings() {
  refreshBeautyForumPresets();
  beautyForumState.settingsOpen = true;
}

function closeSettings() {
  beautyForumState.settingsOpen = false;
}

function applySelectedPreset() {
  const presetName = String(beautyForumState.settingsPresetName || "").trim();
  if (!presetName) {
    setBeautyForumStatus("请先选择一个绝色榜回帖预设。", "warn");
    return;
  }
  const applied = applyBeautyForumPreset(presetName);
  if (!applied) {
    setBeautyForumStatus(`预设【${presetName}】不存在。`, "error");
    return;
  }
  setBeautyForumStatus(`已应用预设【${presetName}】。`, "success");
}

function saveCurrentAsPreset() {
  const fallbackName = String(beautyForumState.settingsPresetName || "").trim();
  const presetName = window.prompt("请输入绝色榜回帖预设名称：", fallbackName || "");
  if (presetName === null) return;
  const trimmed = String(presetName || "").trim();
  if (!trimmed) {
    setBeautyForumStatus("预设名称不能为空。", "warn");
    return;
  }
  if (!saveBeautyForumPreset(trimmed, beautyForumState.settings)) {
    setBeautyForumStatus("保存预设失败。", "error");
    return;
  }
  refreshBeautyForumPresets();
  beautyForumState.settingsPresetName = trimmed;
  setBeautyForumStatus(`已保存预设【${trimmed}】。`, "success");
}

function deleteSelectedPreset() {
  const presetName = String(beautyForumState.settingsPresetName || "").trim();
  if (!presetName) {
    setBeautyForumStatus("请先选择一个要删除的绝色榜预设。", "warn");
    return;
  }
  if (!confirm(`确定要删除绝色榜预设【${presetName}】吗？`)) return;
  if (!deleteBeautyForumPreset(presetName)) {
    setBeautyForumStatus(`预设【${presetName}】不存在。`, "error");
    return;
  }
  refreshBeautyForumPresets();
  setBeautyForumStatus(`预设【${presetName}】已删除。`, "success");
}

function toggleLike(floor) {
  if (!floor) return;
  if (floor.liked) {
    floor.liked = false;
    floor.likes = Math.max(0, Number(floor.likes || 0) - 1);
  } else {
    floor.liked = true;
    floor.likes = Number(floor.likes || 0) + 1;
  }
}

function deleteFloor(cardName, floorId) {
  const thread = threadFor(cardName);
  const index = thread.findIndex((item) => item.id === floorId);
  if (index < 0) return;
  if (!confirm("确定删除这层回帖吗？")) return;
  thread.splice(index, 1);
}

async function retryFloor(card, floor) {
  if (!card || !floor) return;
  if (beautyForumState.generatingName) {
    setBeautyForumStatus("正在生成其他回帖，请稍后再试。", "warn");
    return;
  }

  beautyForumState.generatingName = card.name;
  floor.status = "pending";
  floor.error = "";
  try {
    const floors = threadFor(card.name);
    const reply = await callForumGenerateReply(
      card,
      floor.userContent,
      floors,
      floor.id,
    );
    floor.aiContent = reply || "对方似乎没有想好怎么回复...";
    floor.status = "done";
    await scrollThreadToBottom(card.name);
  } catch (error) {
    floor.status = "error";
    floor.error = error?.message || String(error);
    setBeautyForumStatus(`回帖生成失败：${floor.error}`, "error");
    await scrollThreadToBottom(card.name);
  } finally {
    beautyForumState.generatingName = "";
  }
}

async function submitReply(card) {
  if (!card?.name) return;
  if (beautyForumState.generatingName) {
    setBeautyForumStatus("正在生成其他回帖，请稍后再试。", "warn");
    return;
  }

  const key = String(card.name || "");
  const draft = String(draftFor(key) || "").trim();
  if (!draft) {
    window.alert?.("回帖内容不能为空！");
    return;
  }

  const thread = threadFor(key);
  const replyTo = thread.length > 0 ? thread[thread.length - 1].id : null;
  const floor = {
    id: `forum_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    userContent: draft,
    aiContent: "",
    createdAt: Date.now(),
    replyTo,
    likes: 0,
    liked: false,
    status: "pending",
    error: "",
  };

  thread.push(floor);
  beautyForumState.drafts[key] = "";
  beautyForumState.generatingName = key;
  setBeautyForumStatus(`正在为【${key}】生成回帖...`, "info");

  try {
    const reply = await callForumGenerateReply(card, draft, thread, floor.id);
    floor.aiContent = reply || "对方似乎没有想好怎么回复...";
    floor.status = "done";
    setBeautyForumStatus(`【${key}】回帖已生成。`, "success");
    await scrollThreadToBottom(key);
  } catch (error) {
    floor.status = "error";
    floor.error = error?.message || String(error);
    setBeautyForumStatus(`回帖生成失败：${floor.error}`, "error");
    await scrollThreadToBottom(key);
  } finally {
    beautyForumState.generatingName = "";
  }
}

function onDraftKeydown(card, event) {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    submitReply(card);
  }
}

function resizeReplyInput(event) {
  const target = event?.target;
  if (!target) return;
  target.style.height = "auto";
  target.style.height = `${target.scrollHeight}px`;
}

function armDeleteBeauty(card) {
  const name = String(card?.name || "");
  if (!name) return;
  if (!isDeleteArmed(name)) {
    setDeleteArmed(name, true);
    if (deleteTimers.has(name)) clearTimeout(deleteTimers.get(name));
    deleteTimers.set(
      name,
      setTimeout(() => {
        setDeleteArmed(name, false);
        deleteTimers.delete(name);
      }, 2000),
    );
    return;
  }
  setDeleteArmed(name, false);
  if (deleteTimers.has(name)) {
    clearTimeout(deleteTimers.get(name));
    deleteTimers.delete(name);
  }
  deleteBeautyEntry(card.name);
}

async function deleteBeautyEntry(name) {
  try {
    const lastMsgId = window.getLastMessageId?.();
    if (!lastMsgId) return;
    const messages = window.getChatMessages?.(`0-${lastMsgId}`, {
      role: "assistant",
    });
    if (!messages || messages.length === 0) return;
    const targetMsgId = messages[messages.length - 1].message_id;

    if (window.Mvu && typeof window.Mvu.replaceMvuData === "function") {
      const fullData = window.Mvu.getMvuData({
        type: "message",
        message_id: targetMsgId,
      });
      if (fullData?.stat_data?.绝色榜?.[name]) {
        delete fullData.stat_data.绝色榜[name];
        await window.Mvu.replaceMvuData(fullData, {
          type: "message",
          message_id: targetMsgId,
        });
        await window.notifyDaoyuanMvuChanged(fullData);
      }
    }
  } catch (error) {
    console.error("[道渊] 删除绝色榜条目失败:", name, error);
    window.alert?.(`删除失败：${error.message || error}`);
  }
}

function openThreadSettings() {
  openSettings();
}

function closeStatusMessage() {
  beautyForumState.statusMessage = "";
  beautyForumState.statusTone = "info";
}

onMounted(async () => {
  await nextTick();
  refreshBeautyForumPresets();
  if (typeof window.injectPortraitDrawers === "function") {
    window.injectPortraitDrawers();
  }
});

onBeforeUnmount(() => {
  deleteTimers.forEach((timer) => clearTimeout(timer));
  deleteTimers.clear();
});

window.fetchBeautyForumModels = fetchApiModels;
</script>

<template>
  <div class="beauty-forum-root">
    <div class="forum-topbar">
      <div class="forum-topbar-copy">
        <div class="forum-topbar-head">
          <div class="forum-topbar-title">绝色榜回帖</div>
          <button class="forum-topbar-btn" type="button" title="回帖设定" @click="openThreadSettings">
            ⚙️
          </button>
        </div>
        <div class="forum-topbar-subtitle">回帖状态只保存在当前页面内存里</div>
      </div>
    </div>

    <div v-if="!cards.length" class="empty-state forum-empty">
      <strong>暂无相关记录。</strong>
      <span>等绝色榜数据刷新后，这里才会出现回帖区。</span>
    </div>

    <div v-else class="forum-card-list">
      <article
        v-for="(card, index) in cards"
        :key="card.name"
        class="info-card beauty-forum-card"
        :data-beauty="card.name"
      >
        <div class="beauty-forum-meta">
          <span
            v-if="card.data?.头衔"
            class="beauty-forum-title-badge"
            :title="card.data.头衔"
          >
            {{ card.data.头衔 }}
          </span>
          <button
            class="beauty-forum-delete"
            type="button"
            :class="{ armed: isDeleteArmed(card.name) }"
            :title="isDeleteArmed(card.name) ? '再次点击确认删除' : '删除绝色榜条目'"
            @click.stop="armDeleteBeauty(card)"
          >
            {{ isDeleteArmed(card.name) ? "删除?" : "✕" }}
          </button>
        </div>

        <div class="info-title beauty-forum-head">
          <span
            class="beauty-forum-name"
            title="点击探查天机"
            @click.stop="window.showLoreByName?.(card.name)"
          >
            第{{ rankLabel(card, index) }}名：{{ card.name }}
          </span>
        </div>

        <div class="info-text beauty-forum-copy">
          <b>倾世仙姿：</b>
          <span style="color:#dcdde1">{{ card.data?.仙姿 || "暂无描述" }}</span>
          <br /><br />
          <b>坊间群芳谱：</b>
          <i style="font-size:0.9em; color:#bbb;">"{{ card.data?.群芳谱 || "暂无描述" }}"</i>
        </div>

        <div class="portrait-wrapper">
          <div class="portrait-actions">
            <div
              v-if="hasPortrait(card)"
              class="portrait-toggle-btn"
              @click.stop="togglePortrait(card.name)"
            >
              {{ portraitOpen[card.name] ? "收起立绘 ▲" : "查看立绘 ▼" }}
            </div>
            <div
              v-else
              class="portrait-toggle-btn"
              style="opacity:0.75;"
              title="配置或获取角色立绘"
              @click.stop="window.showMissingPortraitDialog?.(card.name)"
            >
              暂无立绘
            </div>

            <div
              class="portrait-custom-btn"
              title="设置立绘"
              @click.stop="window.openCustomPortraitDialog?.(card.name)"
            >
              🎨
            </div>
            <div
              class="portrait-custom-btn"
              title="切换立绘"
              @click.stop="window.switchPortrait?.(card.name)"
            >
              🔄
            </div>
            <span class="forum-applause" v-html="renderDaoyuanApplause(card.name)"></span>
            <button
              class="forum-thread-toggle"
              type="button"
              :title="isExpanded(card.name) ? '收起回帖' : '展开回帖'"
              @click.stop="toggleThread(card.name)"
            >
              <span class="forum-thread-icon">✎</span>
              <span>回帖</span>
              <span class="forum-thread-caret">{{ isExpanded(card.name) ? "▲" : "▼" }}</span>
            </button>
          </div>

          <div v-if="hasPortrait(card)" class="large-portrait" :class="{ show: portraitOpen[card.name] }">
            <img
              :src="portraitOpen[card.name] ? portraitUrl(card) : ''"
              :alt="card.name"
            />
          </div>
          <div
            v-else
            class="large-portrait"
            style="display:none;align-items:center;justify-content:center;min-height:100px;color:var(--text-dim);font-size:0.85em;"
          >
            点击「🎨 自定义」上传本地图片
          </div>
        </div>

        <div v-show="isExpanded(card.name)" class="forum-panel">
          <div class="forum-panel-head">
            <div class="forum-panel-title">
              <span>回帖</span>
              <span class="forum-panel-count">共 {{ cardFloorCount(card.name) }} 楼</span>
            </div>
            <div class="forum-panel-actions">
              <button class="forum-panel-btn compact" type="button" @click="retryFloor(card, threadFor(card.name)[threadFor(card.name).length - 1])" :disabled="!threadFor(card.name).length || !!beautyForumState.generatingName">
                ↻ 重写
              </button>
            </div>
          </div>

          <div v-if="!threadFor(card.name).length" class="forum-empty-thread">
            还没有回帖，先留一条吧。
          </div>

          <div v-else class="forum-thread-list">
            <article
              v-for="(floor, floorIndex) in threadFor(card.name)"
              :key="floor.id"
              class="forum-floor"
              :class="{ error: floor.status === 'error' }"
            >
              <div class="forum-floor-meta">
                <span class="forum-floor-label">{{ floorLabel(floorIndex) }}</span>
                <span class="forum-floor-time">{{ floorTime(floor) }}</span>
              </div>

              <div class="forum-floor-user">
                <span class="forum-floor-speaker">主角</span>
                <div class="forum-bubble forum-user-bubble">{{ floor.userContent }}</div>
              </div>

              <div class="forum-floor-ai">
                <span class="forum-floor-speaker">{{ card.name }}</span>
                <div class="forum-bubble forum-ai-bubble" :class="{ pending: floor.status === 'pending' }">
                  <template v-if="floor.status === 'pending'">
                    <span class="forum-loading-dot"></span>
                    <span>对方正在回帖...</span>
                  </template>
                  <template v-else>
                    {{ floor.aiContent || "对方似乎没有想好怎么回复..." }}
                  </template>
                </div>
              </div>

              <div v-if="floor.error" class="forum-floor-error">
                {{ floor.error }}
              </div>

              <div class="forum-floor-actions">
                <button class="forum-floor-action" type="button" @click="toggleLike(floor)">
                  👍 {{ floor.likes || 0 }}
                </button>
                <button class="forum-floor-action" type="button" @click="retryFloor(card, floor)">
                  ↻ 重写
                </button>
                <button class="forum-floor-action danger" type="button" @click="deleteFloor(card.name, floor.id)">
                  🗑 删除
                </button>
              </div>
            </article>
          </div>

          <div class="forum-input-box">
            <textarea
              v-model="beautyForumState.drafts[card.name]"
              class="reply-input forum-reply-input"
              rows="1"
              :placeholder="beautyForumState.generatingName && beautyForumState.generatingName !== card.name
                ? '正在生成其他回帖...'
                : `给【${card.name}】留下一条回帖...`"
              :disabled="!!beautyForumState.generatingName"
              @input="resizeReplyInput"
              @keydown="onDraftKeydown(card, $event)"
            />
            <button
              class="reply-button forum-send-btn"
              type="button"
              :disabled="!!beautyForumState.generatingName"
              @click="submitReply(card)"
            >
              {{ beautyForumState.generatingName === card.name ? "发送中..." : "发送" }}
            </button>
          </div>
        </div>
      </article>
    </div>

    <div
      v-if="beautyForumState.settingsOpen"
      class="forum-settings-overlay"
      @click.self="closeSettings"
    >
      <div class="forum-settings-modal">
        <div class="forum-settings-head">
          <div class="forum-settings-title">绝色榜回帖设定</div>
          <button class="forum-settings-close" type="button" @click="closeSettings">×</button>
        </div>

        <div class="forum-settings-body">
          <div class="forum-settings-section">
            <div class="forum-settings-section-title">预设配置方案</div>
            <div class="forum-preset-row">
              <select
                v-model="beautyForumState.settingsPresetName"
                class="reply-input forum-preset-select"
              >
                <option value="">-- 当前手动配置 --</option>
                <option
                  v-for="preset in beautyForumState.presetNames"
                  :key="preset"
                  :value="preset"
                >
                  {{ preset }}
                </option>
              </select>
              <button class="forum-panel-btn" type="button" @click="applySelectedPreset">
                应用
              </button>
              <button class="forum-panel-btn primary" type="button" @click="saveCurrentAsPreset">
                另存
              </button>
              <button class="forum-panel-btn danger" type="button" @click="deleteSelectedPreset">
                删除
              </button>
            </div>

            <div class="forum-settings-section-title">自定义 API</div>
            <div class="forum-settings-section-hint">
              填了基础 URL 和模型后，回帖会优先走自定义 API；否则回退到酒馆原生生成。
            </div>

            <label class="forum-field">
              <span>基础 URL</span>
              <input v-model="beautyForumState.settings.apiBaseUrl" type="text" placeholder="例如: https://api.xxx.com/v1" />
            </label>

            <label class="forum-field">
              <span>API 密钥</span>
              <input v-model="beautyForumState.settings.apiKey" type="password" placeholder="sk-..." />
            </label>

            <label class="forum-field">
              <span>模型名称</span>
              <input v-model="beautyForumState.settings.apiModel" type="text" placeholder="例如: gpt-4o-mini" />
            </label>

            <div class="forum-model-row">
              <button class="forum-panel-btn" type="button" @click="window.fetchBeautyForumModels?.()">
                获取模型
              </button>
              <select
                v-if="beautyForumState.modelOptions.length"
                v-model="beautyForumState.settings.apiModel"
                class="reply-input forum-model-select"
              >
                <option v-for="model in beautyForumState.modelOptions" :key="model" :value="model">
                  {{ model }}
                </option>
              </select>
            </div>

            <label class="forum-field">
              <span>附加设定 / 规则</span>
              <textarea
                v-model="beautyForumState.settings.extraPrompt"
                rows="4"
                placeholder="例如：回复要口语化、简短、带一点傲娇感。"
              />
            </label>

            <label class="forum-field">
              <span>温度</span>
              <input v-model="beautyForumState.settings.temperature" type="number" min="0" max="2" step="0.1" />
            </label>
          </div>
        </div>

        <div class="forum-settings-foot">
          <div
            class="forum-settings-status"
            :data-tone="beautyForumState.statusTone"
          >
            {{ beautyForumState.statusMessage || "设定只在当前浏览器本地保存。" }}
          </div>
          <div class="forum-settings-actions">
            <button class="forum-panel-btn" type="button" @click="closeStatusMessage">清空提示</button>
            <button class="forum-panel-btn primary" type="button" @click="saveSettings">保存</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.beauty-forum-root {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
}

.forum-topbar {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 2px 2px 0;
}

.forum-topbar-copy {
  display: flex;
  flex-direction: column;
  gap: 3px;
  flex: 1;
  width: 100%;
  min-width: 0;
}

.forum-topbar-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  width: 100%;
  min-width: 0;
}

.forum-topbar-title {
  color: var(--rare-text);
  font-size: 1.02em;
  font-weight: 700;
  letter-spacing: 0.04em;
}

.forum-topbar-subtitle {
  color: var(--text-dim);
  font-size: 0.78em;
  line-height: 1.4;
}

.forum-topbar-btn {
  width: 34px;
  height: 34px;
  display: inline-grid;
  place-items: center;
  background: linear-gradient(145deg, rgba(255, 215, 0, 0.08), rgba(255, 215, 0, 0.02));
  color: var(--accent-gold);
  border: 1px solid rgba(255, 215, 0, 0.28);
  border-radius: 6px;
  cursor: pointer;
}

.forum-card-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-width: 0;
}

.beauty-forum-card {
  position: relative;
  overflow: hidden;
}

.beauty-forum-meta {
  position: absolute;
  top: 10px;
  right: 10px;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-direction: row-reverse;
  max-width: calc(100% - 20px);
  z-index: 2;
}

.beauty-forum-delete {
  width: 24px;
  height: 24px;
  display: inline-grid;
  place-items: center;
  color: var(--text-dim);
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 6px;
  cursor: pointer;
  opacity: 0;
  pointer-events: none;
  transform: translateY(-2px) scale(0.96);
  transition:
    opacity 0.2s ease,
    transform 0.2s ease,
    background 0.2s ease,
    color 0.2s ease,
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}

.beauty-forum-card:hover .beauty-forum-delete,
.beauty-forum-card:focus-within .beauty-forum-delete,
.beauty-forum-delete.armed {
  opacity: 1;
  pointer-events: auto;
  transform: translateY(0) scale(1);
}

.beauty-forum-delete:hover {
  color: #ff6b6b;
  background: rgba(239, 68, 68, 0.16);
  border-color: rgba(239, 68, 68, 0.42);
}

.beauty-forum-delete.armed {
  width: auto;
  padding: 0 8px;
  color: var(--accent-blood);
  border-color: rgba(255, 77, 77, 0.4);
  box-shadow: 0 0 0 1px rgba(255, 77, 77, 0.15);
}

.beauty-forum-head {
  align-items: center;
  gap: 10px;
  padding-right: 140px;
}

.beauty-forum-name {
  min-width: 0;
  flex: 1;
  cursor: pointer;
}

.beauty-forum-title-badge {
  max-width: 220px;
  padding: 0;
  color: var(--accent-gold);
  background: transparent;
  border: 0;
  border-radius: 0;
  font-size: 0.88em;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  pointer-events: none;
  text-align: right;
  text-shadow: 0 0 8px rgba(255, 215, 0, 0.18);
}

.beauty-forum-copy {
  line-height: 1.65;
}

.forum-panel {
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.forum-panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-width: 0;
  flex-wrap: nowrap;
}

.forum-panel-title {
  display: flex;
  align-items: baseline;
  gap: 8px;
  flex: 1;
  min-width: 0;
  color: var(--accent-gold);
  font-size: 0.92em;
  font-weight: 700;
  white-space: nowrap;
}

.forum-panel-count {
  color: var(--text-dim);
  font-size: 0.8em;
  font-weight: 400;
  white-space: nowrap;
}

.forum-panel-actions,
.forum-settings-actions,
.forum-model-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.forum-panel-actions {
  flex-shrink: 0;
  margin-left: auto;
  flex-wrap: nowrap;
}

.forum-preset-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.forum-preset-select {
  flex: 1;
  min-width: 180px;
}

.forum-panel-btn {
  padding: 6px 10px;
  color: var(--text-main);
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 6px;
  cursor: pointer;
  font: inherit;
}

.forum-panel-btn.compact {
  padding: 4px 8px;
  font-size: 0.86em;
  white-space: nowrap;
}

.forum-panel-btn.primary {
  color: var(--accent-gold);
  background: rgba(255, 215, 0, 0.08);
  border-color: rgba(255, 215, 0, 0.25);
}

.forum-panel-btn.danger {
  color: var(--accent-blood);
  background: rgba(255, 77, 77, 0.08);
  border-color: rgba(255, 77, 77, 0.22);
}

.forum-panel-btn.danger:hover {
  background: rgba(255, 77, 77, 0.16);
  border-color: rgba(255, 77, 77, 0.4);
}

.forum-empty-thread {
  padding: 12px;
  color: var(--text-dim);
  font-size: 0.84em;
  font-style: italic;
  text-align: center;
  border: 1px dashed rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.12);
}

.forum-thread-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 340px;
  overflow: auto;
  padding-right: 4px;
}

.forum-floor {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  background: linear-gradient(145deg, rgba(20, 20, 28, 0.72), rgba(12, 12, 18, 0.9));
}

.forum-floor.error {
  border-color: rgba(255, 77, 77, 0.22);
}

.forum-floor-meta {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  color: var(--text-dim);
  font-size: 0.72em;
}

.forum-floor-label {
  color: var(--accent-gold);
  font-weight: 700;
}

.forum-floor-user,
.forum-floor-ai {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.forum-floor-speaker {
  flex-shrink: 0;
  min-width: 3.4em;
  color: var(--text-dim);
  font-size: 0.78em;
  text-align: right;
}

.forum-bubble {
  min-width: 0;
  flex: 1;
  padding: 8px 10px;
  border-radius: 8px;
  line-height: 1.65;
  white-space: pre-wrap;
  word-break: break-word;
}

.forum-user-bubble {
  color: var(--text-main);
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.forum-ai-bubble {
  color: #f1e7ff;
  background: linear-gradient(145deg, rgba(88, 72, 110, 0.22), rgba(48, 32, 64, 0.42));
  border: 1px solid rgba(163, 120, 214, 0.25);
}

.forum-ai-bubble.pending {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text-dim);
}

.forum-loading-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--accent-gold);
  box-shadow: 0 0 10px rgba(255, 215, 0, 0.5);
  animation: pulse-dot 1.2s infinite ease-in-out;
}

.forum-floor-error {
  padding-left: 3.9em;
  color: var(--accent-blood);
  font-size: 0.76em;
}

.forum-floor-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding-left: 3.9em;
}

.forum-floor-action {
  padding: 5px 9px;
  color: var(--text-dim);
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 6px;
  cursor: pointer;
  font: inherit;
  font-size: 0.78em;
}

.forum-floor-action.danger {
  color: var(--accent-blood);
}

.forum-input-box {
  display: flex;
  gap: 8px;
  align-items: stretch;
}

.forum-reply-input {
  flex: 1;
  min-width: 0;
  min-height: 38px;
  max-height: 120px;
  resize: vertical;
}

.forum-send-btn {
  flex: 0 0 74px;
  width: 74px;
  min-width: 0;
  padding-inline: 0;
  white-space: nowrap;
}

.forum-empty {
  color: var(--text-dim);
}

.forum-settings-overlay {
  position: fixed;
  inset: 0;
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: rgba(0, 0, 0, 0.72);
  backdrop-filter: blur(6px);
}

.forum-settings-modal {
  width: min(520px, 100%);
  max-height: min(88vh, 760px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: linear-gradient(180deg, rgba(216, 193, 136, 0.06), transparent 24%), var(--c-surface, #171c26);
  border: 1px solid rgba(255, 215, 0, 0.24);
  border-radius: 8px;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.6);
}

.forum-settings-head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 14px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.forum-settings-title {
  flex: 1;
  color: var(--accent-gold);
  font-size: 0.98em;
  font-weight: 700;
}

.forum-settings-close {
  width: 30px;
  height: 30px;
  color: var(--text-dim);
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 6px;
  cursor: pointer;
}

.forum-settings-body {
  flex: 1;
  overflow: auto;
  padding: 14px;
}

.forum-settings-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.forum-settings-section + .forum-settings-section {
  margin-top: 18px;
  padding-top: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.forum-settings-section-title {
  color: var(--accent-gold);
  font-size: 0.92em;
  font-weight: 700;
}

.forum-settings-section-hint {
  color: var(--text-dim);
  font-size: 0.8em;
  line-height: 1.5;
}

.forum-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  color: var(--text-dim);
  font-size: 0.82em;
}

.forum-field input,
.forum-field textarea,
.forum-model-select {
  width: 100%;
  padding: 8px 10px;
  color: var(--text-main);
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 6px;
  font: inherit;
  box-sizing: border-box;
}

.forum-field textarea {
  resize: vertical;
}

.forum-model-select {
  min-width: 180px;
}

.forum-settings-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px 14px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.forum-settings-status {
  min-width: 0;
  color: var(--text-dim);
  font-size: 0.78em;
  line-height: 1.45;
}

.forum-settings-status[data-tone="success"] {
  color: var(--accent-san);
}

.forum-settings-status[data-tone="warn"] {
  color: var(--accent-gold);
}

.forum-settings-status[data-tone="error"] {
  color: var(--accent-blood);
}

.forum-applause {
  display: inline-flex;
}

.forum-thread-toggle {
  grid-column: auto / span 2;
  min-width: 0;
  min-height: var(--portrait-action-size);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 3px;
  padding: 0 7px;
  color: var(--accent-gold);
  background: linear-gradient(to right, transparent, rgba(255, 215, 0, 0.07), transparent);
  border: 1px dashed rgba(255, 215, 0, 0.26);
  border-radius: 6px;
  cursor: pointer;
  font: inherit;
  font-size: 0.78em;
  font-weight: 700;
  letter-spacing: 0.02em;
  line-height: 1;
  white-space: nowrap;
  box-sizing: border-box;
  transition:
    background 0.2s ease,
    box-shadow 0.2s ease,
    border-color 0.2s ease,
    transform 0.2s ease;
}

.forum-thread-toggle:hover {
  background: linear-gradient(to right, transparent, rgba(255, 215, 0, 0.14), transparent);
  border-color: rgba(255, 215, 0, 0.42);
  box-shadow: 0 0 8px var(--accent-gold-glow);
  transform: translateY(-1px);
}

.forum-thread-icon,
.forum-thread-caret {
  flex-shrink: 0;
  font-size: 0.9em;
}

@keyframes pulse-dot {
  0%,
  100% {
    transform: scale(0.9);
    opacity: 0.7;
  }
  50% {
    transform: scale(1.15);
    opacity: 1;
  }
}

@media (max-width: 640px) {
  .forum-settings-foot {
    flex-direction: column;
    align-items: stretch;
  }

  .forum-settings-actions,
  .forum-model-row {
    width: 100%;
  }

  .forum-input-box {
    flex-direction: row;
    align-items: stretch;
  }

  .forum-send-btn {
    flex-basis: 64px;
    width: 64px;
  }

  .forum-floor-user,
  .forum-floor-ai {
    flex-direction: column;
  }

  .forum-floor-speaker,
  .forum-floor-error,
  .forum-floor-actions {
    padding-left: 0;
  }
}
</style>
