import { createClient } from "@/lib/supabase/server";
import { FeedClient } from "./FeedClient";
import { BottomNav } from "@/components/layout/BottomNav";
import { VoteBadge } from "@/components/pulse/VoteBadge";
import Link from "next/link";
import type { Database, GameRules, PostType } from "@/types";

export const dynamic = "force-dynamic";

type PostWithProfile = {
  id: string;
  title: string;
  content: string;
  like_count: number;
  dislike_count: number;
  initial_ttl_minutes: number;
  expires_at: string;
  created_at: string;
  author_id: string;
  author_nickname: string;
};

type GameRulesRow = Database["public"]["Tables"]["game_rules"]["Row"];

export default async function FeedPage() {
  const supabase = await createClient();

  const [
    { data: claimsData, error: claimsError },
    { data: postsData },
    { data: gameRulesData },
  ] = await Promise.all([
    supabase.auth.getClaims(),
    supabase
      .from("posts")
      .select(`
        id,
        title,
        content,
        like_count,
        dislike_count,
        initial_ttl_minutes,
        expires_at,
        created_at,
        author_id,
        author_nickname
      `)
      .eq("is_dead", false)
      .eq("is_hidden", false)
      .eq("is_deleted", false)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("game_rules")
      .select("vote_time_change_minutes, daily_free_votes, initial_ttl_minutes")
      .eq("id", true)
      .single(),
  ]);

  const userId = claimsError ? undefined : claimsData?.claims.sub ?? undefined;

  let freeVotes = 0;
  let paidVotes = 0;
  if (userId) {
    const { data: profileData } = await supabase
      .from("profiles")
      .select("free_votes, paid_votes")
      .eq("id", userId)
      .single();
    if (profileData) {
      const p = profileData as { free_votes: number; paid_votes: number };
      freeVotes = p.free_votes ?? 0;
      paidVotes = p.paid_votes ?? 0;
    }
  }

  const posts: PostType[] = ((postsData ?? []) as unknown as PostWithProfile[]).map((p) => ({
    id: p.id,
    title: p.title,
    content: p.content,
    nickname: p.author_nickname,
    vitality: 0,
    likes: p.like_count,
    dislikes: p.dislike_count,
    initialTtlMinutes: p.initial_ttl_minutes,
    expiresAt: new Date(p.expires_at),
    createdAt: new Date(p.created_at),
    authorId: p.author_id,
  }));

  const rules = gameRulesData as GameRulesRow | null;

  const gameRules: GameRules = {
    voteTimeChangeMinutes: rules?.vote_time_change_minutes ?? 10,
    dailyFreeVotes: rules?.daily_free_votes ?? 10,
    initialTtlMinutes: rules?.initial_ttl_minutes ?? 360,
  };

  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      {/* 헤더 - Server Component */}
      <header className="sticky top-0 z-20 bg-[var(--color-background)]/90 backdrop-blur-sm border-b border-[var(--color-border)]">
        <div className="mx-auto max-w-[680px] px-4 h-14 flex items-center justify-between">
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
          {/* 투표권 버튼 - Client Island */}
          <VoteBadge freeVotes={freeVotes} paidVotes={paidVotes} userId={userId} />
        </div>
      </header>

      {/* 규칙 배너 - Server Component (LCP 요소!) */}
      {!userId && (
        <div className="mx-auto max-w-[680px] px-4">
          <div className="mb-4 p-5 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)]">
            <div className="space-y-2 mb-4">
              <p className="text-[14px] text-[var(--color-text-secondary)] leading-relaxed">
                <span className="text-[var(--color-text-primary)] font-semibold">① 모든 글은 6시간 후 사라진다</span>
              </p>
              <p className="text-[14px] text-[var(--color-text-secondary)] leading-relaxed">
                ② 좋아요 = 생명 연장{" "}
                <span className="text-[var(--color-text-muted)]">|</span>{" "}
                싫어요 = 생명 단축
              </p>
              <p className="text-[14px] text-[var(--color-text-secondary)] leading-relaxed">
                ③ 매일 투표권 {gameRules.dailyFreeVotes}개 무료 충전
              </p>
            </div>
            <Link
              href="/login"
              className="block w-full text-center py-3 rounded-xl bg-[var(--color-primary)] text-white text-[14px] font-semibold"
            >
              지금 참여하기
            </Link>
          </div>
        </div>
      )}

      {/* 피드 - Client Component (인터랙티브 부분만) */}
      <FeedClient initialPosts={posts} gameRules={gameRules} />

      {/* 하단 네비 */}
      <BottomNav />
    </div>
  );
}
