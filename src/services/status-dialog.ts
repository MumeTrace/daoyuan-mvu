import type { StatusDialogOptions } from "../stores/status-dialog";
import { useStatusDialogStore } from "../stores/status-dialog";
import { pinia } from "../stores/pinia";

export const statusDialog = {
  alert(message: string, options: StatusDialogOptions = {}): Promise<void> {
    return useStatusDialogStore(pinia).showAlert(message, options);
  },
  confirm(message: string, options: StatusDialogOptions = {}): Promise<boolean> {
    return useStatusDialogStore(pinia).confirm(message, options);
  },
  prompt(message: string, initialValue = "", options: StatusDialogOptions = {}): Promise<string | null> {
    return useStatusDialogStore(pinia).prompt(message, initialValue, options);
  },
};
