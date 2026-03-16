"use client";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { AdminReport } from "@/types";

const STATUS_FILTERS = [
  { value: "pending", label: "대기" },
  { value: "reviewed", label: "처리완료" },
  { value: "dismissed", label: "무혐의" },
  { value: "all", label: "전체" },
];

const REASON_LABELS: Record<string, string> = {
  abuse: "욕설/비방",
  adult: "성인 콘텐츠",
  spam: "스팸",
  other: "기타",
};

type ReviewAction = "reviewed" | "dismissed";

type ReviewReportResponse = {
  success: boolean;
};

interface Props {
  reports: AdminReport[];
  total: number;
  status: string;
  page: number;
}

export function AdminReportsClient({
  reports: initialReports,
  total,
  status,
  page,
}: Props) {
  const [reports, setReports] = useState(initialReports);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleReview = async (
    reportId: string,
    action: ReviewAction,
    hideTarget: boolean
  ) => {
    setLoadingId(reportId);

    const supabase = createClient();
    const adminSupabase = supabase as typeof supabase & {
      rpc: (
        fn: string,
        args?: Record<string, unknown>
      ) => Promise<{ data: unknown; error: { message: string } | null }>;
    };
    const { data } = await adminSupabase.rpc("admin_review_report", {
      p_report_id: reportId,
      p_action: action,
      p_hide_target: hideTarget,
    });

    setLoadingId(null);

    const response = data as ReviewReportResponse | null;

    if (!response?.success) {
      return;
    }

    setReports((prev) =>
      prev.map((report) =>
        report.id === reportId ? { ...report, status: action } : report
      )
    );
  };

  const totalPages = Math.ceil(total / 20);

  return (
    <div>
      <div className="mb-4 flex gap-2">
        {STATUS_FILTERS.map((item) => (
          <Link
            key={item.value}
            href={`/admin/reports?status=${item.value}`}
            className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
              status === item.value
                ? "border-red-500/30 bg-red-500/20 text-red-400"
                : "border-[#2a2a2a] bg-[#141414] text-[#a0a0a0] hover:text-white"
            }`}
          >
            {item.label}
          </Link>
        ))}
        <span className="ml-auto self-center text-xs text-[#a0a0a0]">
          총 {total.toLocaleString()}건
        </span>
      </div>

      <div className="space-y-3">
        {reports.length === 0 ? (
          <div className="rounded-xl border border-[#2a2a2a] bg-[#141414] p-8 text-center text-[#a0a0a0]">
            신고 없음
          </div>
        ) : (
          reports.map((report) => (
            <div
              key={report.id}
              className="rounded-xl border border-[#2a2a2a] bg-[#141414] p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="rounded bg-[#2a2a2a] px-2 py-0.5 text-xs text-[#a0a0a0]">
                      {report.target_type === "post" ? "게시글" : "댓글"}
                    </span>
                    <span className="text-xs text-red-400">
                      {REASON_LABELS[report.reason] ?? report.reason}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        report.status === "pending"
                          ? "bg-yellow-500/20 text-yellow-400"
                          : report.status === "reviewed"
                            ? "bg-green-500/20 text-green-500"
                            : "bg-[#2a2a2a] text-[#a0a0a0]"
                      }`}
                    >
                      {report.status === "pending"
                        ? "대기"
                        : report.status === "reviewed"
                          ? "처리완료"
                          : "무혐의"}
                    </span>
                  </div>
                  {report.target_preview ? (
                    <p className="mb-1 line-clamp-2 text-sm text-white">
                      {report.target_preview}
                    </p>
                  ) : null}
                  {report.detail ? (
                    <p className="text-xs text-[#a0a0a0]">사유: {report.detail}</p>
                  ) : null}
                  <p className="mt-1 text-xs text-[#a0a0a0]">
                    신고자: {report.reporter_nickname} ·{" "}
                    {new Date(report.created_at).toLocaleString("ko-KR")}
                  </p>
                </div>

                {report.status === "pending" ? (
                  <div className="shrink-0 flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleReview(report.id, "reviewed", true)}
                      disabled={loadingId === report.id}
                      className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-xs text-red-400 transition-colors hover:bg-red-500/20 disabled:opacity-50"
                    >
                      조치+숨김
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReview(report.id, "reviewed", false)}
                      disabled={loadingId === report.id}
                      className="rounded-lg border border-green-500/20 bg-green-500/10 px-3 py-1.5 text-xs text-green-500 transition-colors hover:bg-green-500/20 disabled:opacity-50"
                    >
                      조치완료
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReview(report.id, "dismissed", false)}
                      disabled={loadingId === report.id}
                      className="rounded-lg border border-[#2a2a2a] bg-[#1e1e1e] px-3 py-1.5 text-xs text-[#a0a0a0] transition-colors hover:text-white disabled:opacity-50"
                    >
                      무혐의
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          ))
        )}
      </div>

      {totalPages > 1 ? (
        <div className="mt-4 flex justify-center gap-2">
          {Array.from({ length: Math.min(totalPages, 10) }, (_, index) => index + 1).map(
            (value) => (
              <Link
                key={value}
                href={`/admin/reports?status=${status}&page=${value}`}
                className={`flex h-8 w-8 items-center justify-center rounded text-sm transition-colors ${
                  value === page
                    ? "bg-red-500 text-white"
                    : "border border-[#2a2a2a] bg-[#141414] text-[#a0a0a0] hover:text-white"
                }`}
              >
                {value}
              </Link>
            )
          )}
        </div>
      ) : null}
    </div>
  );
}
