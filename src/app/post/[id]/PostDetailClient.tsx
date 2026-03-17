"use client";

import { ThumbsDown, ThumbsUp } from "lucide-react";
import { useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BottomNav } from "@/components/layout/BottomNav";
import { VitalityBar } from "@/components/pulse/VitalityBar";
import { VitalityTimer } from "@/components/pulse/VitalityTimer";
import { VoteButton } from "@/components/pulse/VoteButton";
import { CommentItem } from "@/components/pulse/CommentItem";
import { ReportModal } from "@/components/pulse/ReportModal";
import { VoteBalance } from "@/components/pulse/VoteBalance";
import { createClient } from "@/lib/supabase/client";
import { calculateVitality } from "@/lib/utils/vitality";
import { cn } from "@/lib/utils/format";
import type { CommentType, GameRules, PostType, ReportReason } from "@/types";

interface PostDetailClientProps {
  post: PostType;
  comments: CommentType[];
  balance: number;
  gameRules: GameRules;
  userId?: string;
  isExpiredView?: boolean;
}

type CastVoteResult = {
  success: boolean;
  error?: string;
  free_votes?: number;
  paid_votes?: number;
  like_count?: number;
  dislike_count?: number;
  expires_at?: string;
  is_dead?: boolean;
};

export function PostDetailClient({
  post: initialPost,
  comments: initialComments,
  balance: initialBalance,
  gameRules,
  userId,
  isExpiredView,
}: PostDetailClientProps) {
  const router = useRouter();

  const supabase = createClient();

  const [post, setPost] = useState(initialPost);
  const [confirmedPost, setConfirmedPost] = useState(initialPost);
  const [comments, setComments] = useState(initialComments);
  const [balance, setBalance] = useState(initialBalance);
  const [confirmedBalance, setConfirmedBalance] = useState(initialBalance);
  const [commentText, setCommentText] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [reportTarget, setReportTarget] = useState<string | null>(null);
  const [voteError, setVoteError] = useState<string | null>(null);
  const [commentError, setCommentError] = useState<string | null>(null);
  const [pendingVote, setPendingVote] = useState<{ type: "like" | "dislike" } | null>(null);

  const handleVote = useCallback(async (type: "like" | "dislike", amount: number) => {
    if (!userId) {
      router.push("/login");
      return;
    }
    if (balance < amount) {
      setVoteError("투표권이 부족합니다.");
      return;
    }

    // Optimistic UI
    setPost((prev) => ({
      ...prev,
      likes: type === "like" ? prev.likes + amount : prev.likes,
      dislikes: type === "dislike" ? prev.dislikes + amount : prev.dislikes,
    }));
    setBalance((b) => b - amount);
    setVoteError(null);

    // 서버 검증
    const { data, error } = await supabase.rpc("cast_vote", {
      p_user_id: userId,
      p_post_id: post.id,
      p_vote_type: type,
      p_votes_used: amount,
    }) as { data: CastVoteResult | null; error: unknown };

    if (error || !data?.success) {
      // Rollback
      setPost(confirmedPost);
      setBalance(confirmedBalance);
      setVoteError(data?.error === "insufficient_votes" ? "투표권이 부족합니다." : "투표에 실패했습니다.");
    } else {
      const newPost: typeof post = {
        ...post,
        likes: data.like_count ?? post.likes,
        dislikes: data.dislike_count ?? post.dislikes,
        expiresAt: data.expires_at ? new Date(data.expires_at) : post.expiresAt,
        isDead: data.is_dead ?? post.isDead,
      };
      const newBalance = (data.free_votes ?? 0) + (data.paid_votes ?? 0);
      setPost(newPost);
      setBalance(newBalance);
      setConfirmedPost(newPost);
      setConfirmedBalance(newBalance);

      if (data.is_dead) {
        router.refresh();
      }
    }
  }, [userId, balance, post.id, confirmedPost, confirmedBalance, supabase, router]);

  const vitality = calculateVitality(post.expiresAt, post.initialTtlMinutes ?? 360);

  if (isExpiredView) {
    return (
      <div className="min-h-screen bg-[var(--color-background)] flex flex-col items-center justify-center px-4">
        <div className="text-center">
          <p className="text-[13px] text-[var(--color-text-muted)] mb-2">생명력 0%</p>
          <h1 className="text-[48px] font-bold text-[var(--color-vitality-critical)] mb-4">
            ☠
          </h1>
          <p className="text-[18px] text-[var(--color-text-secondary)] mb-2">
            이 글은 생명력을 다해 사라졌습니다
          </p>
          <p className="text-[14px] text-[var(--color-text-muted)] mb-8">
            생명력이 다한 글은 볼 수 없습니다.
          </p>
          <Link
            href="/"
            className="inline-flex items-center px-6 py-3 rounded-xl bg-[var(--color-primary)] text-white text-[14px] font-semibold transition-transform active:scale-95"
          >
            피드로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  const handleSubmitComment = async () => {
    if (!userId || !commentText.trim() || isSubmittingComment) return;
    setIsSubmittingComment(true);

    const { data, error } = await supabase
      .from("comments")
      .insert({
        post_id: post.id,
        author_id: userId,
        content: commentText.trim(),
      })
      .select(`id, content, created_at, author_id, author_nickname`)
      .single() as { data: { id: string; content: string; created_at: string; author_id: string; author_nickname: string } | null; error: unknown };

    setIsSubmittingComment(false);

    if (!error && data) {
      setComments((prev) => [
        ...prev,
        {
          id: data.id,
          nickname: data.author_nickname,
          content: data.content,
          createdAt: new Date(data.created_at),
          authorId: data.author_id,
        },
      ]);
      setCommentError(null);
      setCommentText("");
    } else {
      setCommentError("댓글 등록에 실패했습니다.");
    }
  };

  const handleReport = async (reason: ReportReason, detail?: string) => {
    if (!userId || !reportTarget) return;
    await supabase.rpc("submit_report", {
      p_reporter_id: userId,
      p_target_type: "post",
      p_target_id: reportTarget,
      p_reason: reason,
      p_detail: detail,
    });
  };

  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      {/* 헤더 */}
      <header className="sticky top-0 z-20 bg-[var(--color-background)]/90 backdrop-blur-sm border-b border-[var(--color-border)]">
        <div className="mx-auto max-w-[680px] px-4 h-14 flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-md text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
            aria-label="뒤로 가기"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-[var(--color-primary)] flex items-center justify-center" aria-hidden="true">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
            </div>
            <span className="text-[18px] font-bold tracking-[0.05em] text-[var(--color-text-primary)]">PULSEUP</span>
          </Link>
          <VoteBalance balance={balance} variant="compact" />
        </div>
      </header>

      <main className="mx-auto max-w-[680px] px-4 pb-24">
        {/* 생명력 카드 */}
        <div className="mt-4 mb-6 p-4 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]">
          <p className="text-[13px] text-[var(--color-text-muted)] mb-2">생명력</p>
          <div className="mb-3">
            <VitalityBar vitality={vitality} height={10} />
          </div>
          <VitalityTimer expiresAt={post.expiresAt} size="lg" />
        </div>

        {/* 제목 */}
        <h1 className="text-[24px] font-bold leading-[1.3] text-[var(--color-text-primary)] mb-4">
          {post.title}
        </h1>

        {/* 본문 */}
        <p className="text-base leading-7 text-[var(--color-text-secondary)] mb-8 whitespace-pre-wrap">
          {post.content}
        </p>

        {/* 투표 에러 */}
        {voteError && (
          <p className="text-[13px] text-[var(--color-danger)] mb-4">{voteError}</p>
        )}

        {/* 투표 버튼 */}
        {!post.isDead && (
          <div className="mb-6 space-y-3">
            <div className="flex gap-4 justify-center">
              <VoteButton
                type="like"
                count={post.likes}
                disabled={userId ? balance === 0 : false}
                onVote={() => {
                  if (!userId) {
                    router.push("/login");
                    return;
                  }
                  setPendingVote({ type: "like" });
                }}
              />
              <VoteButton
                type="dislike"
                count={post.dislikes}
                disabled={userId ? balance === 0 : false}
                onVote={() => {
                  if (!userId) {
                    router.push("/login");
                    return;
                  }
                  setPendingVote({ type: "dislike" });
                }}
              />
            </div>
            {userId && balance === 0 && (
              <p className="text-[13px] text-[var(--color-text-muted)]">
                {`투표권이 없습니다. 매일 정오에 ${gameRules.dailyFreeVotes}개가 충전됩니다.`}
              </p>
            )}
          </div>
        )}

        {/* 다시 작성하기 버튼 */}
        {post.isDead && userId === post.authorId && (
          <div className="mb-6">
            <button
              onClick={() => router.push(`/write?title=${encodeURIComponent(post.title)}&content=${encodeURIComponent(post.content)}`)}
              className="w-full py-3 rounded-xl bg-[var(--color-primary)] text-white text-[14px] font-semibold hover:opacity-90 transition-opacity"
            >
              다시 작성하기
            </button>
          </div>
        )}

        {/* 신고 버튼 */}
        <div className="mb-8 flex justify-end">
          <button
            onClick={() => setReportTarget(post.id)}
            className="text-[13px] text-[var(--color-text-muted)] hover:text-[var(--color-danger)] transition-colors"
          >
            신고하기
          </button>
        </div>

        {/* 구분선 */}
        <div className="border-t border-[var(--color-border)] mb-6" />

        {/* 댓글 섹션 */}
        <section>
          <h2 className="text-[16px] font-semibold text-[var(--color-text-primary)] mb-4">
            댓글 {comments.length}개
          </h2>

          {comments.length > 0 ? (
            <div className="mb-6">
              {comments.map((comment, i) => (
                <CommentItem
                  key={comment.id}
                  comment={comment}
                  isLast={i === comments.length - 1}
                />
              ))}
            </div>
          ) : (
            <p className="text-[14px] text-[var(--color-text-muted)] mb-6">
              첫 번째 댓글을 남겨보세요.
            </p>
          )}

          {/* 댓글 입력 */}
          {!post.isDead && (
            <>
              {userId ? (
                <>
                  <div className="flex gap-2">
                    <textarea
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder="댓글을 입력하세요..."
                      rows={2}
                      maxLength={300}
                      className={cn(
                        "flex-1 p-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]",
                        "text-[14px] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]",
                        "outline-none focus:border-[var(--color-primary)] resize-none"
                      )}
                    />
                    <button
                      onClick={handleSubmitComment}
                      disabled={!commentText.trim() || isSubmittingComment}
                      className="px-4 py-2 rounded-xl bg-[var(--color-primary)] text-white text-[14px] font-semibold disabled:opacity-50 self-end"
                    >
                      등록
                    </button>
                  </div>
                  {commentError && (
                    <p className="text-[13px] text-[var(--color-danger)] mt-2">
                      {commentError}
                    </p>
                  )}
                </>
              ) : (
                <Link
                  href="/login"
                  className="block text-center py-4 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[14px] text-[var(--color-primary)] font-semibold hover:bg-[var(--color-surface-elevated)] transition-colors"
                >
                  로그인하고 댓글 남기기
                </Link>
              )}
            </>
          )}
        </section>
      </main>

      {/* 투표 확인 모달 */}
      {pendingVote && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/60"
            onClick={() => setPendingVote(null)}
            aria-hidden="true"
          />
          <div
            className="fixed inset-0 z-50 flex items-center justify-center px-6"
            role="dialog"
            aria-modal="true"
            aria-labelledby="vote-confirm-title"
          >
            <div className="w-full max-w-[320px] rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] p-6 shadow-[var(--shadow-modal)]">
              <h2 id="vote-confirm-title" className="text-[18px] font-semibold text-[var(--color-text-primary)] mb-3">
                {pendingVote.type === "like" ? (
                  <>
                    <ThumbsUp size={18} className="inline-block mr-1" /> 좋아요
                  </>
                ) : (
                  <>
                    <ThumbsDown size={18} className="inline-block mr-1" /> 싫어요
                  </>
                )}{" "}
                투표
              </h2>
              <p className="text-[14px] text-[var(--color-text-secondary)] mb-6">
                투표권이 1장 소모됩니다.
                <br />
                현재 소유 투표권 {balance}장
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setPendingVote(null)}
                  className="flex-1 py-3 rounded-xl border border-[var(--color-border)] text-[14px] font-semibold text-[var(--color-text-secondary)]"
                >
                  취소
                </button>
                <button
                  onClick={() => {
                    handleVote(pendingVote.type, 1);
                    setPendingVote(null);
                  }}
                  className="flex-1 py-3 rounded-xl bg-[var(--color-primary)] text-white text-[14px] font-semibold"
                >
                  확인
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* 신고 모달 */}
      <ReportModal
        isOpen={Boolean(reportTarget)}
        postId={reportTarget ?? ""}
        onClose={() => setReportTarget(null)}
        onSubmit={handleReport}
      />

      <BottomNav />
    </div>
  );
}
