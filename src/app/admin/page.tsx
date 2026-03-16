import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { AdminStats } from "@/types";

export const dynamic = "force-dynamic";

type AdminStatsResponse = { success: boolean } & AdminStats;

export default async function AdminDashboardPage() {
  const supabase = await createClient();
  const adminSupabase = supabase as typeof supabase & {
    rpc: (
      fn: string,
      args?: Record<string, unknown>
    ) => Promise<{ data: unknown; error: { message: string } | null }>;
  };
  const { data } = await adminSupabase.rpc("admin_get_stats");
  const stats = data as AdminStatsResponse | null;

  const cards = [
    {
      label: "살아있는 글",
      value: stats?.alive_posts ?? 0,
      color: "text-green-500",
    },
    {
      label: "오늘 투표",
      value: stats?.today_votes ?? 0,
      color: "text-blue-400",
    },
    { label: "총 회원", value: stats?.total_users ?? 0, color: "text-white" },
    {
      label: "신고 대기",
      value: stats?.pending_reports ?? 0,
      color: "text-red-500",
    },
  ];

  return (
    <div>
      <h1 className="mb-6 text-xl font-bold">대시보드</h1>

      <div className="mb-8 grid grid-cols-4 gap-4">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-[#2a2a2a] bg-[#141414] p-4"
          >
            <div className="mb-2 text-xs text-[#a0a0a0]">{card.label}</div>
            <div className={`text-2xl font-bold ${card.color}`}>
              {card.value.toLocaleString()}
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <Link
          href="/admin/reports"
          className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-2 text-sm text-red-500 transition-colors hover:bg-red-500/20"
        >
          {"신고 관리 ->"}
        </Link>
        <Link
          href="/admin/posts"
          className="rounded-lg border border-[#2a2a2a] bg-[#1e1e1e] px-4 py-2 text-sm text-[#a0a0a0] transition-colors hover:text-white"
        >
          {"게시글 관리 ->"}
        </Link>
      </div>
    </div>
  );
}
