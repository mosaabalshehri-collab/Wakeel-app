"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { CheckCircleIcon, XCircleIcon } from "@/components/icons";

export type ToastVariant = "success" | "error";

interface Toast {
  id: number;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  showToast: (message: string, variant?: ToastVariant) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const AUTO_DISMISS_MS = 4000;

/**
 * مزوّد إشعارات بسيط (Toast) بدون أي مكتبة خارجية.
 *
 * الهدف: تأكيد فوري ومرئي لنتيجة أي عملية (حفظ، حذف، خطأ) بدل اعتماد
 * المستخدم فقط على تغيّر الصفحة كدليل ضمني على النجاح — هذا مهم خصوصاً
 * عند تأخر الشبكة أو وجود عمليات لا تنقل لصفحة أخرى (مثل تعديل سريع).
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, variant: ToastVariant = "success") => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, variant }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, AUTO_DISMISS_MS);
  }, []);

  function dismiss(id: number) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 top-4 z-[100] flex flex-col items-center gap-2 px-4"
        aria-live="polite"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            onClick={() => dismiss(toast.id)}
            className="pointer-events-auto flex w-full max-w-sm cursor-pointer items-center gap-2.5 rounded-xl border px-4 py-3 shadow-lg transition animate-in fade-in slide-in-from-top-2"
            style={{
              backgroundColor: "var(--color-paper-raised)",
              borderColor: "var(--color-border)",
            }}
          >
            <span
              className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full"
              style={{
                color:
                  toast.variant === "success"
                    ? "var(--color-status-active)"
                    : "var(--color-status-expired)",
                backgroundColor:
                  toast.variant === "success"
                    ? "var(--color-status-active-bg)"
                    : "var(--color-status-expired-bg)",
              }}
            >
              {toast.variant === "success" ? (
                <CheckCircleIcon size={14} />
              ) : (
                <XCircleIcon size={14} />
              )}
            </span>
            <p className="flex-1 text-sm" style={{ color: "var(--color-ink)" }}>
              {toast.message}
            </p>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast يجب أن يُستخدم داخل ToastProvider");
  }
  return ctx;
}
