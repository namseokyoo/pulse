import { createClient } from "@/lib/supabase/server";
import { FeedClient } from "./FeedClient";
import type { PostType } from "@/types";

export const dynamic = "force-dynamic";

type PostWithProfile = {
  id: string;
  title: string;
  content: string;
  like_count: number;
  dislike_count: number;
  expires_at: string;
  created_at: string;
  author_id: string;
  profiles: { nickname: string } | null;
};

export default async function FeedPage() {
  const supabase = await createClient();

  const [
    { data: claimsData, error: claimsError },
    { data: postsData },
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
        expires_at,
        created_at,
        author_id,
        profiles:author_id (nickname)
      `)
      .eq("is_dead", false)
      .eq("is_hidden", false)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(50),
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
    nickname: p.profiles?.nickname ?? "익명",
    vitality: 0,
    likes: p.like_count,
    dislikes: p.dislike_count,
    expiresAt: new Date(p.expires_at),
    createdAt: new Date(p.created_at),
    authorId: p.author_id,
  }));

  return <FeedClient initialPosts={posts} balance={balance} userId={userId} />;
}
