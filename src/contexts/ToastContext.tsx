'use client';

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from 'react';

export type ToastVariant = 'success' | 'error' | 'info';

export interface Toast {
  id: string;
  title?: string;
  description: string;
  variant?: ToastVariant;
}

interface ToastContextValue {
  showToast: (toast: Omit<Toast, 'id'>) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

let toastIdCounter = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = `${Date.now()}-${toastIdCounter++}`;
    const variant: ToastVariant = toast.variant ?? 'info';

    setToasts((current) => [...current, { ...toast, id, variant }]);

    // Auto-dismiss after a few seconds
    window.setTimeout(() => {
      removeToast(id);
    }, 3500);
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      {/* Toast container */}
      <div className="pointer-events-none fixed inset-x-0 top-16 z-50 flex flex-col items-center space-y-2 px-4">
        {toasts.map((toast) => {
          const baseClasses =
            'pointer-events-auto w-full max-w-sm rounded-xl shadow-lg border px-4 py-3 text-sm transition transform';
          const variantClasses =
            toast.variant === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900 dark:bg-emerald-900/80 dark:border-emerald-700 dark:text-emerald-50'
              : toast.variant === 'error'
              ? 'bg-red-50 border-red-200 text-red-900 dark:bg-red-900/80 dark:border-red-700 dark:text-red-50'
              : 'bg-zinc-50 border-zinc-200 text-zinc-900 dark:bg-zinc-900/90 dark:border-zinc-700 dark:text-zinc-50';

          return (
            <button
              key={toast.id}
              type="button"
              onClick={() => removeToast(toast.id)}
              className={`${baseClasses} ${variantClasses}`}
            >
              {toast.title && (
                <div className="mb-1 font-semibold">
                  {toast.title}
                </div>
              )}
              <div className="flex items-start gap-2">
                <span className="mt-0.5 text-lg">
                  {toast.variant === 'success' && '✅'}
                  {toast.variant === 'error' && '⚠️'}
                  {toast.variant === 'info' && 'ℹ️'}
                </span>
                <p className="text-left">
                  {toast.description}
                </p>
              </div>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                Trykk for å lukke
              </p>
            </button>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx;
}

