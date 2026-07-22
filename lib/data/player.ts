import { INJURIES, STATUS_LABEL } from "./seed";
import { last14Days, labelMD, seededSeries } from "./rng";
import type { Injury, InjuryStatus, Player } from "../types";
import { effectiveTotalAal } from "../calc";
import { compositeScore, getPlayerWellnessRange } from "./wellness-repo";
import { createAdminClient, withTimeout } from "../supabase/admin";
import { getDefaultTeamId } from "../supabase/team";
import { getInbodyHistory } from "./inbody-repo";

// 復帰日(return_date)未確定=現在進行形の怪我のみを対象にする。過去に治った怪我は表示しない。
// Supabase未接続・エラー時はダミー3件のうち該当選手のものにフォールバック。
export async function getInjuryForPlayer(playerId: string): Promise<Injury | undefined> {
  try {
    const teamId = await getDefaultTeamId();
    if (!teamId) throw new Error("no team");
    const supabase = createAdminClient();
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
    return INJURIES.find((i) => i.playerId === playerId);
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

function dummyInbodyLatest(player: Player): InbodyLatest {
  const w = +(85 + ((player.no * 37) % 25)).toFixed(1);
  const fatPct = +(8 + ((player.no * 11) % 8)).toFixed(1);
  const fat = +((w * fatPct) / 100).toFixed(1);
  const smm = +((w - fat) * 0.56).toFixed(1);
  return { weightKg: w, muscleMassKg: smm, fatMassKg: fat, fatPct };
}

const IB_MONTHS = ["2月", "3月", "4月", "5月", "6月", "7月"];

function dummyInbodyTrend(b: InbodyLatest): InbodyTrendData {
  return {
    labels: IB_MONTHS,
    weightKg: IB_MONTHS.map((_, i) => +(b.weightKg - 1.5 + i * 0.3).toFixed(1)),
    muscleMassKg: IB_MONTHS.map((_, i) => +(b.muscleMassKg - 1 + i * 0.2).toFixed(1)),
    fatPct: IB_MONTHS.map((_, i) => +(b.fatPct + 1 - i * 0.15).toFixed(1)),
  };
}

// InBody取込み(CSV, §5.7と同じ思想)の実データがあればそれを、無ければダミーにフォールバック。
export async function getInbodyData(
  player: Player
): Promise<{ latest: InbodyLatest; trend: InbodyTrendData; isReal: boolean; measuredDate?: string }> {
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

  const latest = dummyInbodyLatest(player);
  return { latest, trend: dummyInbodyTrend(latest), isReal: false };
}

export async function aalTrend(player: Player, anchorDate: string) {
  const days = last14Days(anchorDate);
  return {
    labels: days.map(labelMD),
    // Kinexon取込み済みの日は実測値、未取込みの日はダミーで補完(§11の差替え可能設計)
    values: await Promise.all(days.map((d) => effectiveTotalAal(player, d))),
  };
}

export async function wellnessTrend(player: Player, anchorDate: string) {
  const days = last14Days(anchorDate);
  const real = await getPlayerWellnessRange(player.playerId, days[0], days[days.length - 1]);
  const dummy = seededSeries(player.no * 3, 34, 18, days).map((v) => +Math.min(5, Math.max(1, v / 10)).toFixed(1));

  return {
    labels: days.map(labelMD),
    // 実際にアンケートに回答があった日は実測値(総合スコア=4項目平均)、無い日はダミーで補完
    values: days.map((d, i) => {
      const row = real?.get(d);
      return row ? compositeScore(row) : dummy[i];
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

const SEED_HISTORY: HistoryRow[] = [
  { date: "7/15", type: "S&C", badge: "b-ok", content: "下肢筋力測定 実施。前回比+4%", by: "寺地" },
  { date: "7/12", type: "ケア", badge: "b-soon", content: "試合後リカバリー(交代浴+ストレッチ)", by: "ATトレーナー" },
  { date: "7/10", type: "メモ", badge: "b-part", content: "本人より疲労感の訴えあり。負荷10%減で対応", by: "寺地" },
];

// care_log(ケア実施記録)+ wellness(コメント・痛み申告)の実データを日付降順でまとめる。
// Supabase未接続・エラー時はダミー3件にフォールバック。
export async function careHistory(player: Player, limit = 8): Promise<HistoryRow[]> {
  try {
    const teamId = await getDefaultTeamId();
    if (!teamId) throw new Error("no team");
    const supabase = createAdminClient();

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

    const merged = [...careRows, ...memoRows]
      .sort((a, b) => (a.rawDate < b.rawDate ? 1 : -1))
      .slice(0, limit)
      .map(({ rawDate: _rawDate, ...row }) => row);

    return merged;
  } catch {
    return SEED_HISTORY;
  }
}

export { STATUS_LABEL };
