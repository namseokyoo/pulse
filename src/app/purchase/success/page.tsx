import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import PurchaseSuccessClient from "./PurchaseSuccessClient";

export const metadata: Metadata = {
  title: "결제 완료",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function PurchaseSuccessPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return <PurchaseSuccessClient userId={user.id} />;
}
