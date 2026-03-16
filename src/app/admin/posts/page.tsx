import { createClient } from "@/lib/supabase/server";
import type { AdminListResponse, AdminPost } from "@/types";
import { AdminPostsClient } from "./AdminPostsClient";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ filter?: string; page?: string }>;
}

const VALID_FILTERS = new Set(["all", "alive", "dead", "hidden", "reported"]);

export default async function AdminPostsPage({ searchParams }: Props) {
  const params = await searchParams;
  const filter = VALID_FILTERS.has(params.filter ?? "")
    ? (params.filter as string)
    : "all";
  const parsedPage = Number.parseInt(params.page ?? "1", 10);
  const page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;

  const supabase = await createClient();
  const adminSupabase = supabase as typeof supabase & {
    rpc: (
      fn: string,
      args?: Record<string, unknown>
    ) => Promise<{ data: unknown; error: { message: string } | null }>;
  };
  const { data } = await adminSupabase.rpc("admin_list_posts", {
    p_filter: filter,
    p_page: page,
    p_per_page: 20,
  });

  const response = data as AdminListResponse<AdminPost> | null;
  const posts = response?.data ?? [];
  const total = response?.total ?? 0;

  return (
    <div>
      <h1 className="mb-6 text-xl font-bold">게시글 관리</h1>
      <AdminPostsClient posts={posts} total={total} filter={filter} page={page} />
    </div>
  );
}
