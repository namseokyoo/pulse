import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";
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
  edited_at: string | null;
  author_nickname: string;
};

type CommentRow = {
  id: string;
  content: string;
  created_at: string;
  edited_at: string | null;
  is_deleted: boolean;
  author_id: string;
  author_nickname: string;
};

type GameRulesRow = Database["public"]["Tables"]["game_rules"]["Row"];

interface PostDetailPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PostDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();

  const { data: post } = await supabase
    .from("posts")
    .select("title, content, is_dead, is_hidden, author_nickname, like_count, dislike_count")
    .eq("id", id)
    .single();

  if (!post || post.is_hidden) {
    return {
      title: "글을 찾을 수 없습니다",
    };
  }

  const contentPreview = post.content.length > 100
    ? `${post.content.slice(0, 100)}...`
    : post.content;

  const statusLabel = post.is_dead ? "☠ 사라진 글" : "💓 살아있는 글";
  const description = `${statusLabel} · ❤️ ${post.like_count} 💔 ${post.dislike_count} — ${contentPreview}`;

  return {
    title: post.title,
    description,
    openGraph: {
      type: "article",
      title: post.title,
      description,
      siteName: "PulseUp",
      images: [
        {
          url: "/og-default.png",
          width: 1200,
          height: 630,
          alt: post.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description,
      images: ["/og-default.png"],
    },
    robots: post.is_dead ? { index: false, follow: false } : { index: true, follow: true },
  };
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
        id, title, content, like_count, dislike_count, initial_ttl_minutes, expires_at, created_at, author_id, is_dead, is_hidden, edited_at, author_nickname
      `)
      .eq("id", id)
      .single(),
    supabase
      .from("comments")
      .select(`
        id, content, created_at, edited_at, is_deleted, author_id,
        author_nickname
      `)
      .eq("post_id", id)
      .is("parent_id", null)
      .eq("is_deleted", false)
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

  const isExpiredView = postData.is_dead && userId !== postData.author_id;

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
    nickname: postData.author_nickname,
    vitality: 0,
    likes: postData.like_count,
    dislikes: postData.dislike_count,
    initialTtlMinutes: postData.initial_ttl_minutes,
    expiresAt: new Date(postData.expires_at),
    createdAt: new Date(postData.created_at),
    isDead: postData.is_dead,
    editedAt: postData.edited_at ? new Date(postData.edited_at) : undefined,
    authorId: postData.author_id,
  };

  const comments: CommentType[] = ((rawComments ?? []) as unknown as CommentRow[]).map((c) => ({
    id: c.id,
    nickname: c.author_nickname,
    content: c.content,
    createdAt: new Date(c.created_at),
    editedAt: c.edited_at ? new Date(c.edited_at) : undefined,
    isDeleted: c.is_deleted,
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
      isExpiredView={isExpiredView}
    />
  );
}
