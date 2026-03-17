"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export interface VoteInfoPanelProps {
  freeVotes: number;
  paidVotes: number;
  isLoggedIn?: boolean;
  showPurchaseButton?: boolean;
  compact?: boolean;
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

export function VoteInfoPanel({
  freeVotes,
  paidVotes,
  isLoggedIn = true,
  showPurchaseButton = true,
  compact = false,
}: VoteInfoPanelProps) {
  const [countdown, setCountdown] = useState<string | null>(null);

  useEffect(() => {
    const updateCountdown = () => {
      const nextResetTime = getNextResetTime();
      setCountdown(formatCountdown(nextResetTime.getTime() - Date.now()));
    };

    updateCountdown();

    const intervalId = window.setInterval(updateCountdown, COUNTDOWN_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  return (
    <div
      className={`bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl ${
        compact ? "p-4" : "p-5"
      }`}
    >
      {!compact && (
        <p className="text-[14px] font-semibold text-[var(--color-text-primary)]">
          💰 투표권 현황
        </p>
      )}

      <div className={compact ? "space-y-2" : "mt-4 space-y-2"}>
        <div className="flex items-center justify-between gap-4">
          <span className="text-[13px] text-[var(--color-text-muted)]">무료</span>
          <span className="text-[15px] font-semibold text-[var(--color-like)]">
            ♥ {freeVotes}개
          </span>
        </div>

        <div className="flex items-center justify-between gap-4">
          <span className="text-[13px] text-[var(--color-text-muted)]">유료</span>
          <span className="text-[15px] font-semibold text-[var(--color-primary)]">
            ♥ {paidVotes}개
          </span>
        </div>
      </div>

      <div className="border-t border-[var(--color-border)] my-3" />

      {countdown ? (
        <p className="text-[13px] text-[var(--color-text-muted)]">
          ⏱ 다음 충전까지 {countdown}
        </p>
      ) : null}

      {showPurchaseButton && isLoggedIn && (
        <Link
          href="/purchase"
          className="mt-3 w-full py-3 rounded-xl bg-[var(--color-primary)] text-white text-[14px] font-semibold text-center block"
        >
          투표권 구매하기 →
        </Link>
      )}

      {showPurchaseButton && !isLoggedIn && (
        <Link
          href="/login"
          className="mt-3 w-full py-3 rounded-xl bg-[var(--color-surface-elevated)] border border-[var(--color-border)] text-[var(--color-text-secondary)] text-[14px] font-semibold text-center block"
        >
          로그인하고 투표하기
        </Link>
      )}
    </div>
  );
}
