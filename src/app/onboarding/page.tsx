import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { OnboardingClient } from "./OnboardingClient";
import type { Database, GameRules } from "@/types";

export const metadata: Metadata = {
  title: "시작하기",
  robots: { index: false, follow: false },
};

type GameRulesRow = Database["public"]["Tables"]["game_rules"]["Row"];

export default async function OnboardingPage() {
  const supabase = await createClient();
  const [
    {
      data: { user },
    },
    { data: gameRulesData },
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from("game_rules")
      .select("vote_time_change_minutes, daily_free_votes, initial_ttl_minutes")
      .eq("id", true)
      .single(),
  ]);

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("consented_at")
    .eq("id", user.id)
    .single();

  if (profile?.consented_at) {
    redirect("/");
  }

  const rules = gameRulesData as GameRulesRow | null;
  const gameRules: GameRules = {
    voteTimeChangeMinutes: rules?.vote_time_change_minutes ?? 10,
    dailyFreeVotes: rules?.daily_free_votes ?? 10,
    initialTtlMinutes: rules?.initial_ttl_minutes ?? 360,
  };

  return <OnboardingClient gameRules={gameRules} />;
}
