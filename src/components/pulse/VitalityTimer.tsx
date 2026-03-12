"use client";

import { useState, useEffect } from "react";
import { formatTimeRemaining, calculateVitality, getVitalityTextClass } from "@/lib/utils/vitality";
import { cn } from "@/lib/utils/format";

export interface VitalityTimerProps {
  expiresAt: Date;
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "text-[12px]",
  md: "text-[13px]",
  lg: "text-[16px] font-semibold",
};

export function VitalityTimer({ expiresAt, size = "md" }: VitalityTimerProps) {
  const [timeStr, setTimeStr] = useState(() => formatTimeRemaining(expiresAt));
  const [vitality, setVitality] = useState(() => calculateVitality(expiresAt));

  useEffect(() => {
    const tick = () => {
      setTimeStr(formatTimeRemaining(expiresAt));
      setVitality(calculateVitality(expiresAt));
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  const colorClass = getVitalityTextClass(vitality);

  return (
    <span
      className={cn("tabular-nums", sizeClasses[size], colorClass)}
      aria-live="polite"
      aria-label={`남은 시간: ${timeStr}`}
    >
      {timeStr} 남음
    </span>
  );
}
