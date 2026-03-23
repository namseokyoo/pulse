"use client";

import { useState } from "react";
import { cn, formatMinutes } from "@/lib/utils/format";
import type { GameRules } from "@/types";

export interface PostFormValues {
  title: string;
  content: string;
}

export interface PostFormProps {
  onSubmit: (values: PostFormValues) => void;
  maxLength?: number;
  isSubmitting?: boolean;
  gameRules?: GameRules;
  initialTitle?: string;
  initialContent?: string;
}

export function PostForm({
  onSubmit,
  maxLength = 500,
  isSubmitting = false,
  gameRules,
  initialTitle = "",
  initialContent = "",
}: PostFormProps) {
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);

  const canSubmit = title.trim().length > 0 && content.trim().length > 0 && !isSubmitting;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    onSubmit({ title: title.trim(), content: content.trim() });
  };

  return (
    <form id="post-form" onSubmit={handleSubmit} className="flex flex-col gap-4 flex-1">
      {/* 제목 */}
      <textarea
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="제목을 입력하세요"
        maxLength={100}
        rows={2}
        className={cn(
          "w-full bg-transparent text-[32px] font-bold tracking-[-0.04em]",
          "text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]",
          "resize-none outline-none border-none leading-[1.2]"
        )}
        aria-label="글 제목"
      />

      {/* 본문 */}
      <textarea
        value={content}
        onChange={(e) => {
          if (e.target.value.length <= maxLength) setContent(e.target.value);
        }}
        placeholder="지금 이 순간의 이야기를 써보세요..."
        rows={8}
        className={cn(
          "w-full bg-transparent text-base leading-7 flex-1",
          "text-[var(--color-text-secondary)] placeholder:text-[var(--color-text-muted)]",
          "resize-none outline-none border-none"
        )}
        aria-label="글 본문"
      />

      {/* 생명력 안내 박스 */}
      <div className="rounded-xl border border-[rgba(255,68,68,0.25)] bg-[var(--color-primary-dim)] p-5">
        <p className="text-[14px] font-semibold text-[var(--color-primary)] mb-1">
          {`♥ 이 글은 ${formatMinutes(gameRules?.initialTtlMinutes ?? 360)}의 생명력을 갖고 태어납니다`}
        </p>
        <p className="text-[13px] text-[var(--color-text-secondary)]">
          {`좋아요를 받으면 +${gameRules?.voteTimeChangeMinutes ?? 10}분, 싫어요를 받으면 -${gameRules?.voteTimeChangeMinutes ?? 10}분. 반응에 따라 글의 맥박이 길어지거나 멎습니다.`}
        </p>
      </div>

      {/* 글자 수 */}
      <div className="text-right text-[13px] text-[var(--color-text-muted)] tabular-nums">
        {content.length} / {maxLength}
      </div>

      {/* 제출 버튼 (모바일 헤더에서도 사용 가능하도록 hidden) */}
      <button id="post-form-submit" type="submit" className="hidden" />
    </form>
  );
}
