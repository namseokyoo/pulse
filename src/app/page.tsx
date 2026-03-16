import { createClient } from "@/lib/supabase/server";
import { FeedClient } from "./FeedClient";
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

  let balance = 0;
  if (userId) {
    const { data: profileData } = await supabase
      .from("profiles")
      .select("free_votes, paid_votes")
      .eq("id", userId)
      .single();
    if (profileData) {
      const p = profileData as { free_votes: number; paid_votes: number };
      balance = (p.free_votes ?? 0) + (p.paid_votes ?? 0);
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

  return <FeedClient initialPosts={posts} balance={balance} userId={userId} gameRules={gameRules} />;
}
