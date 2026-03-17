"use client";

import { useRouter } from "next/navigation";

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

  const handlePurchase = (pkg: Package) => {
    const storeId = process.env.NEXT_PUBLIC_LS_STORE_ID;
    if (!storeId || !pkg.variantId) {
      alert("결제 준비 중입니다. 잠시 후 다시 시도해주세요.");
      return;
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
    </div>
  );
}
