import { createAdminClient, withTimeout } from "../supabase/admin";
import { getDefaultTeamId } from "../supabase/team";
import type { CareLog, Injury, InjuryStatus } from "../types";

export interface InjuriesPageData {
  injuries: Injury[];
  careLogs: CareLog[];
  source: "supabase" | "seed";
}

// Supabase接続がまだ・未設定・エラー時は空データを返す(ダミーは出さない)。
export async function getInjuriesPageData(dateIso: string): Promise<InjuriesPageData> {
  try {
    const teamId = await getDefaultTeamId();
    if (!teamId) throw new Error("team not found");
    const supabase = createAdminClient();

    // 復帰日(return_date)が入っている=治療完了した怪我は一覧に出さない(player.statusの導出と揃える)。
    const [injuriesRes, careRes] = await Promise.all([
      withTimeout(supabase.from("injuries").select("*").eq("team_id", teamId).is("return_date", null)),
      withTimeout(supabase.from("care_log").select("*").eq("team_id", teamId).eq("date", dateIso)),
    ]);
    if (injuriesRes.error) throw injuriesRes.error;
    if (careRes.error) throw careRes.error;

    const injuries: Injury[] = (injuriesRes.data ?? []).map((r) => ({
      injuryId: r.injury_id,
      playerId: r.player_id,
      diagnosis: r.diagnosis,
      bodyPart: r.body_part,
      side: r.side ?? undefined,
      onsetDate: r.onset_date,
      mechanism: r.mechanism,
      status: r.status as InjuryStatus,
      rtpPhase: r.rtp_phase,
      rtpTargetDate: r.rtp_target_date ?? undefined,
      returnDate: r.return_date ?? undefined,
      note: r.note ?? undefined,
      updatedBy: r.updated_by,
    }));

    const careLogs: CareLog[] = (careRes.data ?? []).map((r) => ({
      careId: r.care_id,
      date: r.date,
      time: r.time,
      playerId: r.player_id,
      menu: r.menu,
      staff: r.staff,
      done: r.done,
      note: r.note ?? undefined,
    }));

    return { injuries, careLogs, source: "supabase" };
  } catch {
    return { injuries: [], careLogs: [], source: "seed" };
  }
}

export interface CareCalendarEntry {
  menu: string;
  staff: string;
  done: boolean;
}

// playerId -> date(YYYY-MM-DD) -> その日のケア内容一覧
export type CareCalendarMap = Map<string, Map<string, CareCalendarEntry[]>>;

// 指定選手たちの、指定期間分のケア記録をまとめて取得(選手別カレンダー表示用)。
// Supabase未接続時は null を返し、呼び出し側でカレンダー自体を非表示にする。
export async function getCareCalendar(
  playerIds: string[],
  startDate: string,
  endDate: string
): Promise<CareCalendarMap | null> {
  if (playerIds.length === 0) return new Map();
  try {
    const teamId = await getDefaultTeamId();
    if (!teamId) return null;
    const supabase = createAdminClient();
    const { data, error } = await withTimeout(
      supabase
        .from("care_log")
        .select("*")
        .eq("team_id", teamId)
        .in("player_id", playerIds)
        .gte("date", startDate)
        .lte("date", endDate)
    );
    if (error) return null;

    const map: CareCalendarMap = new Map();
    for (const r of data ?? []) {
      const byDate = map.get(r.player_id) ?? new Map<string, CareCalendarEntry[]>();
      const entries = byDate.get(r.date) ?? [];
      entries.push({ menu: r.menu ?? "", staff: r.staff ?? "", done: !!r.done });
      byDate.set(r.date, entries);
      map.set(r.player_id, byDate);
    }
    return map;
  } catch {
    return null;
  }
}
