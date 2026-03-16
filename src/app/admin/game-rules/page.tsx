import type { Database, GameRulesHistory } from "@/types";
import { createClient } from "@/lib/supabase/server";
import { GameRulesClient } from "./GameRulesClient";

export const dynamic = "force-dynamic";

type GameRulesRow = Database["public"]["Tables"]["game_rules"]["Row"];

export default async function GameRulesPage() {
  const supabase = await createClient();

  const [{ data: rules }, { data: history }] = await Promise.all([
    supabase.from("game_rules").select("*").single(),
    supabase
      .from("game_rules_history")
      .select("*")
      .order("changed_at", { ascending: false })
      .limit(20),
  ]);

  return (
    <div>
      <h1 className="mb-6 text-xl font-bold">게임 설정</h1>
      <GameRulesClient
        rules={(rules as GameRulesRow | null) ?? null}
        history={(history as GameRulesHistory[] | null) ?? []}
      />
    </div>
  );
}
