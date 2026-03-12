"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils/format";
import type { ReportReason } from "@/types";

export interface ReportModalProps {
  isOpen: boolean;
  postId: string;
  onClose: () => void;
  onSubmit: (reason: ReportReason, detail?: string) => void;
}

const REPORT_OPTIONS: { value: ReportReason; label: string }[] = [
  { value: "abuse", label: "욕설/혐오" },
  { value: "adult", label: "음란" },
  { value: "spam", label: "스팸" },
  { value: "other", label: "기타" },
];

export function ReportModal({ isOpen, onClose, onSubmit }: ReportModalProps) {
  const [selected, setSelected] = useState<ReportReason | null>(null);
  const [detail, setDetail] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setMounted(true);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
      const timer = setTimeout(() => {
        setMounted(false);
        setSelected(null);
        setDetail("");
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!mounted) return null;

  const handleSubmit = () => {
    if (!selected) return;
    onSubmit(selected, selected === "other" ? detail : undefined);
    onClose();
  };

  return (
    <>
      {/* Overlay */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/60 transition-opacity duration-300",
          isOpen ? "opacity-100" : "opacity-0"
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Bottom Sheet */}
      <div
        className={cn(
          "fixed bottom-0 left-0 right-0 z-50 rounded-t-[28px] bg-[var(--color-surface)] shadow-[var(--shadow-modal)]",
          "transition-transform duration-300",
          isOpen ? "translate-y-0 animate-slide-up" : "translate-y-full"
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-modal-title"
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full bg-[var(--color-border)]" aria-hidden="true" />
        </div>

        <div className="px-4 pb-8">
          <h2 id="report-modal-title" className="text-[20px] font-semibold text-[var(--color-text-primary)] mb-6">
            신고하기
          </h2>

          {/* 사유 목록 */}
          <div className="space-y-3 mb-6">
            {REPORT_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-xl cursor-pointer border transition-colors",
                  selected === opt.value
                    ? "border-[var(--color-primary)] bg-[var(--color-primary-dim)]"
                    : "border-[var(--color-border)] bg-[var(--color-surface-elevated)]"
                )}
              >
                <div
                  className={cn(
                    "w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0",
                    selected === opt.value
                      ? "border-[var(--color-primary)]"
                      : "border-[var(--color-border)]"
                  )}
                >
                  {selected === opt.value && (
                    <div className="w-2.5 h-2.5 rounded-full bg-[var(--color-primary)] shadow-[0_0_6px_rgba(255,68,68,0.5)]" />
                  )}
                </div>
                <input
                  type="radio"
                  name="report-reason"
                  value={opt.value}
                  checked={selected === opt.value}
                  onChange={() => setSelected(opt.value)}
                  className="sr-only"
                />
                <span className="text-[14px] font-semibold text-[var(--color-text-primary)]">
                  {opt.label}
                </span>
              </label>
            ))}
          </div>

          {/* 기타 상세 입력 */}
          {selected === "other" && (
            <textarea
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              placeholder="상세 내용을 입력해주세요"
              rows={3}
              maxLength={200}
              className={cn(
                "w-full mb-6 p-3 rounded-xl bg-[var(--color-surface-elevated)] border border-[var(--color-border)]",
                "text-[14px] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]",
                "outline-none focus:border-[var(--color-primary)] resize-none"
              )}
            />
          )}

          {/* 제출 버튼 */}
          <button
            onClick={handleSubmit}
            disabled={!selected}
            className={cn(
              "w-full py-3 rounded-xl text-[14px] font-semibold transition-opacity",
              selected
                ? "bg-[var(--color-primary)] text-white"
                : "bg-[var(--color-surface-elevated)] text-[var(--color-text-muted)] cursor-not-allowed opacity-50"
            )}
          >
            신고 제출
          </button>
        </div>
      </div>
    </>
  );
}
