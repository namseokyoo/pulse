"use client";

import { VoteBalance } from "./VoteBalance";

export interface ProfileHeaderProps {
  nickname: string;
  onEdit?: () => void;
  balance: number;
}

export function ProfileHeader({ nickname, onEdit, balance }: ProfileHeaderProps) {
  return (
    <div className="pt-6 mb-6">
      {/* 닉네임 + 수정 버튼 */}
      <div className="flex items-start justify-between mb-4">
        <h1 className="text-[32px] font-bold tracking-[-0.04em] text-[var(--color-text-primary)] leading-[1.2]">
          {nickname}
        </h1>
        {onEdit && (
          <button
            onClick={onEdit}
            className="w-10 h-10 flex items-center justify-center rounded-md bg-white/4 hover:bg-white/8 transition-colors text-[var(--color-text-secondary)]"
            aria-label="닉네임 수정"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
        )}
      </div>

      {/* 투표권 잔액 카드 */}
      <VoteBalance balance={balance} variant="card" />
    </div>
  );
}
