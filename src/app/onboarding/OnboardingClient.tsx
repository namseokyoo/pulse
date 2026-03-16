"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Database, GameRules } from "@/types";

interface OnboardingClientProps {
  gameRules: GameRules;
}

function formatMinutes(minutes: number): string {
  if (minutes >= 60 && minutes % 60 === 0) return `${minutes / 60}시간`;
  if (minutes >= 60) return `${Math.floor(minutes / 60)}시간 ${minutes % 60}분`;
  return `${minutes}분`;
}

function CheckboxItem({
  checked,
  onToggle,
  children,
}: {
  checked: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <label className="flex items-center gap-3 cursor-pointer">
      <div
        onClick={onToggle}
        className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 border transition-colors cursor-pointer ${
          checked
            ? "bg-[var(--color-primary)] border-[var(--color-primary)]"
            : "border-[var(--color-border)] bg-transparent"
        }`}
        role="checkbox"
        aria-checked={checked}
        tabIndex={0}
        onKeyDown={(e) => e.key === " " && onToggle()}
      >
        {checked && (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path
              d="M2 6l3 3 5-5"
              stroke="white"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </div>
      <span className="text-[13px] text-[var(--color-text-secondary)]">
        {children}
      </span>
    </label>
  );
}

export function OnboardingClient({ gameRules }: OnboardingClientProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [agreements, setAgreements] = useState({
    terms: false,
    privacy: false,
    age: false,
  });
  const supabase = createClient();

  const allAgreed = agreements.terms && agreements.privacy && agreements.age;

  const handleAllAgree = (checked: boolean) => {
    setAgreements({ terms: checked, privacy: checked, age: checked });
  };

  const handleSingleAgree = (
    key: keyof typeof agreements,
    checked: boolean,
  ) => {
    setAgreements((prev) => ({ ...prev, [key]: checked }));
  };

  const handleStart = async () => {
    if (!allAgreed || isLoading) return;
    setIsLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }

    const consentUpdate: Database["public"]["Tables"]["profiles"]["Update"] = {
      consented_at: new Date().toISOString(),
    };

    const profilesTable = supabase.from("profiles") as any;
    const { error } = await profilesTable
      .update(consentUpdate)
      .eq("id", user.id);

    if (error) {
      console.error("Consent update error:", error);
      setIsLoading(false);
      return;
    }

    router.push("/");
  };

  return (
    <div className="min-h-screen bg-[var(--color-background)] flex flex-col items-center justify-between py-12 px-4">
      {/* 상단: 환영 영역 */}
      <div className="flex flex-col items-center justify-center flex-1 gap-6 w-full max-w-sm">
        {/* PULSE 로고 */}
        <h1 className="text-[36px] font-bold tracking-[0.2em] text-[var(--color-text-primary)]">
          PULSE
        </h1>

        {/* 환영 메시지 */}
        <p className="text-[18px] font-semibold text-[var(--color-text-primary)] text-center">
          Pulse에 오신 것을 환영합니다
        </p>

        {/* 서비스 소개 */}
        <div className="w-full bg-[var(--color-surface)] rounded-xl p-4 border border-[var(--color-border)] space-y-2">
          <p className="text-[13px] text-[var(--color-text-secondary)]">
            모든 글은{" "}
            <span className="text-[var(--color-text-primary)] font-medium">
              {formatMinutes(gameRules.initialTtlMinutes)}
            </span>
            의 생명력을 갖고 태어납니다
          </p>
          <p className="text-[13px] text-[var(--color-text-secondary)]">
            좋아요는{" "}
            <span className="text-[var(--color-text-primary)] font-medium">
              +{gameRules.voteTimeChangeMinutes}분
            </span>
            , 싫어요는{" "}
            <span className="text-[var(--color-text-primary)] font-medium">
              -{gameRules.voteTimeChangeMinutes}분
            </span>
            의 생명력을 변화시킵니다
          </p>
          <p className="text-[13px] text-[var(--color-text-secondary)]">
            매일 정오에 투표권{" "}
            <span className="text-[var(--color-text-primary)] font-medium">
              {gameRules.dailyFreeVotes}개
            </span>
            가 충전됩니다
          </p>
        </div>

        {/* 동의 체크박스 */}
        <div className="w-full bg-[var(--color-surface)] rounded-xl p-4 border border-[var(--color-border)] space-y-3">
          {/* 전체 동의 */}
          <CheckboxItem
            checked={allAgreed}
            onToggle={() => handleAllAgree(!allAgreed)}
          >
            <span className="text-[14px] font-semibold text-[var(--color-text-primary)]">
              전체 동의
            </span>
          </CheckboxItem>

          <div className="border-t border-[var(--color-border)]" />

          {/* 이용약관 */}
          <CheckboxItem
            checked={agreements.terms}
            onToggle={() => handleSingleAgree("terms", !agreements.terms)}
          >
            <span className="text-[var(--color-primary)] font-medium">[필수]</span>{" "}
            <Link
              href="/terms"
              className="underline hover:text-[var(--color-text-primary)] transition-colors"
            >
              이용약관
            </Link>
            에 동의합니다
          </CheckboxItem>

          {/* 개인정보처리방침 */}
          <CheckboxItem
            checked={agreements.privacy}
            onToggle={() => handleSingleAgree("privacy", !agreements.privacy)}
          >
            <span className="text-[var(--color-primary)] font-medium">[필수]</span>{" "}
            <Link
              href="/privacy"
              className="underline hover:text-[var(--color-text-primary)] transition-colors"
            >
              개인정보처리방침
            </Link>
            에 동의합니다
          </CheckboxItem>

          {/* 나이 확인 */}
          <CheckboxItem
            checked={agreements.age}
            onToggle={() => handleSingleAgree("age", !agreements.age)}
          >
            <span className="text-[var(--color-primary)] font-medium">[필수]</span>{" "}
            만 14세 이상입니다
          </CheckboxItem>
        </div>

        {/* 시작하기 버튼 */}
        <button
          onClick={handleStart}
          disabled={!allAgreed || isLoading}
          className="w-full flex items-center justify-center py-4 px-6 rounded-2xl bg-[var(--color-primary)] text-white text-[16px] font-semibold transition-opacity active:scale-95 disabled:opacity-40"
        >
          {isLoading ? "처리 중..." : "시작하기"}
        </button>
      </div>

      {/* 최하단 문구 */}
      <p className="text-[13px] text-[var(--color-text-muted)] mt-6">
        {`모든 글은 태어날 때부터 ${formatMinutes(gameRules.initialTtlMinutes)}의 생명력을 가집니다`}
      </p>
    </div>
  );
}
