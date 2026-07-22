// §6 アラートロジック・§7 計算仕様。
// 実DB接続後は total_aal 等の元データは sessions/wellness テーブルの実測値に置き換わるが、
// 計算式(target_aal・deficit・ACWR・アラート判定)はそのまま流用できる形にしてある。

import type { AlertItem, DailyLoad, DayType, Player } from "./types";
import { DEFAULT_SETTINGS, TeamSettings, type DailyIntensityBand } from "./settings";
import { dateSeed } from "./data/rng";
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

// ACWR = 直近7日AAL合計 ÷ 直近28日AALの7日平均。
// ダミー実装では日付シードから決定論的な疑似値を作る(本番は daily_load の実測値を集計する)。
export function pseudoAcwr(player: Player, date: string): number {
  const s = player.no * 7 + dateSeed(date);
  return +(0.85 + ((s * 17) % 55) / 100).toFixed(2);
}

export function pseudoTotalAal(player: Player, date: string): number {
  const s = player.no * 7 + dateSeed(date);
  return Math.round(300 + ((s * 73) % 280));
}

export function computeDailyLoad(
  player: Player,
  date: string,
  dt: DayType,
  settings: TeamSettings = DEFAULT_SETTINGS
): DailyLoad {
  const total = pseudoTotalAal(player, date);
  const target = targetAal(player, dt, settings);
  const deficit = total - target;
  const deficitMin = deficit < 0 ? +(Math.abs(deficit) / 20).toFixed(1) : 0;
  const acwr = pseudoAcwr(player, date);
  const s = player.no * 7 + dateSeed(date);
  const srpe = +(1 + ((s * 11) % 40) / 10).toFixed(1);
  return {
    playerId: player.playerId,
    date,
    totalAal: total,
    targetAal: target,
    deficitLoad: deficit,
    deficitMin,
    intensityBand: intensityBand(total, settings),
    acwr,
    srpe,
  };
}

// Kinexon実データ(Supabase daily_load)から ACWR = 直近7日合計 ÷ 直近28日の7日平均、を計算する。
// 実データが十分に蓄積していない期間は null を返し、呼び出し側はダミー値にフォールバックする。
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

// その日の実測値(Kinexon取込み)があればそれを、無ければダミー値を返す(§11のダミー差替え設計)。
export async function getEffectiveDailyLoad(
  player: Player,
  date: string,
  dt: DayType,
  settings: TeamSettings = DEFAULT_SETTINGS
): Promise<DailyLoad & { isReal: boolean }> {
  const stored = await getStoredDailyLoad(player.playerId, date);
  if (!stored) {
    return { ...computeDailyLoad(player, date, dt, settings), isReal: false };
  }
  const acwr = (await acwrFromStore(player.playerId, date)) ?? pseudoAcwr(player, date);
  const s = player.no * 7 + dateSeed(date);
  const srpe = +(1 + ((s * 11) % 40) / 10).toFixed(1); // Kinexonにはsrpe元データ(RPE)が無いため引き続きダミー
  return {
    playerId: player.playerId,
    date,
    totalAal: stored.totalAal,
    targetAal: stored.targetAal,
    deficitLoad: stored.deficitLoad,
    deficitMin: stored.deficitMin,
    intensityBand: stored.intensityBand as DailyIntensityBand,
    acwr,
    srpe,
    isReal: true,
  };
}

export async function effectiveTotalAal(player: Player, date: string): Promise<number> {
  const stored = await getStoredDailyLoad(player.playerId, date);
  return stored ? stored.totalAal : pseudoTotalAal(player, date);
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
export async function computeAlerts(
  players: Player[],
  date: string,
  settings: TeamSettings = DEFAULT_SETTINGS
): Promise<AlertItem[]> {
  const alerts: AlertItem[] = [];
  for (const p of players) {
    const acwr = (await acwrFromStore(p.playerId, date)) ?? pseudoAcwr(p, date);
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

    const spike = await loadSpikeAlert(p, date, settings);
    if (spike) alerts.push(spike);
  }
  return alerts;
}
