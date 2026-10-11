import { create } from 'zustand';
import { formatAppError, type ErrorContext } from '@/lib/error-handler';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastOptions {
  id?: string;
  description?: string;
  duration?: number;
}

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration: number;
}

interface ToastInput {
  id?: string;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number;
}

interface ToastStore {
  toasts: ToastItem[];
  push: (input: ToastInput) => string;
  dismiss: (id: string) => void;
  clear: () => void;
}

export const DEFAULT_TOAST_DURATION = 4000;
const MAX_VISIBLE_TOASTS = 4;

const timers = new Map<string, ReturnType<typeof setTimeout>>();

function createToastId(): string {
  return `toast-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function clearTimer(id: string): void {
  const timer = timers.get(id);
  if (timer) {
    clearTimeout(timer);
    timers.delete(id);
  }
}

export const useToastStore = create<ToastStore>((set, get) => ({
  toasts: [],
  push: (input) => {
    const id = input.id ?? createToastId();
    const item: ToastItem = {
      id,
      type: input.type,
      title: input.title,
      description: input.description,
      duration: input.duration ?? DEFAULT_TOAST_DURATION,
    };

    set((state) => {
      const next = [item, ...state.toasts.filter((toast) => toast.id !== id)];
      const overflow = next.slice(MAX_VISIBLE_TOASTS);
      overflow.forEach((toast) => clearTimer(toast.id));
      return { toasts: next.slice(0, MAX_VISIBLE_TOASTS) };
    });

    clearTimer(id);
    if (item.duration > 0) {
      timers.set(
        id,
        setTimeout(() => {
          timers.delete(id);
          get().dismiss(id);
        }, item.duration)
      );
    }

    return id;
  },
  dismiss: (id) => {
    clearTimer(id);
    set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) }));
  },
  clear: () => {
    timers.forEach((timer) => clearTimeout(timer));
    timers.clear();
    set({ toasts: [] });
  },
}));

function emit(type: ToastType, title: string, options?: ToastOptions): string {
  return useToastStore.getState().push({
    id: options?.id,
    type,
    title,
    description: options?.description,
    duration: options?.duration,
  });
}

function resolveErrorTitle(titleOrErr: unknown, context: ErrorContext = 'generic'): string {
  if (typeof titleOrErr === 'string' && titleOrErr.trim()) return titleOrErr;
  return formatAppError(titleOrErr, context);
}

export const toast = {
  success: (title: string, options?: ToastOptions) => emit('success', title, options),
  error: (titleOrErr: unknown, options?: ToastOptions) =>
    emit('error', resolveErrorTitle(titleOrErr), options),
  warning: (title: string, options?: ToastOptions) => emit('warning', title, options),
  info: (title: string, options?: ToastOptions) => emit('info', title, options),
  message: (title: string, options?: ToastOptions) => emit('info', title, options),
  fromError: (err: unknown, context: ErrorContext = 'generic', options?: ToastOptions) =>
    emit('error', formatAppError(err, context), options),
  dismiss: (id: string) => useToastStore.getState().dismiss(id),
  clear: () => useToastStore.getState().clear(),
};
