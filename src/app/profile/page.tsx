import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ProfileClient } from "./ProfileClient";
import type { PostType } from "@/types";

export const dynamic = "force-dynamic";

type ProfileRow = {
  nickname: string;
  free_votes: number;
  paid_votes: number;
};

type PostRow = {
  id: string;
  title: string;
  like_count: number;
  dislike_count: number;
  initial_ttl_minutes: number;
  expires_at: string;
  created_at: string;
  dead_at: string | null;
  is_dead: boolean;
  author_nickname: string;
};

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [
    { data: rawProfile },
    { data: rawAlivePosts },
    { data: rawDeadPosts },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("nickname, free_votes, paid_votes")
      .eq("id", user.id)
      .single(),
    supabase
      .from("posts")
      .select("id, title, like_count, dislike_count, initial_ttl_minutes, expires_at, created_at, dead_at, is_dead, author_nickname")
      .eq("author_id", user.id)
      .eq("is_dead", false)
      .eq("is_hidden", false)
      .eq("is_deleted", false)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false }),
    supabase
      .from("posts")
      .select("id, title, like_count, dislike_count, initial_ttl_minutes, expires_at, created_at, dead_at, is_dead, author_nickname")
      .eq("author_id", user.id)
      .eq("is_dead", true)
      .order("dead_at", { ascending: false })
      .limit(50),
  ]);

  const profile = rawProfile as unknown as ProfileRow | null;

  if (!profile) {
    redirect("/login");
  }

  const balance = (profile.free_votes ?? 0) + (profile.paid_votes ?? 0);

  const mapPost = (p: PostRow): PostType => ({
    id: p.id,
    title: p.title,
    content: "",
    nickname: p.author_nickname,
    vitality: 0,
    likes: p.like_count,
    dislikes: p.dislike_count,
    initialTtlMinutes: p.initial_ttl_minutes,
    expiresAt: new Date(p.expires_at),
    createdAt: new Date(p.created_at),
    isDead: p.is_dead,
    survivedMinutes: p.dead_at
      ? Math.floor((new Date(p.dead_at).getTime() - new Date(p.created_at).getTime()) / 60000)
      : undefined,
  });

  return (
    <ProfileClient
      nickname={profile.nickname}
      balance={balance}
      alivePosts={((rawAlivePosts ?? []) as unknown as PostRow[]).map(mapPost)}
      deadPosts={((rawDeadPosts ?? []) as unknown as PostRow[]).map(mapPost)}
      userId={user.id}
    />
  );
}
