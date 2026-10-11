"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

export interface ToastItem {
  id: string;
  type: "success" | "error" | "info";
  message: string;
  duration?: number;
}

interface ToastContextValue {
  toasts: ToastItem[];
  addToast: (type: "success" | "error" | "info", message: string, duration?: number) => void;
  removeToast: (id: string) => void;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);

let globalAddToast: ((type: "success" | "error" | "info", message: string, duration?: number) => void) | null = null;

export const toast = {
  success: (message: string, duration = 4000) => {
    if (globalAddToast) {
      globalAddToast("success", message, duration);
    } else {
      console.log("[Toast Success]", message);
    }
  },
  error: (message: string, duration = 5000) => {
    if (globalAddToast) {
      globalAddToast("error", message, duration);
    } else {
      console.error("[Toast Error]", message);
    }
  },
  info: (message: string, duration = 4000) => {
    if (globalAddToast) {
      globalAddToast("info", message, duration);
    } else {
      console.info("[Toast Info]", message);
    }
  },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastItem[]>([]);

  const removeToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = React.useCallback(
    (type: "success" | "error" | "info", message: string, duration = 4000) => {
      const id = Math.random().toString(36).substring(2, 9);
      setToasts((prev) => [...prev, { id, type, message, duration }]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  React.useEffect(() => {
    globalAddToast = addToast;
    return () => {
      globalAddToast = null;
    };
  }, [addToast]);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <div
        aria-live="polite"
        role="region"
        className="fixed bottom-4 right-4 z-50 flex max-w-md w-full flex-col gap-2 pointer-events-none p-4 sm:p-0"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role={t.type === "error" ? "alert" : "status"}
            className={cn(
              "pointer-events-auto flex items-start gap-3 rounded-xl border p-4 shadow-lg backdrop-blur-md transition-all duration-200 ease-[var(--ease-snappy)]",
              "animate-in fade-in-0 slide-in-from-bottom-2",
              t.type === "success" &&
                "border-emerald-500/20 bg-emerald-950/90 text-emerald-100 dark:border-emerald-500/30",
              t.type === "error" &&
                "border-destructive/30 bg-destructive/95 text-destructive-foreground",
              t.type === "info" &&
                "border-border bg-card/95 text-card-foreground"
            )}
          >
            {t.type === "success" && (
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400 mt-0.5" />
            )}
            {t.type === "error" && (
              <AlertCircle className="h-5 w-5 shrink-0 text-red-200 mt-0.5" />
            )}
            {t.type === "info" && (
              <Info className="h-5 w-5 shrink-0 text-primary mt-0.5" />
            )}
            <div className="flex-1 text-sm font-medium leading-relaxed">
              {t.message}
            </div>
            <button
              type="button"
              onClick={() => removeToast(t.id)}
              className="shrink-0 rounded-md p-1 opacity-70 hover:opacity-100 hover:bg-black/10 transition-opacity"
              aria-label="Dismiss toast"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) {
    return { toast };
  }
  return { toast, toasts: ctx.toasts, removeToast: ctx.removeToast };
}
