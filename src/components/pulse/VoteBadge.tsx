"use client";

import { useRef, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { VoteInfoPanel } from "./VoteInfoPanel";

interface VoteBadgeProps {
  freeVotes: number;
  paidVotes: number;
  userId?: string;
}

export function VoteBadge({ freeVotes, paidVotes, userId }: VoteBadgeProps) {
  const router = useRouter();
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleDocumentClick = (event: MouseEvent) => {
      if (!popupRef.current) {
        return;
      }
      if (!popupRef.current.contains(event.target as Node)) {
        setIsPopupOpen(false);
      }
    };
    document.addEventListener("click", handleDocumentClick);
    return () => document.removeEventListener("click", handleDocumentClick);
  }, []);

  const handleBadgeClick = () => {
    if (!userId) {
      router.push("/login");
      return;
    }
    setIsPopupOpen((current) => !current);
  };

  return (
    <div className="relative" ref={popupRef}>
      <button
        onClick={handleBadgeClick}
        className="h-10 min-w-[44px] px-3 rounded-md flex items-center gap-1.5 bg-[rgba(34,197,94,0.12)] border border-[rgba(34,197,94,0.2)] text-[var(--color-like)] cursor-pointer"
        aria-label="투표권 현황 보기"
      >
        <span aria-hidden="true">♥</span>
        <span className="text-[14px] font-semibold tabular-nums">
          투표권 {freeVotes + paidVotes}개
        </span>
      </button>
      {isPopupOpen && (
        <div className="absolute right-0 top-full mt-2 z-50 w-64">
          <VoteInfoPanel
            freeVotes={freeVotes}
            paidVotes={paidVotes}
            isLoggedIn={Boolean(userId)}
            compact={true}
          />
        </div>
      )}
    </div>
  );
}
