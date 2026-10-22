import React from "react";
import { cn } from "@/lib/utils";
import { AlertCircle, CheckCircle2, Info, AlertTriangle, X } from "lucide-react";

interface AlertProps {
  variant?: "error" | "success" | "info" | "warning";
  title?: string;
  message: string;
  onClose?: () => void;
  className?: string;
}

export function Alert({
  variant = "error",
  title,
  message,
  onClose,
  className,
}: AlertProps) {
  const styles = {
    error: {
      container: "border-red-200 bg-red-50 text-red-900",
      icon: <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />,
      titleColor: "text-red-900",
    },
    success: {
      container: "border-emerald-200 bg-emerald-50 text-emerald-900",
      icon: <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />,
      titleColor: "text-emerald-900",
    },
    info: {
      container: "border-neutral-200 bg-neutral-50 text-neutral-800",
      icon: <Info className="h-4 w-4 text-neutral-700 shrink-0 mt-0.5" />,
      titleColor: "text-neutral-900",
    },
    warning: {
      container: "border-amber-200 bg-amber-50 text-amber-900",
      icon: <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />,
      titleColor: "text-amber-900",
    },
  };

  const current = styles[variant];

  return (
    <div
      role="alert"
      className={cn(
        "relative flex items-start gap-2.5 rounded-lg border p-3 text-xs leading-relaxed transition-all",
        current.container,
        className
      )}
    >
      {current.icon}
      <div className="flex-1">
        {title && (
          <p className={cn("font-medium mb-0.5", current.titleColor)}>
            {title}
          </p>
        )}
        <p className={cn("text-xs leading-relaxed font-medium", variant === "error" ? "text-red-900" : "text-neutral-800")}>{message}</p>
      </div>

      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="rounded p-0.5 text-neutral-400 hover:text-black transition-colors"
          aria-label="Dismiss alert"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
