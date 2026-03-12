"use client";

import { useState } from "react";
import { cn } from "@/lib/utils/format";

export interface VoteButtonProps {
  type: "like" | "dislike";
  count: number;
  selected?: boolean;
  disabled?: boolean;
  onVote?: (amount: number) => void;
}

export function VoteButton({ type, count, selected = false, disabled = false, onVote }: VoteButtonProps) {
  const [amount, setAmount] = useState(1);

  const isLike = type === "like";
  const colorBase = isLike
    ? "bg-[rgba(34,197,94,0.12)] text-[var(--color-like)] border-[rgba(34,197,94,0.2)]"
    : "bg-[rgba(239,68,68,0.12)] text-[var(--color-dislike)] border-[rgba(239,68,68,0.2)]";
  const selectedExtra = selected
    ? isLike
      ? "bg-[rgba(34,197,94,0.25)] ring-1 ring-[var(--color-like)]"
      : "bg-[rgba(239,68,68,0.25)] ring-1 ring-[var(--color-dislike)]"
    : "";
  const disabledClass = disabled ? "opacity-50 cursor-not-allowed" : "";

  const handleVote = () => {
    if (disabled || !onVote) return;
    onVote(amount);
  };

  const handleDecrement = (e: React.MouseEvent) => {
    e.stopPropagation();
    setAmount((a) => Math.max(1, a - 1));
  };

  const handleIncrement = (e: React.MouseEvent) => {
    e.stopPropagation();
    setAmount((a) => Math.min(10, a + 1));
  };

  return (
    <div className={cn("flex items-center gap-2", disabledClass)}>
      {/* 스텝퍼 */}
      <div className="flex items-center gap-1">
        <button
          onClick={handleDecrement}
          disabled={disabled || amount <= 1}
          className={cn(
            "min-h-[44px] min-w-[44px] flex items-center justify-center rounded-md text-[var(--color-text-secondary)] transition-transform duration-100 active:scale-95",
            "hover:bg-white/5 disabled:opacity-30"
          )}
          aria-label="투표권 1 감소"
        >
          −
        </button>
        <span className="tabular-nums text-[var(--color-text-primary)] text-[14px] font-semibold min-w-[2ch] text-center">
          {amount}
        </span>
        <button
          onClick={handleIncrement}
          disabled={disabled || amount >= 10}
          className={cn(
            "min-h-[44px] min-w-[44px] flex items-center justify-center rounded-md text-[var(--color-text-secondary)] transition-transform duration-100 active:scale-95",
            "hover:bg-white/5 disabled:opacity-30"
          )}
          aria-label="투표권 1 증가"
        >
          +
        </button>
      </div>

      {/* 투표 버튼 */}
      <button
        onClick={handleVote}
        disabled={disabled}
        className={cn(
          "flex items-center gap-2 px-4 py-2 rounded-xl border text-[14px] font-semibold",
          "transition-transform duration-100 active:scale-95",
          "min-h-[44px]",
          colorBase,
          selectedExtra
        )}
        aria-label={`${isLike ? "좋아요" : "싫어요"} ${amount}표 투표`}
        aria-pressed={selected}
      >
        <span aria-hidden="true">{isLike ? "♥" : "💔"}</span>
        <span>{isLike ? "좋아요" : "싫어요"}</span>
        <span className="tabular-nums opacity-70">({count})</span>
      </button>
    </div>
  );
}
