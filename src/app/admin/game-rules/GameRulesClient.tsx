"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Database, GameRulesHistory } from "@/types";

type GameRulesRow = Database["public"]["Tables"]["game_rules"]["Row"];

type GameRulesForm = {
  vote_time_change_minutes: number;
  daily_free_votes: number;
  reset_eligibility_hours: number;
  initial_ttl_minutes: number;
  report_hide_threshold: number;
  change_reason: string;
  updated_at: string;
};

type MessageState = {
  type: "success" | "error";
  text: string;
};

type UpdateGameRulesResponse =
  | {
      success: true;
    }
  | {
      success: false;
      error?: string;
    };

interface Props {
  rules: GameRulesRow | null;
  history: GameRulesHistory[];
}

export function GameRulesClient({ rules, history }: Props) {
  const [form, setForm] = useState<GameRulesForm>({
    vote_time_change_minutes: rules?.vote_time_change_minutes ?? 10,
    daily_free_votes: rules?.daily_free_votes ?? 10,
    reset_eligibility_hours: rules?.reset_eligibility_hours ?? 20,
    initial_ttl_minutes: rules?.initial_ttl_minutes ?? 360,
    report_hide_threshold: rules?.report_hide_threshold ?? 10,
    change_reason: "",
    updated_at: rules?.updated_at ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<MessageState | null>(null);

  const handleSave = async () => {
    if (!form.change_reason.trim()) {
      setMessage({ type: "error", text: "변경 사유를 입력해주세요." });
      return;
    }

    setSaving(true);
    setMessage(null);

    const supabase = createClient();
    const adminSupabase = supabase as typeof supabase & {
      rpc: (
        fn: string,
        args?: Record<string, unknown>
      ) => Promise<{ data: unknown; error: { message: string } | null }>;
    };
    const { data, error } = await adminSupabase.rpc("admin_update_game_rules", {
      p_vote_time_change_minutes: form.vote_time_change_minutes,
      p_daily_free_votes: form.daily_free_votes,
      p_reset_eligibility_hours: form.reset_eligibility_hours,
      p_initial_ttl_minutes: form.initial_ttl_minutes,
      p_report_hide_threshold: form.report_hide_threshold,
      p_change_reason: form.change_reason,
    });

    setSaving(false);

    const response = data as UpdateGameRulesResponse | null;

    if (error || !response?.success) {
      setMessage({
        type: "error",
        text: `저장 실패: ${response && "error" in response ? response.error ?? "unknown" : error?.message ?? "unknown"}`,
      });
      return;
    }

    setMessage({ type: "success", text: "저장되었습니다." });
    setForm((prev) => ({ ...prev, change_reason: "" }));
  };

  const fields = [
    {
      key: "vote_time_change_minutes" as const,
      label: "투표 1회당 시간 변경 (분)",
      min: 1,
    },
    { key: "daily_free_votes" as const, label: "일일 무료 투표권", min: 0 },
    {
      key: "reset_eligibility_hours" as const,
      label: "리셋 자격 기준 (시간)",
      min: 1,
    },
    { key: "initial_ttl_minutes" as const, label: "초기 TTL (분)", min: 1 },
    {
      key: "report_hide_threshold" as const,
      label: "신고 자동숨김 기준 (건)",
      min: 1,
    },
  ];

  return (
    <div className="max-w-2xl space-y-6">
      <div className="space-y-4 rounded-xl border border-[#2a2a2a] bg-[#141414] p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[#a0a0a0]">
          현재 설정
        </h2>

        {fields.map((field) => (
          <div key={field.key} className="flex items-center gap-4">
            <label className="w-48 shrink-0 text-sm text-[#a0a0a0]">
              {field.label}
            </label>
            <input
              type="number"
              min={field.min}
              value={form[field.key]}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  [field.key]: Number.parseInt(event.target.value, 10) || 0,
                }))
              }
              className="w-28 rounded-lg border border-[#2a2a2a] bg-[#0a0a0a] px-3 py-1.5 text-sm text-white focus:border-red-500/50 focus:outline-none"
            />
          </div>
        ))}

        <div>
          <label className="mb-1 block text-sm text-[#a0a0a0]">
            변경 사유 (필수)
          </label>
          <input
            type="text"
            value={form.change_reason}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, change_reason: event.target.value }))
            }
            placeholder="변경 사유를 입력하세요..."
            className="w-full rounded-lg border border-[#2a2a2a] bg-[#0a0a0a] px-3 py-1.5 text-sm text-white placeholder-[#444] focus:border-red-500/50 focus:outline-none"
          />
        </div>

        {message ? (
          <div
            className={`text-sm ${message.type === "success" ? "text-green-500" : "text-red-400"}`}
          >
            {message.text}
          </div>
        ) : null}

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-600 disabled:opacity-50"
        >
          {saving ? "저장 중..." : "저장"}
        </button>
      </div>

      <div className="rounded-xl border border-[#2a2a2a] bg-[#141414] p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-[#a0a0a0]">
          변경 이력
        </h2>

        {history.length === 0 ? (
          <p className="text-sm text-[#a0a0a0]">이력 없음</p>
        ) : (
          <div className="space-y-3">
            {history.map((item) => (
              <div
                key={item.id}
                className="space-y-1 rounded-lg border border-[#2a2a2a] p-3 text-xs"
              >
                <div className="flex justify-between gap-4">
                  <span className="text-[#a0a0a0]">
                    {new Date(item.changed_at).toLocaleString("ko-KR")}
                  </span>
                  {item.change_reason ? (
                    <span className="text-white">{item.change_reason}</span>
                  ) : null}
                </div>
                <div className="text-[#a0a0a0]">
                  TTL {item.initial_ttl_minutes}분 / 투표권 {item.daily_free_votes}
                  개 / 투표당 {item.vote_time_change_minutes}분 / 신고기준{" "}
                  {item.report_hide_threshold ?? "-"}건
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
