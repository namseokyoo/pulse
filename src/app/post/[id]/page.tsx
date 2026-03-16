import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { PostDetailClient } from "./PostDetailClient";
import type { CommentType, Database, GameRules, PostType } from "@/types";

export const dynamic = "force-dynamic";

type PostRow = {
  id: string;
  title: string;
  content: string;
  like_count: number;
  dislike_count: number;
  initial_ttl_minutes: number;
  expires_at: string;
  created_at: string;
  author_id: string;
  is_dead: boolean;
  is_hidden: boolean;
  profiles: { nickname: string } | null;
};

type CommentRow = {
  id: string;
  content: string;
  created_at: string;
  author_id: string;
  profiles: { nickname: string } | null;
};

type GameRulesRow = Database["public"]["Tables"]["game_rules"]["Row"];

interface PostDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function PostDetailPage({ params }: PostDetailPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const [
    { data: claimsData, error: claimsError },
    { data: rawPostData },
    { data: rawComments },
    { data: gameRulesData },
  ] = await Promise.all([
    supabase.auth.getClaims(),
    supabase
      .from("posts")
      .select(`
        id, title, content, like_count, dislike_count, initial_ttl_minutes, expires_at, created_at, author_id, is_dead, is_hidden,
        profiles:author_id (nickname)
      `)
      .eq("id", id)
      .single(),
    supabase
      .from("comments")
      .select(`
        id, content, created_at, author_id,
        profiles:author_id (nickname)
      `)
      .eq("post_id", id)
      .is("parent_id", null)
      .order("created_at", { ascending: true }),
    supabase
      .from("game_rules")
      .select("vote_time_change_minutes, daily_free_votes, initial_ttl_minutes")
      .eq("id", true)
      .single(),
  ]);

  const postData = rawPostData as unknown as PostRow | null;
  const userId = claimsError ? undefined : claimsData?.claims.sub ?? undefined;

  if (!postData || postData.is_hidden) {
    notFound();
  }

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

  const post: PostType = {
    id: postData.id,
    title: postData.title,
    content: postData.content,
    nickname: postData.profiles?.nickname ?? "익명",
    vitality: 0,
    likes: postData.like_count,
    dislikes: postData.dislike_count,
    initialTtlMinutes: postData.initial_ttl_minutes,
    expiresAt: new Date(postData.expires_at),
    createdAt: new Date(postData.created_at),
    isDead: postData.is_dead,
    authorId: postData.author_id,
  };

  const comments: CommentType[] = ((rawComments ?? []) as unknown as CommentRow[]).map((c) => ({
    id: c.id,
    nickname: c.profiles?.nickname ?? "익명",
    content: c.content,
    createdAt: new Date(c.created_at),
    authorId: c.author_id,
  }));

  const rules = gameRulesData as GameRulesRow | null;

  const gameRules: GameRules = {
    voteTimeChangeMinutes: rules?.vote_time_change_minutes ?? 10,
    dailyFreeVotes: rules?.daily_free_votes ?? 10,
    initialTtlMinutes: rules?.initial_ttl_minutes ?? 360,
  };

  return (
    <PostDetailClient
      post={post}
      comments={comments}
      balance={balance}
      gameRules={gameRules}
      userId={userId}
    />
  );
}
