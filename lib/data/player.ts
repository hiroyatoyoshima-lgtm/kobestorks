import { STATUS_LABEL } from "./seed";
import { last14Days, labelMD } from "./rng";
import type { Injury, InjuryStatus, Player } from "../types";
import { effectiveTotalAal } from "../calc";
import { compositeScore, getPlayerWellnessRange } from "./wellness-repo";
import { withTimeout } from "../supabase/admin";
import { createClient as createServerSupabase } from "../supabase/server";
import { getDefaultTeamId } from "../supabase/team";
import { getInbodyHistory } from "./inbody-repo";

// 復帰日(return_date)未確定=現在進行形の怪我のみを対象にする。過去に治った怪我は表示しない。
export async function getInjuryForPlayer(playerId: string): Promise<Injury | undefined> {
  try {
    const teamId = await getDefaultTeamId();
    if (!teamId) throw new Error("no team");
    // 要配慮情報のため、ログイン中ユーザーのセッションでアクセスしてRLSにも判定させる。
    const supabase = await createServerSupabase();
    const { data, error } = await withTimeout(
      supabase
        .from("injuries")
        .select("*")
        .eq("team_id", teamId)
        .eq("player_id", playerId)
        .is("return_date", null)
        .order("onset_date", { ascending: false })
        .limit(1)
        .maybeSingle()
    );
    if (error) throw error;
    if (!data) return undefined;
    return {
      injuryId: data.injury_id,
      playerId: data.player_id,
      diagnosis: data.diagnosis,
      bodyPart: data.body_part,
      side: data.side ?? undefined,
      onsetDate: data.onset_date,
      mechanism: data.mechanism,
      status: data.status as InjuryStatus,
      rtpPhase: data.rtp_phase,
      rtpTargetDate: data.rtp_target_date ?? undefined,
      returnDate: data.return_date ?? undefined,
      note: data.note ?? undefined,
      updatedBy: data.updated_by,
    };
  } catch {
    return undefined;
  }
}

export interface InbodyLatest {
  weightKg: number;
  muscleMassKg: number;
  fatMassKg: number;
  fatPct: number;
}

export interface InbodyTrendData {
  labels: string[];
  weightKg: number[];
  muscleMassKg: number[];
  fatPct: number[];
}

// InBody取込みの実測値があればそれを返す。無ければlatest/trendともnull(ダミー値は生成しない)。
export async function getInbodyData(
  player: Player
): Promise<{ latest: InbodyLatest | null; trend: InbodyTrendData | null; isReal: boolean; measuredDate?: string }> {
  const history = await getInbodyHistory(player.playerId);

  if (history && history.length > 0) {
    const latestRow = history[history.length - 1];
    return {
      latest: {
        weightKg: latestRow.weightKg,
        muscleMassKg: latestRow.muscleMassKg,
        fatMassKg: latestRow.fatMassKg,
        fatPct: latestRow.fatPct,
      },
      trend: {
        labels: history.map((h) => labelMD(h.date)),
        weightKg: history.map((h) => h.weightKg),
        muscleMassKg: history.map((h) => h.muscleMassKg),
        fatPct: history.map((h) => h.fatPct),
      },
      isReal: true,
      measuredDate: latestRow.date,
    };
  }

  return { latest: null, trend: null, isReal: false };
}

export async function aalTrend(player: Player, anchorDate: string) {
  const days = last14Days(anchorDate);
  return {
    labels: days.map(labelMD),
    // Kinexon取込み済みの日だけ実測値。未取込みの日はnull(グラフ上は欠測として表示)
    values: await Promise.all(days.map((d) => effectiveTotalAal(player, d))),
  };
}

export async function wellnessTrend(player: Player, anchorDate: string) {
  const days = last14Days(anchorDate);
  const real = await getPlayerWellnessRange(player.playerId, days[0], days[days.length - 1]);

  return {
    labels: days.map(labelMD),
    // 回答があった日だけ実測値(総合スコア=4項目平均)。無い日はnull
    values: days.map((d) => {
      const row = real?.get(d);
      return row ? compositeScore(row) : null;
    }),
  };
}

export interface HistoryRow {
  date: string;
  type: string;
  badge: string;
  content: string;
  by: string;
}

// care_log(ケア実施記録)+ wellness(コメント・痛み申告)の実データを日付降順でまとめる。
export async function careHistory(player: Player, limit = 8): Promise<HistoryRow[]> {
  try {
    const teamId = await getDefaultTeamId();
    if (!teamId) throw new Error("no team");
    const supabase = await createServerSupabase();

    const [careRes, wellnessRes] = await Promise.all([
      withTimeout(
        supabase
          .from("care_log")
          .select("*")
          .eq("team_id", teamId)
          .eq("player_id", player.playerId)
          .order("date", { ascending: false })
          .limit(limit)
      ),
      withTimeout(
        supabase
          .from("wellness")
          .select("*")
          .eq("team_id", teamId)
          .eq("player_id", player.playerId)
          .order("date", { ascending: false })
          .limit(limit)
      ),
    ]);
    if (careRes.error) throw careRes.error;
    if (wellnessRes.error) throw wellnessRes.error;

    type Dated = HistoryRow & { rawDate: string };

    const careRows: Dated[] = (careRes.data ?? []).map((r) => ({
      rawDate: r.date,
      date: labelMD(r.date),
      type: "ケア",
      badge: r.done ? "b-ok" : "b-soon",
      content: r.menu + (r.done ? "" : "(未実施)"),
      by: r.staff ?? "",
    }));

    const memoRows: Dated[] = (wellnessRes.data ?? [])
      .filter((r) => r.pain_flag || (r.comment && r.comment.trim() !== ""))
      .map((r) => ({
        rawDate: r.date,
        date: labelMD(r.date),
        type: r.pain_flag ? "痛み申告" : "メモ",
        badge: r.pain_flag ? "b-out" : "b-part",
        content: r.comment && r.comment.trim() !== "" ? r.comment : "(コメントなし)",
        by: "本人",
      }));

    return [...careRows, ...memoRows]
      .sort((a, b) => (a.rawDate < b.rawDate ? 1 : -1))
      .slice(0, limit)
      .map(({ rawDate: _rawDate, ...row }) => row);
  } catch {
    return [];
  }
}

export { STATUS_LABEL };
