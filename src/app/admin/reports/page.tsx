import { createClient } from "@/lib/supabase/server";
import type { AdminListResponse, AdminReport } from "@/types";
import { AdminReportsClient } from "./AdminReportsClient";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ status?: string; page?: string }>;
}

const VALID_STATUS = new Set(["pending", "reviewed", "dismissed", "all"]);

export default async function AdminReportsPage({ searchParams }: Props) {
  const params = await searchParams;
  const status = VALID_STATUS.has(params.status ?? "")
    ? (params.status as string)
    : "pending";
  const parsedPage = Number.parseInt(params.page ?? "1", 10);
  const page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;

  const supabase = await createClient();
  const adminSupabase = supabase as typeof supabase & {
    rpc: (
      fn: string,
      args?: Record<string, unknown>
    ) => Promise<{ data: unknown; error: { message: string } | null }>;
  };
  const { data } = await adminSupabase.rpc("admin_list_reports", {
    p_status: status,
    p_page: page,
    p_per_page: 20,
  });

  const response = data as AdminListResponse<AdminReport> | null;
  const reports = response?.data ?? [];
  const total = response?.total ?? 0;

  return (
    <div>
      <h1 className="mb-6 text-xl font-bold">신고 관리</h1>
      <AdminReportsClient
        reports={reports}
        total={total}
        status={status}
        page={page}
      />
    </div>
  );
}
