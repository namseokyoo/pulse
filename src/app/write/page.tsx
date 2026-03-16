import { createClient } from "@/lib/supabase/server";
import type { Database, GameRules } from "@/types";
import { WriteClient } from "./WriteClient";

type GameRulesRow = Database["public"]["Tables"]["game_rules"]["Row"];

export default async function WritePage() {
  const supabase = await createClient();
  const { data: gameRulesData } = await supabase
    .from("game_rules")
    .select("vote_time_change_minutes, daily_free_votes, initial_ttl_minutes")
    .eq("id", true)
    .single();

  const rules = gameRulesData as GameRulesRow | null;

  const gameRules: GameRules = {
    voteTimeChangeMinutes: rules?.vote_time_change_minutes ?? 10,
    dailyFreeVotes: rules?.daily_free_votes ?? 10,
    initialTtlMinutes: rules?.initial_ttl_minutes ?? 360,
  };

  return <WriteClient gameRules={gameRules} />;
}
