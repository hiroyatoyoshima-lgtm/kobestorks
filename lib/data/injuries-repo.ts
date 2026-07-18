import { createAdminClient } from "../supabase/admin";
import { getDefaultTeamId } from "../supabase/team";
import { INJURIES as SEED_INJURIES, CARE_LOGS as SEED_CARE_LOGS } from "./seed";
import type { CareLog, Injury, InjuryStatus } from "../types";

export interface InjuriesPageData {
  injuries: Injury[];
  careLogs: CareLog[];
  source: "supabase" | "seed";
}

// Supabase接続がまだ・未設定・エラー時はダミーデータにフォールバックし、アプリを壊さない(§11の差替え可能設計)。
export async function getInjuriesPageData(dateIso: string): Promise<InjuriesPageData> {
  try {
    const teamId = await getDefaultTeamId();
    if (!teamId) throw new Error("team not found");
    const supabase = createAdminClient();

    const [injuriesRes, careRes] = await Promise.all([
      supabase.from("injuries").select("*").eq("team_id", teamId),
      supabase.from("care_log").select("*").eq("team_id", teamId).eq("date", dateIso),
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
    return { injuries: SEED_INJURIES, careLogs: SEED_CARE_LOGS, source: "seed" };
  }
}
