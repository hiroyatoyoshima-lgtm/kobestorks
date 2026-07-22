import { createAdminClient, withTimeout } from "../supabase/admin";
import { getDefaultTeamId } from "../supabase/team";

export interface WellnessRow {
  playerId: string;
  date: string;
  sleepHours: number;
  sleepQuality: number;
  fatigue: number;
  soreness: number;
  stress: number;
  rpe: number | null;
  painFlag: boolean;
  comment: string;
}

interface WellnessDb {
  player_id: string;
  date: string;
  sleep_hours: number;
  sleep_quality: number;
  fatigue: number;
  soreness: number;
  stress: number;
  rpe: number | null;
  pain_flag: boolean;
  comment: string | null;
}

function toRow(r: WellnessDb): WellnessRow {
  return {
    playerId: r.player_id,
    date: r.date,
    sleepHours: r.sleep_hours,
    sleepQuality: r.sleep_quality,
    fatigue: r.fatigue,
    soreness: r.soreness,
    stress: r.stress,
    rpe: r.rpe ?? null,
    painFlag: r.pain_flag,
    comment: r.comment ?? "",
  };
}

// 4項目(睡眠の質・疲労・筋肉痛・ストレス)の平均。全項目「5=良い」に正規化済み(§4.4)なので単純平均でよい。
export function compositeScore(w: WellnessRow): number {
  return +((w.sleepQuality + w.fatigue + w.soreness + w.stress) / 4).toFixed(2);
}

// Supabase未接続・エラー時は null を返す(呼び出し側でダミー生成にフォールバックする)。
// 接続できていて単に回答が無い日は空のMap/配列を返す(0件も「本当の値」として扱う)。

// 指定日、チーム全員分(選手ごとに最大1件)
export async function getTeamWellnessForDate(date: string): Promise<Map<string, WellnessRow> | null> {
  try {
    const teamId = await getDefaultTeamId();
    if (!teamId) return null;
    const supabase = createAdminClient();
    const { data, error } = await withTimeout(
      supabase.from("wellness").select("*").eq("team_id", teamId).eq("date", date)
    );
    if (error) return null;
    const map = new Map<string, WellnessRow>();
    for (const r of (data ?? []) as WellnessDb[]) map.set(r.player_id, toRow(r));
    return map;
  } catch {
    return null;
  }
}

// 指定期間、チーム全員分をまとめて取得し日付でグルーピング(ダッシュボードの14日推移グラフ用)
export async function getTeamWellnessRange(
  startDate: string,
  endDate: string
): Promise<Map<string, WellnessRow[]> | null> {
  try {
    const teamId = await getDefaultTeamId();
    if (!teamId) return null;
    const supabase = createAdminClient();
    const { data, error } = await withTimeout(
      supabase
        .from("wellness")
        .select("*")
        .eq("team_id", teamId)
        .gte("date", startDate)
        .lte("date", endDate)
    );
    if (error) return null;
    const map = new Map<string, WellnessRow[]>();
    for (const r of (data ?? []) as WellnessDb[]) {
      const row = toRow(r);
      const list = map.get(row.date) ?? [];
      list.push(row);
      map.set(row.date, list);
    }
    return map;
  } catch {
    return null;
  }
}

// 指定選手、指定期間分(選手ページの14日推移グラフ用)
export async function getPlayerWellnessRange(
  playerId: string,
  startDate: string,
  endDate: string
): Promise<Map<string, WellnessRow> | null> {
  try {
    const teamId = await getDefaultTeamId();
    if (!teamId) return null;
    const supabase = createAdminClient();
    const { data, error } = await withTimeout(
      supabase
        .from("wellness")
        .select("*")
        .eq("team_id", teamId)
        .eq("player_id", playerId)
        .gte("date", startDate)
        .lte("date", endDate)
    );
    if (error) return null;
    const map = new Map<string, WellnessRow>();
    for (const r of (data ?? []) as WellnessDb[]) map.set(r.date, toRow(r));
    return map;
  } catch {
    return null;
  }
}
