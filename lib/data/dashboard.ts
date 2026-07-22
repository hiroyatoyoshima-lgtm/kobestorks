import type { Player } from "../types";
import { last14Days, labelMD, dayType, toISO } from "./rng";
import { acwrBadgeClass, computeAlerts, getEffectiveDailyLoad, targetAal } from "../calc";
import { DEFAULT_SETTINGS, type TeamSettings } from "../settings";
import { compositeScore, getTeamWellnessForDate, getTeamWellnessRange, type WellnessRow } from "./wellness-repo";
import { getDailyComment } from "./daily-comment-repo";
import { getTeamSettings } from "./settings-repo";
import { getTeamPlayers } from "./players-repo";
import { getTeamDurationByPlayerRange, getTeamLoadSeriesRange } from "./kinexon-repo";

export function todayISO(): string {
  return toISO(new Date());
}

function prevDayISO(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() - 1);
  return toISO(d);
}

function daysBeforeISO(iso: string, n: number): string {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() - n);
  return toISO(d);
}

const WELLNESS_FIELDS: { key: "sleepQuality" | "fatigue" | "soreness" | "stress"; label: string }[] = [
  { key: "sleepQuality", label: "睡眠の質" },
  { key: "fatigue", label: "疲労感" },
  { key: "soreness", label: "筋肉痛" },
  { key: "stress", label: "ストレス" },
];

// ウェルネス悪化アラート(§6: wellness_warn_pct/wellness_alert_pct)。
// 個人の直近 wellnessWindowDays 平均(当日を除く)に対して、当日値がどれだけ悪化したかを
// 4項目それぞれ+4項目合計の計5系統で判定する。個人の履歴が wellnessMinDays 未満の場合は誤検知防止のため判定しない。
function wellnessAlertsForPlayer(
  p: Player,
  wellnessRange: Map<string, WellnessRow[]>,
  date: string,
  settings: TeamSettings
): DashboardAlert[] {
  const todayRow = wellnessRange.get(date)?.find((w) => w.playerId === p.playerId);
  if (!todayRow) return [];

  const cutoff = daysBeforeISO(date, settings.wellnessWindowDays);
  const priorRows: WellnessRow[] = [];
  for (const [d, rows] of wellnessRange.entries()) {
    if (d === date || d < cutoff || d > date) continue;
    const row = rows.find((w) => w.playerId === p.playerId);
    if (row) priorRows.push(row);
  }
  if (priorRows.length < settings.wellnessMinDays) return [];

  const results: DashboardAlert[] = [];
  const pushIfWorsened = (label: string, baseline: number, todayVal: number) => {
    if (baseline <= 0) return;
    const worsenPct = ((baseline - todayVal) / baseline) * 100;
    if (worsenPct >= settings.wellnessAlertPct) {
      results.push({
        icon: "🔴",
        cls: "red",
        playerNo: p.no,
        playerName: p.nameJa,
        text: `${label}が個人平均比${Math.round(worsenPct)}%悪化(基準${settings.wellnessAlertPct}%超過)。要フォロー`,
      });
    } else if (worsenPct >= settings.wellnessWarnPct) {
      results.push({
        icon: "🟡",
        cls: "",
        playerNo: p.no,
        playerName: p.nameJa,
        text: `${label}が個人平均比${Math.round(worsenPct)}%悪化(注意閾値${settings.wellnessWarnPct}%超過)。モニタリング推奨`,
      });
    }
  };

  for (const f of WELLNESS_FIELDS) {
    const baseline = priorRows.reduce((s, r) => s + r[f.key], 0) / priorRows.length;
    pushIfWorsened(f.label, baseline, todayRow[f.key]);
  }

  const baselineTotal =
    priorRows.reduce((s, r) => s + r.sleepQuality + r.fatigue + r.soreness + r.stress, 0) / priorRows.length;
  const todayTotal = todayRow.sleepQuality + todayRow.fatigue + todayRow.soreness + todayRow.stress;
  pushIfWorsened("ウェルネス合計", baselineTotal, todayTotal);

  return results;
}

