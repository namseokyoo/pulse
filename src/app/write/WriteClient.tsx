"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PostForm } from "@/components/pulse/PostForm";
import type { PostFormValues } from "@/components/pulse/PostForm";
import { BottomNav } from "@/components/layout/BottomNav";
import { createClient } from "@/lib/supabase/client";
import type { GameRules } from "@/types";

interface WriteClientProps {
  gameRules: GameRules;
}

export function WriteClient({ gameRules }: WriteClientProps) {
  const router = useRouter();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (values: PostFormValues) => {
    setIsSubmitting(true);
    setError(null);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }

    const { data, error: insertError } = await supabase
      .from("posts")
      .insert({
        author_id: user.id,
        title: values.title,
        content: values.content,
      })
      .select("id")
      .single();

    setIsSubmitting(false);

    if (insertError || !data) {
      setError("글 작성에 실패했습니다. 다시 시도해주세요.");
      return;
    }

    router.push(`/post/${data.id}`);
  };

  return (
    <div className="min-h-screen bg-[var(--color-background)] flex flex-col">
      {/* 헤더 */}
      <header className="sticky top-0 z-20 bg-[var(--color-background)] border-b border-[var(--color-border)]">
        <div className="mx-auto max-w-[680px] px-4 h-14 flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="min-h-[44px] min-w-[44px] flex items-center text-[14px] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
          >
            취소
          </button>
          <h1 className="text-[16px] font-semibold text-[var(--color-text-primary)]">
            새 글 작성
          </h1>
          <button
            type="button"
            disabled={isSubmitting}
            className="min-h-[44px] px-2 flex items-center text-[14px] font-semibold text-[var(--color-primary)] disabled:opacity-50"
            onClick={() => {
              const form = document.getElementById("post-form-submit") as HTMLButtonElement | null;
              if (form) form.click();
            }}
          >
            {isSubmitting ? "게시 중..." : "게시"}
          </button>
        </div>
      </header>

      {/* 폼 */}
      <main className="mx-auto max-w-[680px] w-full px-4 py-4 pb-24 flex-1 flex flex-col">
        {error && (
          <p className="text-[13px] text-[var(--color-danger)] mb-4">{error}</p>
        )}
        <PostForm
          onSubmit={handleSubmit}
          maxLength={500}
          isSubmitting={isSubmitting}
          gameRules={gameRules}
        />
      </main>

      <BottomNav />
    </div>
  );
}
