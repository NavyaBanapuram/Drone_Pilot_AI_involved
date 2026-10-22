import React from "react";
import { cn } from "@/lib/utils";

interface DividerProps {
  label?: string;
  className?: string;
}

export function Divider({ label, className }: DividerProps) {
  if (!label) {
    return <hr className={cn("border-t border-neutral-200/90 my-5", className)} />;
  }

  return (
    <div className={cn("relative my-6 flex items-center justify-center", className)}>
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-neutral-200" />
      </div>
      <div className="relative bg-white px-3">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 select-none">
          {label}
        </span>
      </div>
    </div>
  );
}