export interface DashboardAlert {
  icon: string;
  cls: "" | "red";
  playerNo: number;
  playerName: string;
  text: string;
}

export interface PlayerComment {
  playerNo: number;
  playerName: string;
  painFlag: boolean;
  text: string;
}

export interface DashboardData {
  date: string;
  dayType: ReturnType<typeof dayType>;
  days: string[];
  dayLabels: string[];
  kpi: {
    availablePlayers: string;
    availableNote: string;
    teamAal: number | null;
    wellnessAvg: string;
    wellnessDelta: string | null;
    wellnessUp: boolean;
    surveyRate: string;
  };
  teamLoadSeries: { aal: (number | null)[]; srpe: (number | null)[] };
  wellnessSeries: { distance: (number | null)[]; fatigue: (number | null)[] };
  alerts: DashboardAlert[];
  alertsAreReal: boolean;
  playerComments: PlayerComment[] | null;
  dailyTable: {
    no: number;
    name: string;
    total: number | null;
    target: number;
    diff: number | null;
    minsLabel: string;
    intensity: string | null;
    acwr: string | null;
    acwrBadge: string | null;
  }[];
  comment: string;
  commentEditable: boolean;
  usingRealData: boolean;
}

export async function getDashboardData(date: string): Promise<DashboardData> {
  const days = last14Days(date);
  const dayLabels = days.map(labelMD);
  const dt = dayType(date);

  const [{ players }, { settings }] = await Promise.all([getTeamPlayers(), getTeamSettings()]);

  const availableCount = players.filter((p) => p.status !== "out").length;
  const partCount = players.filter((p) => p.status === "part").length;
  const outCount = players.filter((p) => p.status === "out").length;

  const loads = await Promise.all(
    players.map(async (p) => ({ p, load: await getEffectiveDailyLoad(p, date, dt, settings) }))
  );
  const anyRealLoad = loads.some(({ load }) => load.isReal);
  const realLoads = loads.filter(({ load }) => load.isReal && load.totalAal !== null);
  const teamAal =
    realLoads.length > 0
      ? Math.round(realLoads.reduce((sum, { load }) => sum + load.totalAal!, 0) / realLoads.length)
      : null;

  const [wellnessToday, wellnessYesterday, wellnessRange, dailyComment, loadSeriesRange, durationRange] =
    await Promise.all([
      getTeamWellnessForDate(date),
      getTeamWellnessForDate(prevDayISO(date)),
      getTeamWellnessRange(days[0], days[days.length - 1]),
      getDailyComment(date),
      getTeamLoadSeriesRange(days[0], days[days.length - 1]),
      getTeamDurationByPlayerRange(days[0], days[days.length - 1]),
    ]);

  let wellnessAvg = "—";
  let wellnessDelta: string | null = null;
  let wellnessUp = true;
  let surveyRate = "—";

  if (wellnessToday) {
    surveyRate = `${wellnessToday.size}/${players.length}`;
    if (wellnessToday.size > 0) {
      const todayAvg =
        [...wellnessToday.values()].reduce((s, w) => s + compositeScore(w), 0) / wellnessToday.size;
      wellnessAvg = todayAvg.toFixed(1);
      if (wellnessYesterday && wellnessYesterday.size > 0) {
        const yestAvg =
          [...wellnessYesterday.values()].reduce((s, w) => s + compositeScore(w), 0) / wellnessYesterday.size;
        const diff = todayAvg - yestAvg;
        wellnessUp = diff >= 0;
        wellnessDelta = `${wellnessUp ? "▲" : "▼"} 前日比 ${wellnessUp ? "+" : ""}${diff.toFixed(1)}`;
      } else {
        wellnessDelta = `本日 ${wellnessToday.size}名回答`;
      }
    } else {
      wellnessDelta = "本日の回答はまだありません";
    }
  }

  // コメント・痛み申告があった選手だけ抜き出す(Supabase未接続時は null = 非表示)
  const playerComments: PlayerComment[] | null = wellnessToday
    ? [...wellnessToday.values()]
        .filter((w) => w.painFlag || w.comment.trim() !== "")
        .map((w) => {
          const p = players.find((pl) => pl.playerId === w.playerId)!;
          return { playerNo: p.no, playerName: p.nameJa, painFlag: w.painFlag, text: w.comment };
        })
    : null;

  const fatigueSeries = days.map((d) => {
    const rows = wellnessRange?.get(d);
    if (rows && rows.length > 0) {
      return +(rows.reduce((s, w) => s + w.fatigue, 0) / rows.length).toFixed(1);
    }
    return null;
  });

  // sRPE = RPE(練習後アンケート) × セッション時間(Kinexonの実データ)。
  // 選手ごとに両方揃っている日だけ計算し、その平均をチームsRPEとする(§7)。
  // 片方しか無い選手はその日の計算から除外し、誰も揃わない日はnull(推測では埋めない)。
  const srpeSeries = days.map((d) => {
    const wellnessRows = wellnessRange?.get(d) ?? [];
    const durationByPlayer = durationRange.get(d);
    if (!durationByPlayer) return null;

    const products: number[] = [];
    for (const w of wellnessRows) {
      if (w.rpe === null) continue;
      const duration = durationByPlayer.get(w.playerId);
      if (duration === undefined) continue;
      products.push(w.rpe * duration);
    }
    if (products.length === 0) return null;
    return Math.round(products.reduce((s, v) => s + v, 0) / products.length);
  });

  const distanceSeries = days.map((d) => loadSeriesRange.distance.get(d) ?? null);
  const teamAalSeries = days.map((d) => loadSeriesRange.aal.get(d) ?? null);

  const hasRealWellnessToday = !!wellnessToday && wellnessToday.size > 0;

  // アラートは実データがある時だけ計算する。実データが無ければ空(ダミーのアラートは出さない)。
  const alerts: DashboardAlert[] = [];
  if (anyRealLoad) {
    const computed = await computeAlerts(players, date, settings);
    alerts.push(
      ...computed.map((a) => {
        const p = players.find((pl) => pl.playerId === a.playerId)!;
        return {
          icon: a.severity === "alert" ? "🔴" : "🟡",
          cls: a.severity === "alert" ? "red" : "",
          playerNo: p.no,
          playerName: p.nameJa,
          text: a.message,
        } as DashboardAlert;
      })
    );
  }
  if (hasRealWellnessToday && wellnessRange) {
    for (const p of players) {
      alerts.push(...wellnessAlertsForPlayer(p, wellnessRange, date, settings));
    }
  }

  const dailyTable = loads.map(({ p, load }) => ({
    no: p.no,
    name: p.nameJa,
    total: load.totalAal,
    target: load.targetAal,
    diff: load.deficitLoad,
    minsLabel: load.deficitMin !== null && load.deficitLoad !== null && load.deficitLoad < 0 ? `${load.deficitMin}min` : "0min",
    intensity: load.intensityBand,
    acwr: load.acwr !== null ? load.acwr.toFixed(2) : null,
    acwrBadge: load.acwr !== null ? acwrBadgeClass(load.acwr, settings) : null,
  }));

  return {
    date,
    dayType: dt,
    days,
    dayLabels,
    kpi: {
      availablePlayers: `${availableCount}/${players.length}`,
      availableNote: `離脱${outCount}名・部分参加${partCount}名`,
      teamAal,
      wellnessAvg,
      wellnessDelta,
      wellnessUp,
      surveyRate,
    },
    teamLoadSeries: {
      aal: teamAalSeries,
      srpe: srpeSeries,
    },
    wellnessSeries: {
      distance: distanceSeries,
      fatigue: fatigueSeries,
    },
    alerts,
    alertsAreReal: anyRealLoad || hasRealWellnessToday,
    playerComments,
    dailyTable,
    comment: dailyComment?.comment ?? "",
    commentEditable: !!dailyComment,
    // このフラグは「デイリーレポート」表内のKinexon由来の数値(Total AAL・ACWR等)が
    // 実データかどうかだけを表す。wellnessToday は空Mapでも truthy になるため含めない。
    usingRealData: anyRealLoad,
  };
}

export { targetAal, DEFAULT_SETTINGS };
