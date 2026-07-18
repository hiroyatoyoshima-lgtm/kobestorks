import { PLAYERS, INJURIES, STATUS_LABEL } from "./seed";
import { last14Days, labelMD, seededSeries } from "./rng";
import type { Player } from "../types";
import { effectiveTotalAal } from "../calc";
import { compositeScore, getPlayerWellnessRange } from "./wellness-repo";

export function getPlayer(playerId: string): Player | undefined {
  return PLAYERS.find((p) => p.playerId === playerId);
}

export function getInjuryForPlayer(playerId: string) {
  return INJURIES.find((i) => i.playerId === playerId);
}

export function inbodyLatest(player: Player) {
  const w = +(85 + ((player.no * 37) % 25)).toFixed(1);
  const fatPct = +(8 + ((player.no * 11) % 8)).toFixed(1);
  const fat = +((w * fatPct) / 100).toFixed(1);
  const smm = +((w - fat) * 0.56).toFixed(1);
  return { weightKg: w, muscleMassKg: smm, fatMassKg: fat, fatPct };
}

const IB_MONTHS = ["2月", "3月", "4月", "5月", "6月", "7月"];

export function inbodyTrend(player: Player) {
  const b = inbodyLatest(player);
  return {
    labels: IB_MONTHS,
    weightKg: IB_MONTHS.map((_, i) => +(b.weightKg - 1.5 + i * 0.3).toFixed(1)),
    muscleMassKg: IB_MONTHS.map((_, i) => +(b.muscleMassKg - 1 + i * 0.2).toFixed(1)),
    fatPct: IB_MONTHS.map((_, i) => +(b.fatPct + 1 - i * 0.15).toFixed(1)),
  };
}

export function aalTrend(player: Player, anchorDate: string) {
  const days = last14Days(anchorDate);
  return {
    labels: days.map(labelMD),
    // Kinexon取込み済みの日は実測値、未取込みの日はダミーで補完(§11の差替え可能設計)
    values: days.map((d) => effectiveTotalAal(player, d)),
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

export function careHistory(player: Player): HistoryRow[] {
  // 実運用では decisions / care_log の実データを日付降順で表示する。
  return [
    { date: "7/15", type: "S&C", badge: "b-ok", content: "下肢筋力測定 実施。前回比+4%", by: "寺地" },
    { date: "7/12", type: "ケア", badge: "b-soon", content: "試合後リカバリー(交代浴+ストレッチ)", by: "ATトレーナー" },
    { date: "7/10", type: "メモ", badge: "b-part", content: "本人より疲労感の訴えあり。負荷10%減で対応", by: "寺地" },
  ];
}

export { STATUS_LABEL };
