"use client";

import { useState, useMemo } from "react";
import { FilterTabs } from "@/components/pulse/FilterTabs";
import { PostList } from "@/components/pulse/PostList";
import { VoteBalance } from "@/components/pulse/VoteBalance";
import { BottomNav } from "@/components/layout/BottomNav";
import { calculateVitality } from "@/lib/utils/vitality";
import type { PostType, SortOption } from "@/types";

const FILTER_OPTIONS = [
  { value: "latest", label: "최신순" },
  { value: "vitality-asc", label: "생명력 적은순" },
  { value: "vitality-desc", label: "생명력 많은순" },
];

interface FeedClientProps {
  initialPosts: PostType[];
  balance: number;
  userId?: string;
}

export function FeedClient({ initialPosts, balance }: FeedClientProps) {
  const [sort, setSort] = useState<SortOption>("latest");

  const sortedPosts = useMemo(() => {
    const withVitality = initialPosts.map((p) => ({
      ...p,
      vitality: calculateVitality(p.expiresAt),
    }));

    switch (sort) {
      case "vitality-asc":
        return [...withVitality].sort((a, b) => a.vitality - b.vitality);
      case "vitality-desc":
        return [...withVitality].sort((a, b) => b.vitality - a.vitality);
      default:
        return withVitality;
    }
  }, [initialPosts, sort]);

  const alivePosts = sortedPosts.filter((p) => p.vitality > 0);

  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      {/* 상단 헤더 */}
      <header className="sticky top-0 z-20 bg-[var(--color-background)]/90 backdrop-blur-sm border-b border-[var(--color-border)]">
        <div className="mx-auto max-w-[680px] px-4 h-14 flex items-center justify-between">
          {/* Pulse 로고 */}
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-[var(--color-primary)] flex items-center justify-center" aria-hidden="true">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
            </div>
            <span className="text-[18px] font-bold tracking-[0.05em] text-[var(--color-text-primary)]">
              PULSE
            </span>
          </div>

          {/* 투표권 잔액 */}
          <VoteBalance balance={balance} variant="compact" />
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <main className="mx-auto max-w-[680px] px-4 pb-24">
        {/* 필터 탭 */}
        <div className="sticky top-14 z-10 bg-[var(--color-background)]/90 backdrop-blur-sm mb-4">
          <FilterTabs
            options={FILTER_OPTIONS}
            selected={sort}
            onChange={(v) => setSort(v as SortOption)}
          />
        </div>

        {/* 글 목록 */}
        <PostList posts={alivePosts} type="alive" empty={alivePosts.length === 0} />
      </main>

      {/* 하단 네비 */}
      <BottomNav />
    </div>
  );
}
