"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FilterTabs } from "@/components/pulse/FilterTabs";
import { PostList } from "@/components/pulse/PostList";
import { VoteInfoPanel } from "@/components/pulse/VoteInfoPanel";
import { BottomNav } from "@/components/layout/BottomNav";
import { calculateVitality } from "@/lib/utils/vitality";
import type { GameRules, PostType, SortOption } from "@/types";

const FILTER_OPTIONS = [
  { value: "latest", label: "최신순" },
  { value: "vitality-asc", label: "생명력 적은순" },
  { value: "vitality-desc", label: "생명력 많은순" },
];

interface FeedClientProps {
  initialPosts: PostType[];
  freeVotes: number;
  paidVotes: number;
  gameRules: GameRules;
  userId?: string;
}

export function FeedClient({ initialPosts, freeVotes, paidVotes, gameRules, userId }: FeedClientProps) {
  const router = useRouter();
  const [sort, setSort] = useState<SortOption>("latest");
  const [posts, setPosts] = useState<PostType[]>(initialPosts);
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchFeed = async () => {
      try {
        const res = await fetch("/api/feed");
        if (res.ok) {
          const data = await res.json() as { posts: Array<{
            id: string;
            title: string;
            content: string;
            nickname: string;
            vitality: number;
            likes: number;
            dislikes: number;
            initialTtlMinutes: number;
            expiresAt: string;
            createdAt: string;
            authorId: string;
          }> };
          const parsed = data.posts.map((p) => ({
            ...p,
            expiresAt: new Date(p.expiresAt),
            createdAt: new Date(p.createdAt),
          }));
          setPosts(parsed);
        }
      } catch {
        // 네트워크 오류 시 기존 상태 유지
      }
    };

    const id = setInterval(() => {
      if (!document.hidden) {
        void fetchFeed();
      }
    }, 60_000);

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        void fetchFeed();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

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

    return () => {
      document.removeEventListener("click", handleDocumentClick);
    };
  }, []);

  const sortedPosts = useMemo(() => {
    const withVitality = posts.map((p) => ({
      ...p,
      vitality: calculateVitality(p.expiresAt, p.initialTtlMinutes ?? 360),
    }));

    switch (sort) {
      case "vitality-asc":
        return [...withVitality].sort((a, b) => a.vitality - b.vitality);
      case "vitality-desc":
        return [...withVitality].sort((a, b) => b.vitality - a.vitality);
      default:
        return withVitality;
    }
  }, [posts, sort]);

  const handleBadgeClick = () => {
    if (!userId) {
      router.push("/login");
      return;
    }

    setIsPopupOpen((current) => !current);
  };

  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      {/* 상단 헤더 */}
      <header className="sticky top-0 z-20 bg-[var(--color-background)]/90 backdrop-blur-sm border-b border-[var(--color-border)]">
        <div className="mx-auto max-w-[680px] px-4 h-14 flex items-center justify-between">
          {/* Pulse 로고 */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-[var(--color-primary)] flex items-center justify-center" aria-hidden="true">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
            </div>
            <span className="text-[18px] font-bold tracking-[0.05em] text-[var(--color-text-primary)]">
              PULSEUP
            </span>
          </Link>

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
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <main className="mx-auto max-w-[680px] px-4 pb-24">
        {!userId && (
          <div className="mb-4 p-4 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-center">
            <p className="text-[15px] text-[var(--color-text-primary)] font-semibold mb-2">
              📌 PulseUp 규칙은 단 3가지
            </p>
            <div className="text-[13px] text-[var(--color-text-muted)] mb-3 space-y-1">
              <p>1️⃣ 글은 {gameRules.initialTtlMinutes / 60}시간 후 자동으로 사라집니다</p>
              <p>2️⃣ 좋아요 → 생명 연장 / 싫어요 → 생명 단축</p>
              <p>3️⃣ 매일 투표권 {gameRules.dailyFreeVotes}개 무료 충전</p>
            </div>
            <Link
              href="/login"
              className="inline-block px-6 py-2.5 rounded-xl bg-[var(--color-primary)] text-white text-[14px] font-semibold"
            >
              지금 투표하기 — 투표권 {gameRules.dailyFreeVotes}개 무료
            </Link>
          </div>
        )}

        {/* 필터 탭 */}
        <div className="sticky top-14 z-10 bg-[var(--color-background)]/90 backdrop-blur-sm mb-4">
          <FilterTabs
            options={FILTER_OPTIONS}
            selected={sort}
            onChange={(v) => setSort(v as SortOption)}
          />
        </div>

        {/* 글 목록 */}
        <PostList posts={sortedPosts} type="alive" empty={sortedPosts.length === 0} />
      </main>

      {/* 하단 네비 */}
      <BottomNav />
    </div>
  );
}
