export const dynamic = "force-dynamic";
export const revalidate = 10;

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { PostType } from "@/types";

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

export async function GET() {
  const supabase = await createClient();

  const { data: postsData } = await supabase
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
    .limit(50);

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

  return NextResponse.json({ posts });
}
