"use client";

import { formatRelativeTime } from "@/lib/utils/format";
import type { CommentType } from "@/types";

export interface CommentItemProps {
  comment: CommentType;
  isLast?: boolean;
}

export function CommentItem({ comment, isLast = false }: CommentItemProps) {
  return (
    <div className={`py-3 ${!isLast ? "border-b border-[var(--color-border)]" : ""}`}>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-[13px] font-semibold text-[var(--color-text-primary)]">
          {comment.nickname}
        </span>
        <span className="text-[13px] text-[var(--color-text-muted)]">
          {formatRelativeTime(comment.createdAt)}
        </span>
      </div>
      <p className="text-[15px] leading-6 text-[var(--color-text-secondary)]">
        {comment.content}
      </p>
    </div>
  );
}
