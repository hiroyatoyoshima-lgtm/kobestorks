import { createAdminClient, withTimeout } from "../supabase/admin";
import { getDefaultTeamId } from "../supabase/team";

export interface InbodyRow {
  date: string;
  weightKg: number;
  muscleMassKg: number;
  fatMassKg: number;
  fatPct: number;
}

// 直近6回分(取込み日降順)。null = Supabase未接続/エラー(呼び出し側でダミーにフォールバック)。
export async function getInbodyHistory(playerId: string, limit = 6): Promise<InbodyRow[] | null> {
  try {
    const teamId = await getDefaultTeamId();
    if (!teamId) return null;
    const supabase = createAdminClient();
    const { data, error } = await withTimeout(
      supabase
        .from("inbody")
        .select("*")
        .eq("team_id", teamId)
        .eq("player_id", playerId)
        .order("date", { ascending: false })
        .limit(limit)
    );
    if (error) return null;

    return (data ?? [])
      .map((r) => ({
        date: r.date as string,
        weightKg: r.weight_kg as number,
        muscleMassKg: r.muscle_mass_kg as number,
        fatMassKg: r.fat_mass_kg as number,
        fatPct: r.fat_pct as number,
      }))
      .reverse(); // 古い順に戻す(グラフの左→右が時系列順になるように)
  } catch {
    return null;
  }
}
