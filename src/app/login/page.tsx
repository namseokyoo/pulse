import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { LoginClient } from "./LoginClient";
import type { Database, GameRules } from "@/types";

type GameRulesRow = Database["public"]["Tables"]["game_rules"]["Row"];

export default async function LoginPage() {
  const supabase = await createClient();
  const [
    { data: { user } },
    { data: gameRulesData },
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from("game_rules")
      .select("vote_time_change_minutes, daily_free_votes, initial_ttl_minutes")
      .eq("id", true)
      .single(),
  ]);

  const rules = gameRulesData as GameRulesRow | null;

  const gameRules: GameRules = {
    voteTimeChangeMinutes: rules?.vote_time_change_minutes ?? 10,
    dailyFreeVotes: rules?.daily_free_votes ?? 10,
    initialTtlMinutes: rules?.initial_ttl_minutes ?? 360,
  };

  if (user) {
    redirect("/");
  }

  return <LoginClient gameRules={gameRules} />;
}
