import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import PurchaseClient from "./PurchaseClient";

export const metadata: Metadata = {
  title: "투표권 구매",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function PurchasePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/purchase");
  }

  return <PurchaseClient userId={user.id} />;
}
