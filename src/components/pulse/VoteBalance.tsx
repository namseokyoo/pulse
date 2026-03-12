"use client";

export interface VoteBalanceProps {
  balance: number;
  variant?: "compact" | "card";
}

export function VoteBalance({ balance, variant = "compact" }: VoteBalanceProps) {
  if (variant === "compact") {
    return (
      <div className="h-10 px-3 rounded-md flex items-center gap-1.5 bg-[rgba(34,197,94,0.12)] border border-[rgba(34,197,94,0.2)] text-[var(--color-like)]">
        <span aria-hidden="true">♥</span>
        <span className="text-[14px] font-semibold tabular-nums">투표권 {balance}개</span>
      </div>
    );
  }

  return (
    <div className="rounded-xl p-lg bg-[rgba(34,197,94,0.08)] border border-[rgba(34,197,94,0.2)]">
      <p className="text-[13px] text-[var(--color-text-muted)] mb-1 flex items-center gap-1">
        <span aria-hidden="true">♥</span>
        투표권 잔액
      </p>
      <p className="text-[32px] font-bold text-[var(--color-like)] tabular-nums leading-none">
        {balance}개
      </p>
    </div>
  );
}
