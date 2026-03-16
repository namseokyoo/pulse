"use client";

import { ThumbsDown, ThumbsUp } from "lucide-react";
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
  const vitality = calculateVitality(post.expiresAt, post.initialTtlMinutes ?? 360);

  return (
    <Link href={`/post/${post.id}`} className="block">
      <article
        className="rounded-xl border border-white/5 bg-[var(--color-surface)] p-5 shadow-[var(--shadow-card)] transition duration-150 ease-out hover:-translate-y-0.5 hover:bg-[var(--color-surface-elevated)] cursor-pointer"
        aria-label={post.title}
      >
        {/* 제목 */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <h2 className="text-[20px] font-semibold leading-[1.3] text-[var(--color-text-primary)] flex-1 min-w-0">
            {post.title}
          </h2>
          <div className="flex items-center gap-3 shrink-0 pt-1">
            <span className="flex items-center gap-1 text-[var(--color-like)]">
              <span aria-hidden="true">
                <ThumbsUp size={14} />
              </span>
              <span className="text-[13px] tabular-nums">{post.likes}</span>
            </span>
            <span className="flex items-center gap-1 text-[var(--color-dislike)]">
              <span aria-hidden="true">
                <ThumbsDown size={14} />
              </span>
              <span className="text-[13px] tabular-nums">{post.dislikes}</span>
            </span>
          </div>
        </div>

        {/* 본문 미리보기 */}
        <p className="text-[14px] leading-[1.55] text-[var(--color-text-secondary)] line-clamp-2 mb-4">
          {post.content}
        </p>

        {/* 닉네임 + 남은 시간 */}
        <div className="flex items-center justify-between text-[13px] text-[var(--color-text-muted)] mb-3">
          <span>{post.nickname}</span>
          <VitalityTimer expiresAt={post.expiresAt} size="sm" />
        </div>

        {/* 생명력 바 */}
        <div className="mb-3">
          <VitalityBar vitality={vitality} height={8} />
        </div>
      </article>
    </Link>
  );
}
