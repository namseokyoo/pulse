"use client";

import Link from "next/link";
import { VitalityBar } from "./VitalityBar";
import { VitalityTimer } from "./VitalityTimer";
import { calculateVitality } from "@/lib/utils/vitality";
import type { PostType } from "@/types";

export interface PostCardProps {
  post: PostType;
  onVote?: (type: "like" | "dislike", amount: number) => void;
  onReport?: (postId: string) => void;
}

export function PostCard({ post }: PostCardProps) {
  const vitality = calculateVitality(post.expiresAt);

  return (
    <Link href={`/post/${post.id}`} className="block">
      <article
        className="rounded-xl border border-white/5 bg-[var(--color-surface)] p-md shadow-[var(--shadow-card)] transition duration-150 ease-out hover:-translate-y-0.5 hover:bg-[var(--color-surface-elevated)] cursor-pointer"
        aria-label={post.title}
      >
        {/* 제목 */}
        <h2 className="text-[20px] font-semibold leading-[1.3] text-[var(--color-text-primary)] mb-2">
          {post.title}
        </h2>

        {/* 본문 미리보기 */}
        <p className="text-[14px] leading-[1.55] text-[var(--color-text-secondary)] line-clamp-2 mb-3">
          {post.content}
        </p>

        {/* 닉네임 + 남은 시간 */}
        <div className="flex items-center justify-between text-[13px] text-[var(--color-text-muted)] mb-2">
          <span>{post.nickname}</span>
          <VitalityTimer expiresAt={post.expiresAt} size="sm" />
        </div>

        {/* 생명력 바 */}
        <div className="mb-2">
          <VitalityBar vitality={vitality} height={8} />
        </div>

        {/* 생명력% + 좋아요 수 + 싫어요 수 */}
        <div className="flex items-center gap-4 text-[13px]">
          <span className="text-[var(--color-text-muted)]">생명력 {vitality}%</span>
          <span className="text-[var(--color-like)]">좋아요 {post.likes}</span>
          <span className="text-[var(--color-dislike)]">싫어요 {post.dislikes}</span>
        </div>
      </article>
    </Link>
  );
}
