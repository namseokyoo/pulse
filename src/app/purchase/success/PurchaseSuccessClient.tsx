"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function PurchaseSuccessClient({ userId }: { userId: string }) {
  const router = useRouter();
  const supabase = createClient();
  const [status, setStatus] = useState<"loading" | "success" | "timeout">(
    "loading"
  );
  const [currentFree, setCurrentFree] = useState(0);
  const [currentPaid, setCurrentPaid] = useState(0);
  const [addedAmount, setAddedAmount] = useState(0);

  // initialPaid를 ref로 관리 (stale closure 방지)
  const initialPaidRef = useRef<number | null>(null);
  const attemptsRef = useRef(0);
  const statusRef = useRef<"loading" | "success" | "timeout">("loading");

  useEffect(() => {
    const maxAttempts = 15; // 2초 * 15 = 30초

    const fetchBalance = async () => {
      if (statusRef.current !== "loading") return;

      const { data } = await supabase
        .from("profiles")
        .select("free_votes, paid_votes")
        .eq("id", userId)
        .single();

      if (!data) return;

      setCurrentFree(data.free_votes);
      setCurrentPaid(data.paid_votes);

      if (initialPaidRef.current === null) {
        initialPaidRef.current = data.paid_votes;
        return;
      }

      if (data.paid_votes > initialPaidRef.current) {
        setAddedAmount(data.paid_votes - initialPaidRef.current);
        statusRef.current = "success";
        setStatus("success");
        return;
      }

      attemptsRef.current += 1;
      if (attemptsRef.current >= maxAttempts) {
        statusRef.current = "timeout";
        setStatus("timeout");
      }
    };

    fetchBalance();
    const interval = setInterval(fetchBalance, 2000);

    return () => clearInterval(interval);
  }, [userId, supabase]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4">
        <div className="w-16 h-16 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin mb-6" />
        <p className="text-[18px] font-semibold text-[var(--color-text-primary)] mb-2">
          결제를 확인하고 있습니다...
        </p>
        <p className="text-[14px] text-[var(--color-text-muted)]">
          잠시만 기다려주세요
        </p>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4">
        <div className="text-[72px] mb-4 animate-bounce">🎉</div>
        <h1 className="text-[28px] font-bold text-[var(--color-text-primary)] mb-2">
          충전 완료!
        </h1>
        <p className="text-[16px] text-[var(--color-text-muted)] mb-8">
          유료 투표권{" "}
          <span className="text-[var(--color-primary)] font-bold">
            {addedAmount}개
          </span>
          가 추가되었습니다
        </p>
        <div className="w-full max-w-xs p-4 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] mb-8">
          <p className="text-[13px] text-[var(--color-text-muted)] mb-2">
            현재 잔액
          </p>
          <p className="text-[15px] text-[var(--color-text-primary)]">
            무료 <span className="font-semibold">{currentFree}개</span>
            <span className="mx-2 text-[var(--color-border)]">+</span>
            유료{" "}
            <span className="font-semibold text-[var(--color-primary)]">
              {currentPaid}개
            </span>
          </p>
        </div>
        <button
          onClick={() => router.push("/")}
          className="w-full max-w-xs py-4 rounded-xl bg-[var(--color-primary)] text-white text-[16px] font-semibold hover:opacity-90 active:scale-95 transition-all mb-4"
        >
          피드로 돌아가기
        </button>
        <button
          onClick={() => router.push("/profile")}
          className="text-[14px] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
        >
          구매 내역 보기
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="text-[72px] mb-4">✅</div>
      <h1 className="text-[28px] font-bold text-[var(--color-text-primary)] mb-2">
        결제가 완료되었습니다
      </h1>
      <p className="text-[16px] text-[var(--color-text-muted)] mb-8">
        투표권이 곧 충전됩니다
      </p>
      <div className="w-full max-w-xs p-4 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] mb-8">
        <p className="text-[13px] text-[var(--color-text-muted)] mb-2">
          현재 잔액
        </p>
        <p className="text-[15px] text-[var(--color-text-primary)]">
          무료 <span className="font-semibold">{currentFree}개</span>
          <span className="mx-2 text-[var(--color-border)]">+</span>
          유료{" "}
          <span className="font-semibold text-[var(--color-primary)]">
            {currentPaid}개
          </span>
        </p>
      </div>
      <button
        onClick={() => router.push("/")}
        className="w-full max-w-xs py-4 rounded-xl bg-[var(--color-primary)] text-white text-[16px] font-semibold hover:opacity-90 active:scale-95 transition-all"
      >
        피드로 돌아가기
      </button>
    </div>
  );
}
