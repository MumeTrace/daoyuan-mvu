import { ref } from "vue";
import { defineStore } from "pinia";

export type StatusDialogTone = "default" | "warning" | "danger";
export type StatusDialogKind = "alert" | "confirm" | "prompt";

export interface StatusDialogOptions {
  title?: string;
  confirmText?: string;
  cancelText?: string;
  tone?: StatusDialogTone;
  checkboxLabel?: string;
  checkboxNote?: string;
  checkboxDefault?: boolean;
}

export interface StatusDialogRequest {
  kind: StatusDialogKind;
  message: string;
  initialValue: string;
  title: string;
  confirmText: string;
  cancelText: string;
  tone: StatusDialogTone;
  checkboxLabel: string;
  checkboxNote: string;
  checkboxDefault: boolean;
}

export interface StatusDialogConfirmResult {
  confirmed: boolean;
  checked: boolean;
}

type DialogResult = boolean | string | null | StatusDialogConfirmResult;
type PendingDialog = {
  request: StatusDialogRequest;
  resolve: (value: DialogResult) => void;
};

export const useStatusDialogStore = defineStore("status-dialog", () => {
  const active = ref<StatusDialogRequest | null>(null);
  const inputValue = ref("");
  const checkboxValue = ref(false);
  const queue: PendingDialog[] = [];
  let resolveActive: PendingDialog["resolve"] | null = null;

  function openNext(): void {
    if (active.value || !queue.length) return;
    const next = queue.shift();
    if (!next) return;
    active.value = next.request;
    inputValue.value = next.request.initialValue;
    checkboxValue.value = next.request.checkboxDefault;
    resolveActive = next.resolve;
  }

  function enqueue(request: StatusDialogRequest): Promise<DialogResult> {
    return new Promise((resolve) => {
      queue.push({ request, resolve });
      openNext();
    });
  }

  function request(
    kind: StatusDialogKind,
    message: string,
    initialValue: string,
    options: StatusDialogOptions,
  ): Promise<DialogResult> {
    return enqueue({
      kind,
      message,
      initialValue,
      title: options.title ?? (kind === "prompt" ? "请输入" : kind === "confirm" ? "请确认" : "提示"),
      confirmText: options.confirmText ?? (kind === "alert" ? "知道了" : "确认"),
      cancelText: options.cancelText ?? "取消",
      tone: options.tone ?? "default",
      checkboxLabel: options.checkboxLabel ?? "",
      checkboxNote: options.checkboxNote ?? "",
      checkboxDefault: options.checkboxDefault ?? false,
    });
  }

  async function showAlert(message: string, options: StatusDialogOptions = {}): Promise<void> {
    await request("alert", message, "", options);
  }

  async function confirm(message: string, options: StatusDialogOptions = {}): Promise<boolean> {
    return (await request("confirm", message, "", options)) === true;
  }

  async function confirmWithCheckbox(
    message: string,
    options: StatusDialogOptions & { checkboxLabel: string },
  ): Promise<StatusDialogConfirmResult> {
    const result = await request("confirm", message, "", options);
    if (typeof result === "object" && result !== null && "confirmed" in result) {
      return result;
    }
    return { confirmed: result === true, checked: false };
  }

  async function prompt(
    message: string,
    initialValue = "",
    options: StatusDialogOptions = {},
  ): Promise<string | null> {
    const result = await request("prompt", message, initialValue, options);
    return typeof result === "string" ? result : null;
  }

  function settle(value: DialogResult): void {
    const resolve = resolveActive;
    active.value = null;
    resolveActive = null;
    resolve?.(value);
    openNext();
  }

  function accept(): void {
    if (active.value?.kind === "prompt") settle(inputValue.value);
    else if (active.value?.kind === "confirm" && active.value.checkboxLabel) {
      settle({ confirmed: true, checked: checkboxValue.value });
    }
    else settle(true);
  }

  function cancel(): void {
    if (active.value?.kind === "alert") settle(true);
    else if (active.value?.kind === "confirm" && active.value.checkboxLabel) {
      settle({ confirmed: false, checked: checkboxValue.value });
    }
    else settle(active.value?.kind === "prompt" ? null : false);
  }

  return { active, inputValue, checkboxValue, showAlert, confirm, confirmWithCheckbox, prompt, accept, cancel };
});
