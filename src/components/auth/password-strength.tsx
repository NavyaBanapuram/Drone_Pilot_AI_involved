"use client";

import React from "react";
import { evaluatePasswordStrength } from "@/lib/validation";
import { cn } from "@/lib/utils";

interface PasswordStrengthProps {
  password: string;
  className?: string;
}

export function PasswordStrengthMeter({ password, className }: PasswordStrengthProps) {
  if (!password) return null;

  const strength = evaluatePasswordStrength(password);

  const segmentColor = (step: number) => {
    if (strength.score < step) return "bg-white/10";
    if (strength.score === 1) return "bg-red-500";
    if (strength.score === 2) return "bg-orange-500";
    if (strength.score === 3) return "bg-emerald-500";
    return "bg-[#FF5500]";
  };

  return (
    <div className={cn("space-y-1 pt-0.5", className)}>
      <div className="flex items-center justify-between text-[10px] font-bold tracking-widest uppercase mb-1">
        <span className="text-neutral-500">Security rating</span>
        <span className="text-white">
          {strength.label}
        </span>
      </div>

      {/* 4 Segmented Minimalist Progress Bars */}
      <div
        className="grid grid-cols-4 gap-1"
        role="progressbar"
        aria-valuenow={strength.score}
        aria-valuemin={0}
        aria-valuemax={4}
      >
        {[1, 2, 3, 4].map((step) => (
          <div
            key={step}
            className={cn(
              "h-1 rounded-full transition-all duration-200",
              segmentColor(step)
            )}
          />
        ))}
      </div>

      {strength.feedback.length > 0 && strength.score < 4 && (
        <p className="text-[10px] text-neutral-500">
          {strength.feedback[0]}
        </p>
      )}
    </div>
  );
}
