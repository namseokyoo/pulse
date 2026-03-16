import { createClient } from "@/lib/supabase/server";
import type { AdminListResponse, AdminUser } from "@/types";
import { AdminUsersClient } from "./AdminUsersClient";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ search?: string; page?: string }>;
}

export default async function AdminUsersPage({ searchParams }: Props) {
  const params = await searchParams;
  const search = params.search ?? "";
  const parsedPage = Number.parseInt(params.page ?? "1", 10);
  const page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;

  const supabase = await createClient();
  const adminSupabase = supabase as typeof supabase & {
    rpc: (
      fn: string,
      args?: Record<string, unknown>
    ) => Promise<{ data: unknown; error: { message: string } | null }>;
  };
  const { data } = await adminSupabase.rpc("admin_list_users", {
    p_page: page,
    p_per_page: 20,
    p_search: search,
  });

  const response = data as AdminListResponse<AdminUser> | null;
  const users = response?.data ?? [];
  const total = response?.total ?? 0;

  return (
    <div>
      <h1 className="mb-6 text-xl font-bold">회원 관리</h1>
      <AdminUsersClient users={users} total={total} search={search} page={page} />
    </div>
  );
}
