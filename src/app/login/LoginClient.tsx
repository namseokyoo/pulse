"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function LoginClient() {
  const [isLoading, setIsLoading] = useState(false);
  const supabase = createClient();

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      console.error("Login error:", error);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-background)] flex flex-col items-center justify-between py-12 px-4">
      {/* 상단: ECG 로고 영역 */}
      <div className="flex flex-col items-center justify-center flex-1">
        {/* ECG 심박 라인 SVG */}
        <div className="mb-8 w-64 h-20 flex items-center justify-center">
          <svg
            viewBox="0 0 280 80"
            className="w-full h-full"
            aria-hidden="true"
            style={{ filter: "drop-shadow(0 0 12px rgba(255,68,68,0.5))" }}
          >
            <path
              className="ecg-line"
              d="M0,40 L60,40 L75,40 L85,10 L95,70 L105,40 L115,40 L130,15 L145,65 L155,40 L165,40 L175,25 L185,55 L195,40 L205,40 L220,40 L280,40"
              fill="none"
              stroke="#ff4444"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        {/* PULSE 로고 */}
        <h1 className="text-[48px] font-bold tracking-[0.2em] text-[var(--color-text-primary)] mb-3">
          PULSE
        </h1>

        {/* 태그라인 */}
        <p className="text-[16px] text-[var(--color-text-secondary)]">
          이 글은 아직 살아있다
        </p>
      </div>

      {/* 하단: 로그인 영역 */}
      <div className="w-full max-w-sm space-y-4">
        {/* Google 로그인 버튼 */}
        <button
          onClick={handleGoogleLogin}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-3 py-4 px-6 rounded-2xl bg-white text-[#1f1f1f] text-[16px] font-semibold transition-opacity active:scale-95 disabled:opacity-70"
          aria-label="Google로 시작하기"
        >
          {/* Google G 로고 */}
          <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          {isLoading ? "연결 중..." : "Google로 시작하기"}
        </button>

        {/* 안내 문구 */}
        <p className="text-[13px] text-[var(--color-text-muted)] text-center leading-6 border border-[var(--color-border)] rounded-xl p-3">
          익명으로 사라지는 글들이 아니라, 커뮤니티의 반응으로 맥박이 이어지는 게시판입니다.
        </p>
      </div>

      {/* 최하단 문구 */}
      <p className="text-[13px] text-[var(--color-text-muted)] mt-6">
        모든 글은 태어날 때부터 6시간의 생명력을 가집니다
      </p>
    </div>
  );
}
