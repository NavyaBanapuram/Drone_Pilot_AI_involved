import React from "react";
import { cn } from "@/lib/utils";

interface DroneIconProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  invert?: boolean;
  orange?: boolean;
  className?: string;
}

export function DroneIcon({
  invert,
  orange = false,
  className = "h-5 w-5",
  alt = "Drone Icon",
  ...props
}: DroneIconProps) {
  const isWhite = invert || (className && className.includes("text-white"));

  return (
    <img
      src="/drone-icon.png"
      alt={alt}
      width={20}
      height={20}
      className={cn(
        "object-contain select-none shrink-0 transition-all",
        isWhite ? "brightness-0 invert" : "",
        className
      )}
      style={orange ? { filter: 'invert(42%) sepia(93%) saturate(1352%) hue-rotate(360deg) brightness(119%) contrast(119%)' } : undefined}
      {...props}
    />
  );
}
