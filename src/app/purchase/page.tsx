// PAYMENT_SUSPENDED: 사업자 등록 후 복원
import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "투표권 구매",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default function PurchasePage() {
  redirect("/");
}
