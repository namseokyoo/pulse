"use client";

import { useEffect, useState } from "react";

export interface VoteBalanceProps {
  balance: number;
  variant?: "compact" | "card";
}

const RESET_HOUR_UTC = 3;
const COUNTDOWN_INTERVAL_MS = 60_000;

function getNextResetTime() {
  const now = new Date();
  const nextReset = new Date(now);

  nextReset.setUTCHours(RESET_HOUR_UTC, 0, 0, 0);

  if (now >= nextReset) {
    nextReset.setUTCDate(nextReset.getUTCDate() + 1);
  }

  return nextReset;
}

function formatCountdown(diffMs: number) {
  const totalMinutes = Math.max(0, Math.floor(diffMs / 60_000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0) {
    return `${hours}시간 ${minutes}분`;
  }

  return `${minutes}분`;
}

export function VoteBalance({ balance, variant = "compact" }: VoteBalanceProps) {
  const [countdown, setCountdown] = useState<string | null>(null);

  useEffect(() => {
    if (variant !== "card") {
      return;
    }

    const updateCountdown = () => {
      const nextResetTime = getNextResetTime();
      setCountdown(formatCountdown(nextResetTime.getTime() - Date.now()));
    };

    updateCountdown();

    const intervalId = window.setInterval(updateCountdown, COUNTDOWN_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [variant]);

  if (variant === "compact") {
    return (
      <div className="h-10 px-3 rounded-md flex items-center gap-1.5 bg-[rgba(34,197,94,0.12)] border border-[rgba(34,197,94,0.2)] text-[var(--color-like)]">
        <span aria-hidden="true">♥</span>
        <span className="text-[14px] font-semibold tabular-nums">투표권 {balance}개</span>
      </div>
    );
  }

  return (
    <div className="rounded-xl p-5 bg-[rgba(34,197,94,0.08)] border border-[rgba(34,197,94,0.2)]">
      <p className="text-[13px] text-[var(--color-text-muted)] mb-1 flex items-center gap-1">
        <span aria-hidden="true">♥</span>
        투표권 잔액
      </p>
      <p className="text-[32px] font-bold text-[var(--color-like)] tabular-nums leading-none">
        {balance}개
      </p>
      {countdown ? (
        <p className="mt-3 text-[13px] text-[var(--color-text-muted)] tabular-nums">
          다음 충전까지 {countdown}
        </p>
      ) : null}
    </div>
  );
}
