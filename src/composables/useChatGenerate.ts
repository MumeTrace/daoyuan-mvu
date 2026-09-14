import { tavernApi } from "../bridge/tavern-api";
import { tavernEvents } from "../bridge/event-bus";
import { useSettingsStore } from "../stores/settings";
import { cleanGeneratedMessage } from "../utils/message-cleaner";
import { safeWebUrl } from "../utils/safe-url";
import type { TavernEventHandle } from "../types/tavern";

export class GenerationStoppedError extends Error {
  constructor() {
    super("玉简回复生成已停止。");
    this.name = "GenerationStoppedError";
  }
}

export interface ChatGenerationCallbacks {
  onUpdate?: (text: string) => void;
}

function completionUrl(baseUrl: string): string {
  const safeBase = safeWebUrl(baseUrl);
  if (!safeBase) throw new Error("自定义 API 基础 URL 无效，仅支持 http/https 地址。");
  const trimmed = safeBase.replace(/\/+$/, "");
  return /\/chat\/completions$/i.test(trimmed) ? trimmed : `${trimmed}/chat/completions`;
}

function objectText(value: unknown): string | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  for (const key of ["content", "text", "reply"] as const) {
    if (typeof record[key] === "string") return record[key];
  }
  return null;
}

function responseText(payload: unknown): string | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  const choices = (payload as { choices?: unknown }).choices;
  if (!Array.isArray(choices)) return null;
  const choice = choices[0];
  if (!choice || typeof choice !== "object" || Array.isArray(choice)) return null;
  const record = choice as { delta?: { content?: unknown }; message?: { content?: unknown }; text?: unknown };
  const value = record.delta?.content ?? record.message?.content ?? record.text;
  return typeof value === "string" ? value : null;
}

function createGenerationId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `daoyuan-jade-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

async function readStreamingResponse(response: Response, onUpdate?: (text: string) => void): Promise<string> {
  if (!response.body) throw new Error("自定义 API 未返回可读取的流式响应。");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let fullText = "";

  const consumeLine = (line: string): void => {
    const trimmed = line.trim();
    if (!trimmed.startsWith("data:")) return;
    const data = trimmed.slice(5).trim();
    if (!data || data === "[DONE]") return;
    try {
      const chunk = responseText(JSON.parse(data));
      if (!chunk) return;
      fullText += chunk;
      onUpdate?.(fullText);
    } catch {
      // OpenAI-compatible endpoints may send keepalive or non-JSON data lines.
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value, { stream: !done }).replace(/\r\n/g, "\n");
    let newline = buffer.indexOf("\n");
    while (newline >= 0) {
      consumeLine(buffer.slice(0, newline));
      buffer = buffer.slice(newline + 1);
      newline = buffer.indexOf("\n");
    }
    if (done) break;
  }
  if (buffer) consumeLine(buffer);
  return fullText;
}

export function useChatGenerate() {
  const settings = useSettingsStore();
  let activeAbort: AbortController | null = null;
  let activeGenerationId = "";
  let stopRequested = false;

  function stop(): boolean {
    if (!activeGenerationId) return false;
    let stopped = false;
    if (activeAbort) {
      activeAbort.abort();
      stopped = true;
    }
    stopped = tavernApi.stopGenerationById(activeGenerationId) || stopped;
    if (stopped) stopRequested = true;
    return stopped;
  }

  async function generateCustomReply(
    systemPrompt: string,
    userMessage: string,
    callbacks: ChatGenerationCallbacks,
  ): Promise<string> {
    activeAbort = new AbortController();
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (settings.jade.apiKey) headers.Authorization = `Bearer ${settings.jade.apiKey}`;
    const response = await fetch(completionUrl(settings.jade.apiBaseUrl), {
      method: "POST",
      headers,
      signal: activeAbort.signal,
      body: JSON.stringify({
        model: settings.jade.apiModel,
        messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userMessage }],
        temperature: 0.7,
        max_tokens: 2000,
        stream: true,
      }),
    });
    if (!response.ok) throw new Error(`API 请求失败: HTTP ${response.status} - ${await response.text()}`);

    const contentType = response.headers.get("content-type")?.toLocaleLowerCase() ?? "";
    if (contentType.includes("text/event-stream")) {
      const streamed = await readStreamingResponse(response, callbacks.onUpdate);
      if (!streamed) throw new Error("自定义 API 的流式响应中没有可用文本。");
      return streamed;
    }

    const content = responseText(await response.json());
    if (content === null) throw new Error("API 返回中没有可用的文本消息。");
    callbacks.onUpdate?.(content);
    return content;
  }

  async function generateTavernReply(
    systemPrompt: string,
    userMessage: string,
    callbacks: ChatGenerationCallbacks,
  ): Promise<string> {
    const handles: TavernEventHandle[] = [];
    const streamEvent = tavernApi.getIframeEventName("STREAM_TOKEN_RECEIVED_FULLY");
    if (streamEvent) {
      try {
        handles.push(tavernEvents.on(streamEvent, (fullText, eventGenerationId) => {
          if (eventGenerationId !== undefined && eventGenerationId !== activeGenerationId) return;
          if (typeof fullText === "string") callbacks.onUpdate?.(fullText);
        }));
      } catch (error) {
        console.warn("[道渊] 酒馆流式事件监听不可用，将等待最终生成结果。", error);
      }
    }
    try {
      const result = await tavernApi.generate({
        generation_id: activeGenerationId,
        user_input: `${systemPrompt}\n\n${userMessage}`,
        should_stream: true,
        should_silence: true,
        max_chat_history: 15,
      });
      const raw = typeof result === "string" ? result : objectText(result) ?? "";
      if (!raw) throw new Error("酒馆生成返回了工具调用或未知结果，未写入聊天记录。");
      callbacks.onUpdate?.(raw);
      return raw;
    } finally {
      handles.forEach((handle) => handle.stop());
    }
  }

  async function generateReply(
    injectContent: string,
    userMessage: string,
    characterName: string,
    callbacks: ChatGenerationCallbacks = {},
  ): Promise<string> {
    if (activeGenerationId) throw new Error("已有玉简回复正在生成。");
    const systemPrompt = `${injectContent}\n\n(请以【${characterName}】的身份回复，严格只输出纯对话内容，不要带角色名、引号、动作描写或方括号。)`;
    activeGenerationId = createGenerationId();
    stopRequested = false;
    let raw = "";
    try {
      raw = settings.jade.apiBaseUrl && settings.jade.apiModel
        ? await generateCustomReply(systemPrompt, userMessage, callbacks)
        : await generateTavernReply(systemPrompt, userMessage, callbacks);
      if (stopRequested) throw new GenerationStoppedError();
      settings.setDebugLog(raw || "(空返回)");
      return cleanGeneratedMessage(raw, characterName);
    } catch (error) {
      const reason = stopRequested || isAbortError(error) ? new GenerationStoppedError() : error;
      settings.setDebugLog(reason instanceof GenerationStoppedError
        ? "生成已由用户停止。"
        : `请求失败: ${reason instanceof Error ? reason.message : String(reason)}`);
      throw reason;
    } finally {
      activeAbort = null;
      activeGenerationId = "";
      stopRequested = false;
    }
  }

  return { generateReply, stop };
}
