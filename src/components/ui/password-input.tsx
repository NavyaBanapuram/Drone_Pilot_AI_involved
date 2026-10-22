"use client";

import React, { forwardRef, useState } from "react";
import { Input, type InputProps } from "./input";
import { Eye, EyeOff } from "lucide-react";

export interface PasswordInputProps extends Omit<InputProps, "type" | "rightElement"> {
  showToggle?: boolean;
}

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ showToggle = true, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);

    const toggleVisibility = () => {
      setShowPassword((prev) => !prev);
    };

    const toggleButton = showToggle ? (
      <button
        type="button"
        tabIndex={-1}
        onClick={toggleVisibility}
        className="border-0 border-none bg-transparent p-1 text-neutral-400 hover:text-white outline-none focus:outline-none focus:ring-0 shadow-none transition-colors cursor-pointer flex items-center justify-center"
        aria-label={showPassword ? "Hide password" : "Show password"}
        title={showPassword ? "Hide password" : "Show password"}
      >
        {showPassword ? (
          <EyeOff className="h-4 w-4 stroke-[2]" aria-hidden="true" />
        ) : (
          <Eye className="h-4 w-4 stroke-[2]" aria-hidden="true" />
        )}
      </button>
    ) : undefined;

    return (
      <Input
        ref={ref}
        type={showPassword ? "text" : "password"}
        rightElement={toggleButton}
        {...props}
      />
    );
  }
);

PasswordInput.displayName = "PasswordInput";
