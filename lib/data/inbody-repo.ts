import { withTimeout } from "../supabase/admin";
import { createClient as createServerSupabase } from "../supabase/server";
import { getCurrentTeamId } from "../supabase/team";

export interface InbodyRow {
  date: string;
  weightKg: number;
  muscleMassKg: number;
  fatMassKg: number;
  fatPct: number;
}

export interface InbodyEntry {
  playerId: string;
  weightKg: number | null;
  muscleMassKg: number | null;
  fatMassKg: number | null;
  fatPct: number | null;
}

// 測定日を1つ指定し、その日の全選手分をまとめて直接入力する(CSV取込みが使えない不定形の
// スプレッドシートからでも、値を見ながら人力で転記できるようにするための経路)。
// 4項目とも空の行は保存しない(未測定として扱う)。同一date+player_idの再入力は上書き(冪等)。
export async function saveInbodyEntries(date: string, entries: InbodyEntry[]): Promise<void> {
  const rows = entries.filter(
    (e) => e.weightKg !== null || e.muscleMassKg !== null || e.fatMassKg !== null || e.fatPct !== null
  );
  if (rows.length === 0) return;

  const teamId = await getCurrentTeamId();
  if (!teamId) throw new Error("チーム情報が見つかりません(Supabaseに接続できない可能性があります)。");
  // 個人の身体データ(体重・体脂肪率等)のため、ログイン中ユーザーのセッションでアクセスしRLSにも判定させる。
  const supabase = await createServerSupabase();

  const { error } = await withTimeout(
    supabase.from("inbody").upsert(
      rows.map((e) => ({
        team_id: teamId,
        player_id: e.playerId,
        date,
        weight_kg: e.weightKg,
        muscle_mass_kg: e.muscleMassKg,
        fat_mass_kg: e.fatMassKg,
        fat_pct: e.fatPct,
        source: "app",
      })),
      { onConflict: "team_id,player_id,date" }
    )
  );
  if (error) throw new Error(error.message);
}

// 直近6回分(取込み日降順)。null = Supabase未接続/エラー(呼び出し側で空扱いにする)。
export async function getInbodyHistory(playerId: string, limit = 6): Promise<InbodyRow[] | null> {
  try {
    const teamId = await getCurrentTeamId();
    if (!teamId) return null;
    const supabase = await createServerSupabase();
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
