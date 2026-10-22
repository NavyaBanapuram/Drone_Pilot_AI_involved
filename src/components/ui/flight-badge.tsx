import React from "react";
import { cn } from "@/lib/utils";

interface FlightBadgeProps {
  label: string;
  variant?: "neutral" | "active" | "warning";
  className?: string;
}

export function FlightBadge({
  label,
  variant = "neutral",
  className,
}: FlightBadgeProps) {
  const variantStyles = {
    neutral: "border-neutral-200 bg-neutral-100 text-neutral-800",
    active: "border-black bg-black text-white",
    warning: "border-amber-200 bg-amber-50 text-amber-900",
  };

  const dotStyles = {
    neutral: "bg-neutral-500",
    active: "bg-white",
    warning: "bg-amber-500",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium select-none",
        variantStyles[variant],
        className
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", dotStyles[variant])} />
      {label}
    </span>
  );
}
