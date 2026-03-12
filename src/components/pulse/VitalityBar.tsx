"use client";

import { cn } from "@/lib/utils/format";
import { calculateVitality, getVitalityColorClass, getVitalityLevel } from "@/lib/utils/vitality";

export interface VitalityBarProps {
  vitality: number; // 0-100
  height?: number;
  showLabel?: boolean;
  expiresAt?: Date; // expiresAt이 있으면 자동 계산
}

export function VitalityBar({ vitality: vitalityProp, height = 8, showLabel = false, expiresAt }: VitalityBarProps) {
  const vitality = expiresAt ? calculateVitality(expiresAt) : vitalityProp;
  const level = getVitalityLevel(vitality);
  const isCritical = level === "critical";

  const barColor = getVitalityColorClass(vitality);
  const barClass = cn(
    "h-full rounded-full transition-all duration-500",
    barColor,
    isCritical && "animate-pulse-vitality animate-shake-critical shadow-[var(--shadow-glow-primary)]"
  );

  return (
    <div className="w-full space-y-1">
      <div
        className="w-full rounded-full overflow-hidden"
        style={{ height: `${height}px`, backgroundColor: "rgba(255,255,255,0.06)" }}
        role="progressbar"
        aria-valuenow={vitality}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`생명력 ${vitality}%`}
      >
        <div
          className={barClass}
          style={{ width: `${Math.max(vitality, 0)}%` }}
        />
      </div>
      {showLabel && (
        <p className="text-right text-[13px] text-[var(--color-text-muted)]">
          생명력 {vitality}%
        </p>
      )}
    </div>
  );
}
