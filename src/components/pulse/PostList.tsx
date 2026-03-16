"use client";

import { ThumbsDown, ThumbsUp } from "lucide-react";
import Link from "next/link";
import { PostCard } from "./PostCard";
import type { PostType } from "@/types";

export interface PostListProps {
  posts: PostType[];
  type: "alive" | "dead";
  loading?: boolean;
  empty?: boolean;
}

function SkeletonCard() {
  return (
    <div className="rounded-xl border border-white/5 bg-[var(--color-surface)] p-5 shadow-[var(--shadow-card)] animate-pulse">
      <div className="h-5 bg-white/8 rounded mb-2 w-3/4" />
      <div className="h-4 bg-white/5 rounded mb-1 w-full" />
      <div className="h-4 bg-white/5 rounded mb-3 w-2/3" />
      <div className="h-2 bg-white/5 rounded-full mb-3" />
      <div className="flex gap-3">
        <div className="h-3 bg-white/5 rounded w-16" />
        <div className="h-3 bg-white/5 rounded w-16" />
      </div>
    </div>
  );
}

function DeadPostItem({ post }: { post: PostType }) {
  return (
    <Link href={`/post/${post.id}`} className="block cursor-pointer hover:opacity-80 transition-opacity">
      <div className="rounded-xl border border-white/5 bg-[var(--color-surface)] p-5 opacity-60">
        <div className="flex items-start justify-between gap-3 mb-2">
          <h3 className="text-[16px] font-semibold text-[var(--color-text-secondary)] flex-1 min-w-0">
            {post.title}
          </h3>
          <div className="flex items-center gap-3 shrink-0 pt-0.5">
            {post.likes > 0 && (
              <span className="flex items-center gap-1 text-[var(--color-like)]">
                <span aria-hidden="true">
                  <ThumbsUp size={14} />
                </span>
                <span className="text-[13px] tabular-nums">{post.likes}</span>
              </span>
            )}
            {post.dislikes > 0 && (
              <span className="flex items-center gap-1 text-[var(--color-dislike)]">
                <span aria-hidden="true">
                  <ThumbsDown size={14} />
                </span>
                <span className="text-[13px] tabular-nums">{post.dislikes}</span>
              </span>
            )}
          </div>
        </div>
        <div className="mb-2">
          <div className="w-full h-2 rounded-full bg-white/5">
            <div className="h-full w-0 rounded-full bg-[var(--color-vitality-critical)]" />
          </div>
        </div>
        {post.survivedMinutes !== undefined && (
          <div className="text-[13px] text-[var(--color-text-muted)]">
            <span>
              {Math.floor(post.survivedMinutes / 60) > 0
                ? `${Math.floor(post.survivedMinutes / 60)}h ${post.survivedMinutes % 60}m 생존`
                : `${post.survivedMinutes}m 생존`}
            </span>
          </div>
        )}
      </div>
    </Link>
  );
}

export function PostList({ posts, type, loading = false, empty = false }: PostListProps) {
  if (loading) {
    return (
      <div className="space-y-4">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (empty || posts.length === 0) {
    if (type === "dead") {
      return (
        <div className="py-12 text-center text-[var(--color-text-muted)]">
          <p className="text-[16px]">죽은 글 탭에서는 생명력이 다한 기록들을 다시 볼 수 있습니다.</p>
        </div>
      );
    }
    return (
      <div className="py-12 text-center">
        <p className="text-[16px] text-[var(--color-text-muted)] mb-4">아직 살아있는 글이 없습니다.</p>
        <p className="text-[14px] text-[var(--color-text-muted)]">첫 번째 글을 작성해보세요!</p>
      </div>
    );
  }

  if (type === "dead") {
    return (
      <div className="space-y-4">
        {posts.map((post) => (
          <DeadPostItem key={post.id} post={post} />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
    </div>
  );
}
