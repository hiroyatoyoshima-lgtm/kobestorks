import { createAdminClient, withTimeout } from "../supabase/admin";
import { getDefaultTeamId } from "../supabase/team";
import { NUTRITION_TODAY as SEED_NUTRITION } from "./seed";
import type { NutritionReport, NutritionTiming } from "../types";

export interface NutritionPageData {
  reports: NutritionReport[];
  source: "supabase" | "seed";
}

// タイミングごとに最新の1件だけを「当日メニュー」として採用する(修正入力があれば新しい方を表示)。
export async function getNutritionPageData(dateIso: string): Promise<NutritionPageData> {
  try {
    const teamId = await getDefaultTeamId();
    if (!teamId) throw new Error("team not found");
    const supabase = createAdminClient();

    const { data, error } = await withTimeout(
      supabase
        .from("nutrition")
        .select("*")
        .eq("team_id", teamId)
        .eq("date", dateIso)
        .order("created_at", { ascending: false })
    );
    if (error) throw error;

    const latestByTiming = new Map<string, NutritionReport>();
    for (const r of data ?? []) {
      if (latestByTiming.has(r.timing)) continue;
      latestByTiming.set(r.timing, {
        date: r.date,
        timing: r.timing as NutritionTiming,
        menu: (r.menu ?? "").split("\n").filter(Boolean),
        kcal: r.kcal ?? 0,
        proteinG: r.protein_g ?? 0,
        fatG: r.fat_g ?? 0,
        carbG: r.carb_g ?? 0,
        playerNote: r.player_note ?? undefined,
        staff: r.staff ?? "",
      });
    }

    // 今日まだ何も入力されていない場合はサンプルを表示(Supabase自体には接続できている)
    if (latestByTiming.size === 0) {
      return { reports: SEED_NUTRITION, source: "seed" };
    }

    return { reports: [...latestByTiming.values()], source: "supabase" };
  } catch {
    return { reports: SEED_NUTRITION, source: "seed" };
  }
}
