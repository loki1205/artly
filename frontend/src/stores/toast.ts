import { create } from "zustand";

export interface Toast {
  id: string;
  message: string;
  tone?: "default" | "success" | "error";
  actionLabel?: string;
  onAction?: () => void;
  duration?: number;
}

interface ToastState {
  toasts: Toast[];
  push: (t: Omit<Toast, "id">) => string;
  dismiss: (id: string) => void;
}

export const useToasts = create<ToastState>((set, get) => ({
  toasts: [],
  push: (t) => {
    const id = Math.random().toString(36).slice(2);
    const toast: Toast = { id, tone: "default", duration: 5000, ...t };
    set((s) => ({ toasts: [...s.toasts, toast] }));
    if (toast.duration && toast.duration > 0) {
      setTimeout(() => get().dismiss(id), toast.duration);
    }
    return id;
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export const toast = {
  show: (message: string, tone: Toast["tone"] = "default") => useToasts.getState().push({ message, tone }),
  success: (message: string) => useToasts.getState().push({ message, tone: "success" }),
  error: (message: string) => useToasts.getState().push({ message, tone: "error" }),
  undo: (message: string, onAction: () => void) =>
    useToasts.getState().push({ message, actionLabel: "Undo", onAction, duration: 6000 }),
};
