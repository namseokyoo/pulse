"use client";

import { cn } from "@/lib/utils/format";

export interface VoteButtonProps {
  type: "like" | "dislike";
  count: number;
  selected?: boolean;
  disabled?: boolean;
  onVote?: (amount: number) => void;
}

export function VoteButton({ type, count, selected = false, disabled = false, onVote }: VoteButtonProps) {
  const isLike = type === "like";
  const colorBase = isLike
    ? "bg-[rgba(34,197,94,0.12)] text-[var(--color-like)] border-[rgba(34,197,94,0.2)]"
    : "bg-[rgba(239,68,68,0.12)] text-[var(--color-dislike)] border-[rgba(239,68,68,0.2)]";
  const selectedExtra = selected
    ? isLike
      ? "bg-[rgba(34,197,94,0.25)] ring-1 ring-[var(--color-like)]"
      : "bg-[rgba(239,68,68,0.25)] ring-1 ring-[var(--color-dislike)]"
    : "";
  const handleVote = () => {
    if (disabled || !onVote) return;
    onVote(1);
  };

  return (
    <button
      onClick={handleVote}
      disabled={disabled}
      className={cn(
        "flex items-center gap-2 px-4 py-2 rounded-xl border text-[14px] font-semibold",
        "transition-transform duration-100 active:scale-95",
        "min-h-[44px]",
        disabled ? "opacity-50 cursor-not-allowed" : "",
        colorBase,
        selectedExtra
      )}
      aria-label={`${isLike ? "좋아요" : "싫어요"} 투표`}
      aria-pressed={selected}
    >
      <span aria-hidden="true">{isLike ? "♥" : "💔"}</span>
      <span>{isLike ? "좋아요" : "싫어요"}</span>
      <span className="tabular-nums opacity-70">({count})</span>
    </button>
  );
}
