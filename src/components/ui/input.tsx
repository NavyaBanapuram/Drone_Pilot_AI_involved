"use client";

import React, { forwardRef, useId } from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightElement?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, leftIcon, rightElement, id, disabled, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id || generatedId;
    const errorId = `${inputId}-error`;
    const hintId = `${inputId}-hint`;

    return (
      <div className="w-full space-y-1 text-left">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-[10px] font-bold text-neutral-400 tracking-widest uppercase mb-2"
          >
            {label}
          </label>
        )}

        <div className="relative flex items-center">
          {leftIcon && (
            <div className="pointer-events-none absolute left-3 flex items-center text-neutral-400">
              {leftIcon}
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? errorId : hint ? hintId : undefined}
            className={cn(
              "w-full rounded-[4px] border border-white/10 bg-black/40 px-3 py-2.5 text-xs sm:text-sm text-white placeholder-neutral-600 transition-all duration-200",
              "hover:border-white/20",
              "focus:border-[#FF5500] focus:outline-none focus:ring-1 focus:ring-[#FF5500]/50",
              "disabled:cursor-not-allowed disabled:bg-white/5 disabled:opacity-60",
              leftIcon && "pl-9",
              rightElement && "pr-9",
              error && "border-red-500 focus:border-red-500 focus:ring-red-500/50",
              className
            )}
            {...props}
          />

          {rightElement && (
            <div className="absolute right-2.5 flex items-center">
              {rightElement}
            </div>
          )}
        </div>

        {error && (
          <p id={errorId} className="text-xs text-red-600 font-medium flex items-center gap-1 mt-1">
            <span className="inline-block h-1 w-1 rounded-full bg-red-600" />
            {error}
          </p>
        )}

        {hint && !error && (
          <p id={hintId} className="text-xs text-neutral-500 mt-1 font-normal">
            {hint}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
