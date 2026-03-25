"use client";

import { formatTimeRemaining, calculateVitality, getVitalityTextClass } from "@/lib/utils/vitality";
import { cn } from "@/lib/utils/format";
import { useGlobalTick } from "@/lib/hooks/useGlobalTick";

export interface VitalityTimerProps {
  expiresAt: Date;
  initialTtlMinutes?: number;
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "text-[12px]",
  md: "text-[13px]",
  lg: "text-[16px] font-semibold",
};

export function VitalityTimer({ expiresAt, initialTtlMinutes = 360, size = "md" }: VitalityTimerProps) {
  useGlobalTick(); // 매초 리렌더 트리거 (이 컴포넌트만)

  const timeStr = formatTimeRemaining(expiresAt);
  const vitality = calculateVitality(expiresAt, initialTtlMinutes);
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
