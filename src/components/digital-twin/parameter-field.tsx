"use client";

import React, { useState } from "react";
import { HelpCircle } from "lucide-react";
import { EDUCATIONAL_TOOLTIPS } from "@/lib/digital-twin/educational-tooltips";

interface ParameterFieldProps {
  id: string;
  label: string;
  value: number | string;
  unit?: string;
  tooltipKey?: string;
  type?: "number" | "text" | "select";
  options?: Array<{ label: string; value: string }>;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  onChange: (val: any) => void;
  helperText?: string;
}

export function ParameterField({
  id,
  label,
  value,
  unit,
  tooltipKey,
  type = "number",
  options,
  min,
  max,
  step = 1,
  disabled = false,
  onChange,
  helperText,
}: ParameterFieldProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const tooltip = tooltipKey ? EDUCATIONAL_TOOLTIPS[tooltipKey] : null;

  return (
    <div className="relative flex flex-col gap-1.5 w-full">
      <div className="flex items-center justify-between">
        <label
          htmlFor={id}
          className="text-sm font-semibold text-neutral-300 uppercase tracking-wider flex items-center gap-1.5"
        >
          <span>{label}</span>
          {tooltip && (
            <div className="relative inline-block">
              <button
                type="button"
                aria-label={`Info for ${label}`}
                onClick={() => setShowTooltip(!showTooltip)}
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
                className="text-neutral-400 hover:text-[#FF5500] transition-colors focus:outline-hidden"
              >
                <HelpCircle className="h-3.5 w-3.5" />
              </button>

              {showTooltip && (
                <div className="absolute left-0 bottom-full mb-2 w-64 p-3 bg-neutral-900 text-white text-xs rounded-xl shadow-xl z-50 pointer-events-none border border-neutral-700 animate-in fade-in zoom-in-95 duration-150">
                  <p className="font-bold text-[#FF5500] mb-1">{tooltip.title}</p>
                  <p className="text-neutral-300 leading-relaxed">{tooltip.explanation}</p>
                  {tooltip.aviationPrinciple && (
                    <div className="mt-2 pt-2 border-t border-neutral-700 text-[10px] text-amber-300 font-mono">
                      💡 {tooltip.aviationPrinciple}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </label>

        {unit && (
          <span className="text-xs font-mono font-medium text-neutral-500 bg-white/5 px-2 py-0.5 rounded border border-white/10">
            {unit}
          </span>
        )}
      </div>

      {type === "select" && options ? (
        <select
          id={id}
          value={String(value)}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className="w-full min-w-0 h-12 px-4 rounded border border-white/10 bg-black text-sm md:text-base font-medium text-white focus:outline-none focus:ring-1 focus:ring-[#FF5500] focus:border-[#FF5500] transition-all disabled:opacity-50 disabled:bg-white/5 truncate"
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      ) : type === "text" ? (
        <input
          id={id}
          type="text"
          value={String(value)}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className="w-full min-w-0 h-12 px-4 rounded border border-white/10 bg-black text-sm md:text-base font-medium text-white focus:outline-none focus:ring-1 focus:ring-[#FF5500] focus:border-[#FF5500] transition-all disabled:opacity-50 disabled:bg-white/5 truncate"
        />
      ) : (
        <div className="relative flex items-center w-full min-w-0">
          <input
            id={id}
            type="number"
            value={value}
            min={min}
            max={max}
            step={step}
            disabled={disabled}
            onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
            className="w-full min-w-0 h-12 px-4 rounded border border-white/10 bg-black text-sm md:text-base font-mono font-semibold text-white focus:outline-none focus:ring-1 focus:ring-[#FF5500] focus:border-[#FF5500] transition-all disabled:opacity-50 disabled:bg-white/5"
          />
        </div>
      )}

      {helperText && (
        <p className="text-[11px] text-neutral-500 leading-tight mt-1">{helperText}</p>
      )}
    </div>
  );
}
