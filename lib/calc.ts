// §6 アラートロジック・§7 計算仕様。
// ダミー値の生成はすべて廃止し、実データが無い場合はnull/未計算のまま返す(表示側で「データなし」を出す)。

import type { AlertItem, DayType, Player } from "./types";
import { DEFAULT_SETTINGS, TeamSettings, type DailyIntensityBand } from "./settings";
import { getDailyLoad as getStoredDailyLoad, getRecentTotalAal } from "./data/kinexon-repo";

export function targetAal(player: Player, dt: DayType, settings: TeamSettings = DEFAULT_SETTINGS): number {
  return Math.round(
    settings.targetAalByPositionGroup[player.positionGroup] * settings.dayTypeCoefficient[dt]
  );
}

export function intensityBand(totalAal: number, settings: TeamSettings = DEFAULT_SETTINGS): DailyIntensityBand {
  const band = settings.intensityBands.find((b) => totalAal <= b.max);
  return band ? band.label : "VERY-HIGH";
}

// ACWR = 直近7日AAL合計 ÷ 直近28日AALの7日平均。実データが十分に蓄積していない期間はnullを返す。
export async function acwrFromStore(playerId: string, date: string): Promise<number | null> {
  const [recent7, recent28] = await Promise.all([
    getRecentTotalAal(playerId, date, 7),
    getRecentTotalAal(playerId, date, 28),
  ]);
  if (recent7.length < 3 || recent28.length < 7) return null;
  const acute7 = recent7.reduce((sum, d) => sum + d.totalAal, 0);
  const sum28 = recent28.reduce((sum, d) => sum + d.totalAal, 0);
  const chronicAvg7 = sum28 / 4;
  if (chronicAvg7 === 0) return null;
  return +(acute7 / chronicAvg7).toFixed(2);
}

export interface EffectiveDailyLoad {
  playerId: string;
  date: string;
  isReal: boolean;
  totalAal: number | null;
  targetAal: number;
  deficitLoad: number | null;
  deficitMin: number | null;
  intensityBand: DailyIntensityBand | null;
  acwr: number | null;
  // Kinexon・wellnessのどちらにもRPEの実データ源が無いため常にnull(専用入力を作るまで計算不可)
  srpe: number | null;
}

// その日のKinexon実測値(daily_load)があればそれを使う。無ければtotalAal等はnull(§13: ダミー値は出さない)。
// target_aalだけは選手ポジション・当日係数という実在の設定値から常に計算できるため、実データの有無に関わらず返す。
export async function getEffectiveDailyLoad(
  player: Player,
  date: string,
  dt: DayType,
  settings: TeamSettings = DEFAULT_SETTINGS
): Promise<EffectiveDailyLoad> {
  const target = targetAal(player, dt, settings);
  const stored = await getStoredDailyLoad(player.playerId, date);
  if (!stored) {
    return {
      playerId: player.playerId,
      date,
      isReal: false,
      totalAal: null,
      targetAal: target,
      deficitLoad: null,
      deficitMin: null,
      intensityBand: null,
      acwr: null,
      srpe: null,
    };
  }
  const acwr = await acwrFromStore(player.playerId, date);
  return {
    playerId: player.playerId,
    date,
    isReal: true,
    totalAal: stored.totalAal,
    targetAal: stored.targetAal,
    deficitLoad: stored.deficitLoad,
    deficitMin: stored.deficitMin,
    intensityBand: stored.intensityBand as DailyIntensityBand,
    acwr,
    srpe: null,
  };
}

export async function effectiveTotalAal(player: Player, date: string): Promise<number | null> {
  const stored = await getStoredDailyLoad(player.playerId, date);
  return stored ? stored.totalAal : null;
}

export function acwrBadgeClass(acwr: number, settings: TeamSettings = DEFAULT_SETTINGS): string {
  if (acwr > settings.acwrAlert) return "b-out";
  if (acwr > settings.acwrWarn) return "b-part";
  return "b-soon";
}

// 負荷急増アラート(§6: load_spike_pct)。当日のTotal AALが、直近日平均に対してどれだけ急増したか。
// Kinexon実データが3日分以上無ければ判定しない(誤検知防止)。
export async function loadSpikeAlert(
  player: Player,
  date: string,
  settings: TeamSettings = DEFAULT_SETTINGS
): Promise<AlertItem | null> {
  const recent = await getRecentTotalAal(player.playerId, date, 8);
  const todayRow = recent.find((r) => r.date === date);
  if (!todayRow) return null;
  const priorRows = recent.filter((r) => r.date !== date);
  if (priorRows.length < 3) return null;

  const avgPrior = priorRows.reduce((s, r) => s + r.totalAal, 0) / priorRows.length;
  if (avgPrior <= 0) return null;

  const increasePct = ((todayRow.totalAal - avgPrior) / avgPrior) * 100;
  if (increasePct < settings.loadSpikePct) return null;

  return {
    playerId: player.playerId,
    date,
    type: "LOAD_SPIKE",
    severity: "alert",
    value: `+${Math.round(increasePct)}%`,
    message: `直近平均に対して負荷が+${Math.round(increasePct)}%(基準${settings.loadSpikePct}%超過)。リカバリー優先を推奨`,
  };
}

// 選手・日付ごとのアラート判定(§6)。ACWR・負荷急増の2種(ウェルネスは実データが別経路のためdashboard.tsで判定)。
// ACWRが計算不能(実データ不足)な選手はダミー値を作らずスキップする。
export async function computeAlerts(
  players: Player[],
  date: string,
  settings: TeamSettings = DEFAULT_SETTINGS
): Promise<AlertItem[]> {
  const alerts: AlertItem[] = [];
  for (const p of players) {
    const acwr = await acwrFromStore(p.playerId, date);
    if (acwr !== null) {
      if (acwr > settings.acwrAlert) {
        alerts.push({
          playerId: p.playerId,
          date,
          type: "ACWR",
          severity: "alert",
          value: acwr.toFixed(2),
          message: `急性:慢性負荷比 ${acwr.toFixed(2)}(基準${settings.acwrAlert}超過)。負荷調整を推奨`,
        });
      } else if (acwr > settings.acwrWarn) {
        alerts.push({
          playerId: p.playerId,
          date,
          type: "ACWR",
          severity: "warn",
          value: acwr.toFixed(2),
          message: `急性:慢性負荷比 ${acwr.toFixed(2)}(注意閾値${settings.acwrWarn}超過)。モニタリング推奨`,
        });
      }
    }

    const spike = await loadSpikeAlert(p, date, settings);
    if (spike) alerts.push(spike);
  }
  return alerts;
}
