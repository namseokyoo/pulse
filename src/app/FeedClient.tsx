"use client";

import { useEffect, useMemo, useState } from "react";
import { FilterTabs } from "@/components/pulse/FilterTabs";
import { PostList } from "@/components/pulse/PostList";
import { calculateVitality } from "@/lib/utils/vitality";
import type { GameRules, PostType, SortOption } from "@/types";

const FILTER_OPTIONS = [
  { value: "latest", label: "최신순" },
  { value: "vitality-asc", label: "생명력 적은순" },
  { value: "vitality-desc", label: "생명력 많은순" },
];

interface FeedClientProps {
  initialPosts: PostType[];
  gameRules: GameRules;
}

export function FeedClient({ initialPosts, gameRules }: FeedClientProps) {
  const [sort, setSort] = useState<SortOption>("latest");
  const [posts, setPosts] = useState<PostType[]>(initialPosts);

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

  return (
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
      <PostList posts={sortedPosts} type="alive" empty={sortedPosts.length === 0} />
    </main>
  );
}
