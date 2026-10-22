"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface AuthCardProps {
  heading: string;
  subheading?: string;
  children: React.ReactNode;
  belowCard?: React.ReactNode;
  className?: string;
}

export function AuthCard({
  heading,
  subheading,
  children,
  belowCard,
  className,
}: AuthCardProps) {
  return (
    <div className="w-full max-w-[460px] sm:max-w-[480px] mx-auto flex flex-col items-center">
      {/* ABOVE THE CARD: Machinic Cockpit Heading */}
      <div className="relative flex flex-col items-center text-center mb-6 space-y-2 w-full">
        <h1 className="font-sans text-3xl sm:text-4xl font-extrabold tracking-tight text-white uppercase">
          {heading}
        </h1>

        {subheading && (
          <p className="text-xs text-neutral-400 font-bold tracking-widest uppercase max-w-sm leading-normal">
            {subheading}
          </p>
        )}
      </div>

      {/* LUXURY DARK FORM CARD WITH SUBTLE BORDER */}
      <div
        className={cn(
          "w-full rounded-lg border border-white/10 bg-[#0c0d0e] p-6 sm:p-8",
          className
        )}
      >
        {children}
      </div>

      {/* OUTSIDE / BELOW THE CARD: Google Button, Divider, & Navigation directly on canvas */}
      {belowCard && (
        <div className="w-full mt-2.5 space-y-2">
          {belowCard}
        </div>
      )}
    </div>
  );
}
