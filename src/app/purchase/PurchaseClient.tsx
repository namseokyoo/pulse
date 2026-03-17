"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface Package {
  name: string;
  qty: number;
  price: number;
  pricePerUnit: number;
  variantId: string;
  badge?: string;
  badgeColor?: string;
}

const packages: Package[] = [
  {
    name: "스타터",
    qty: 10,
    price: 2000,
    pricePerUnit: 200,
    variantId: process.env.NEXT_PUBLIC_LS_VARIANT_10 || "",
  },
  {
    name: "인기",
    qty: 50,
    price: 9000,
    pricePerUnit: 180,
    variantId: process.env.NEXT_PUBLIC_LS_VARIANT_50 || "",
    badge: "인기",
    badgeColor: "bg-[var(--color-primary)]",
  },
  {
    name: "프로",
    qty: 100,
    price: 16000,
    pricePerUnit: 160,
    variantId: process.env.NEXT_PUBLIC_LS_VARIANT_100 || "",
    badge: "최고 가성비",
    badgeColor: "bg-[var(--color-like)]",
  },
];

export default function PurchaseClient({ userId }: { userId: string }) {
  const router = useRouter();
  const supabase = createClient();
  const [showSuccess, setShowSuccess] = useState(false);
  const [addedAmount, setAddedAmount] = useState(0);
  const [currentFree, setCurrentFree] = useState(0);
  const [currentPaid, setCurrentPaid] = useState(0);
  const [polling, setPolling] = useState(false);
  const paidBeforePurchaseRef = useRef<number | null>(null);
  const pollingRef = useRef(false);

  const checkBalance = useCallback(async () => {
    if (paidBeforePurchaseRef.current === null) return;
    if (pollingRef.current) return;
    pollingRef.current = true;
    setPolling(true);

    let attempts = 0;
    const maxAttempts = 15;

    const poll = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("free_votes, paid_votes")
        .eq("id", userId)
        .single();

      if (!data) {
        setPolling(false);
        pollingRef.current = false;
        paidBeforePurchaseRef.current = null;
        return;
      }

      setCurrentFree(data.free_votes);
      setCurrentPaid(data.paid_votes);

      if (data.paid_votes > paidBeforePurchaseRef.current!) {
        setAddedAmount(data.paid_votes - paidBeforePurchaseRef.current!);
        setShowSuccess(true);
        setPolling(false);
        pollingRef.current = false;
        paidBeforePurchaseRef.current = null;
        return;
      }

      attempts++;
      if (attempts < maxAttempts) {
        setTimeout(poll, 2000);
      } else {
        setPolling(false);
        pollingRef.current = false;
        paidBeforePurchaseRef.current = null;
      }
    };

    poll();
  }, [supabase, userId]);

  useEffect(() => {
    const handleVisibility = () => {
      if (
        document.visibilityState === "visible" &&
        paidBeforePurchaseRef.current !== null
      ) {
        checkBalance();
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibility);
  }, [checkBalance]);

  const handlePurchase = async (pkg: Package) => {
    const storeId = process.env.NEXT_PUBLIC_LS_STORE_ID;
    if (!storeId || !pkg.variantId) {
      alert("결제 준비 중입니다. 잠시 후 다시 시도해주세요.");
      return;
    }

    const { data } = await supabase
      .from("profiles")
      .select("paid_votes")
      .eq("id", userId)
      .single();

    if (data) {
      paidBeforePurchaseRef.current = data.paid_votes;
    }

    const checkoutUrl = `https://${storeId}.lemonsqueezy.com/checkout/buy/${pkg.variantId}?checkout[custom][profile_id]=${userId}&checkout[custom][product_type]=paid_votes&checkout[custom][product_qty]=${pkg.qty}`;
    window.open(checkoutUrl, "_blank");
  };

  return (
    <div className="mx-auto max-w-[680px] px-4 py-8">
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="text-[14px] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
        >
          ← 돌아가기
        </button>
      </div>

      <h1 className="text-[24px] font-bold text-[var(--color-text-primary)] mb-2">
        투표권 구매
      </h1>
      <p className="text-[14px] text-[var(--color-text-muted)] mb-8">
        유료 투표권은 소멸되지 않습니다. 무료 투표권 소진 후 자동 사용됩니다.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {packages.map((pkg) => (
          <div
            key={pkg.qty}
            className="relative rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 flex flex-col items-center"
          >
            {pkg.badge && (
              <span
                className={`absolute -top-3 px-3 py-1 rounded-full text-[12px] font-bold text-white ${pkg.badgeColor}`}
              >
                {pkg.badge}
              </span>
            )}
            <p className="text-[14px] text-[var(--color-text-muted)] mb-1">{pkg.name}</p>
            <p className="text-[36px] font-bold text-[var(--color-text-primary)] mb-1">
              {pkg.qty}개
            </p>
            <p className="text-[20px] font-semibold text-[var(--color-primary)] mb-1">
              {pkg.price.toLocaleString()}원
            </p>
            <p className="text-[13px] text-[var(--color-text-muted)] mb-4">
              개당 {pkg.pricePerUnit}원
            </p>
            <button
              onClick={() => handlePurchase(pkg)}
              className="w-full py-3 rounded-xl bg-[var(--color-primary)] text-white text-[14px] font-semibold transition-transform active:scale-95 hover:opacity-90"
            >
              구매하기
            </button>
          </div>
        ))}
      </div>

      <div className="mt-8 p-4 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]">
        <p className="text-[13px] text-[var(--color-text-muted)] leading-6">
          유료 투표권은 디지털 콘텐츠로, 구매 즉시 제공이 개시됩니다.
          제공 개시 후 청약철회가 제한될 수 있습니다 (전자상거래법 제17조).
          미사용 유료투표권은 고객센터를 통해 환불 요청 가능합니다.
        </p>
      </div>

      {polling && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-[var(--color-primary)] text-white text-center py-3 text-[14px] font-semibold animate-pulse">
          결제를 확인하고 있습니다...
        </div>
      )}

      {showSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] p-8 text-center">
            <div className="text-[64px] mb-4 animate-bounce">🎉</div>
            <h2 className="text-[24px] font-bold text-[var(--color-text-primary)] mb-2">
              충전 완료!
            </h2>
            <p className="text-[16px] text-[var(--color-text-muted)] mb-6">
              유료 투표권{" "}
              <span className="text-[var(--color-primary)] font-bold">
                {addedAmount}개
              </span>
              가 추가되었습니다
            </p>
            <div className="p-3 rounded-xl bg-[var(--color-background)] mb-6">
              <p className="text-[13px] text-[var(--color-text-muted)] mb-1">
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
              onClick={() => {
                setShowSuccess(false);
                router.push("/");
              }}
              className="w-full py-3 rounded-xl bg-[var(--color-primary)] text-white text-[14px] font-semibold hover:opacity-90 active:scale-95 transition-all"
            >
              피드로 돌아가기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
