import type { Player } from "../types";
import { PLAYERS, ALERT_MESSAGE_TEMPLATES, COMMENT_TEMPLATES, INJURIES } from "./seed";
import { dateSeed, last14Days, labelMD, seededScale5, seededSeries, dayType, toISO } from "./rng";
import { acwrBadgeClass, computeAlerts, getEffectiveDailyLoad, targetAal } from "../calc";
import { DEFAULT_SETTINGS, type TeamSettings } from "../settings";
import { compositeScore, getTeamWellnessForDate, getTeamWellnessRange, type WellnessRow } from "./wellness-repo";
import { getDailyComment } from "./daily-comment-repo";
import { getTeamSettings } from "./settings-repo";

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
    teamAal: number;
    teamAalDelta: string;
    teamAalUp: boolean;
    wellnessAvg: string;
    wellnessDelta: string;
    wellnessUp: boolean;
    surveyRate: string;
  };
  teamLoadSeries: { aal: number[]; srpe: number[] };
  wellnessSeries: { distance: number[]; fatigue: number[] };
  alerts: DashboardAlert[];
  playerComments: PlayerComment[] | null;
  dailyTable: {
    no: number;
    name: string;
    total: number;
    target: number;
    diff: number;
    minsLabel: string;
    intensity: string;
    acwr: string;
    acwrBadge: string;
  }[];
  comment: string;
  commentEditable: boolean;
  usingRealData: boolean;
}

export async function getDashboardData(date: string): Promise<DashboardData> {
  const seed = dateSeed(date);
  const days = last14Days(date);
  const dayLabels = days.map(labelMD);
  const dt = dayType(date);

  const availableCount = PLAYERS.filter((p) => p.status !== "out").length;
  const partCount = PLAYERS.filter((p) => p.status === "part").length;
  const outCount = PLAYERS.filter((p) => p.status === "out").length;

  const { settings } = await getTeamSettings();

  const loads = PLAYERS.map((p) => ({ p, load: getEffectiveDailyLoad(p, date, dt, settings) }));
  const anyRealLoad = loads.some(({ load }) => load.isReal);

  const teamAal = anyRealLoad
    ? Math.round(loads.reduce((sum, { load }) => sum + load.totalAal, 0) / loads.length)
    : 350 + (seed % 150);
  const teamAalUp = seed % 2 === 1;

  // ── ウェルネス(実データ優先。Supabase未接続時のみダミー) ──
  const [wellnessToday, wellnessYesterday, wellnessRange, dailyComment] = await Promise.all([
    getTeamWellnessForDate(date),
    getTeamWellnessForDate(prevDayISO(date)),
    getTeamWellnessRange(days[0], days[days.length - 1]),
    getDailyComment(date),
  ]);

  let wellnessAvg: string;
  let wellnessDelta: string;
  let wellnessUp: boolean;
  let surveyRate: string;

  if (wellnessToday) {
    surveyRate = `${wellnessToday.size}/${PLAYERS.length}`;
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
        wellnessUp = true;
        wellnessDelta = `本日 ${wellnessToday.size}名回答`;
      }
    } else {
      wellnessAvg = "—";
      wellnessUp = true;
      wellnessDelta = "本日の回答はまだありません";
    }
  } else {
    // Supabase未接続時のダミー
    wellnessAvg = (3.2 + (seed % 12) / 10).toFixed(1);
    wellnessUp = seed % 3 !== 0;
    wellnessDelta = `${wellnessUp ? "▲" : "▼"} 前日比 ${wellnessUp ? "+" : "-"}0.${1 + (seed % 4)}`;
    surveyRate = `${9 + (seed % 3)}/${PLAYERS.length}`;
  }

  // コメント・痛み申告があった選手だけ抜き出す(Supabase未接続時は null = 非表示)
  const playerComments: PlayerComment[] | null = wellnessToday
    ? [...wellnessToday.values()]
        .filter((w) => w.painFlag || w.comment.trim() !== "")
        .map((w) => {
          const p = PLAYERS.find((pl) => pl.playerId === w.playerId)!;
          return { playerNo: p.no, playerName: p.nameJa, painFlag: w.painFlag, text: w.comment };
        })
    : null;

  const fatigueSeries = days.map((d, i) => {
    const rows = wellnessRange?.get(d);
    if (rows && rows.length > 0) {
      return +(rows.reduce((s, w) => s + w.fatigue, 0) / rows.length).toFixed(1);
    }
    return seededScale5(9, 3.4, days, seed)[i];
  });

  const hasRealWellnessToday = !!wellnessToday && wellnessToday.size > 0;

  let alerts: DashboardAlert[];
  if (anyRealLoad || hasRealWellnessToday) {
    // Kinexon実データ・ウェルネス実データのどちらか1件でもあれば、§6の実アラート判定に切り替える
    alerts = [];
    if (anyRealLoad) {
      alerts.push(
        ...computeAlerts(PLAYERS, date, settings).map((a) => {
          const p = PLAYERS.find((pl) => pl.playerId === a.playerId)!;
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
      for (const p of PLAYERS) {
        alerts.push(...wellnessAlertsForPlayer(p, wellnessRange, date, settings));
      }
    }
  } else {
    const alertCount = 2 + (seed % 2);
    alerts = [];
    for (let i = 0; i < alertCount; i++) {
      const p = PLAYERS[(seed * 3 + i * 5) % PLAYERS.length];
      const t = ALERT_MESSAGE_TEMPLATES[(seed + i * 2) % ALERT_MESSAGE_TEMPLATES.length];
      alerts.push({
        icon: t.severity === "alert" ? "🔴" : "🟡",
        cls: t.severity === "alert" ? "red" : "",
        playerNo: p.no,
        playerName: p.nameJa,
        text: t.text,
      });
    }
  }

  const dailyTable = loads.map(({ p, load }) => ({
    no: p.no,
    name: p.nameJa,
    total: load.totalAal,
    target: load.targetAal,
    diff: load.deficitLoad,
    minsLabel: load.deficitLoad < 0 ? `${load.deficitMin}min` : "0min",
    intensity: load.intensityBand,
    acwr: load.acwr.toFixed(2),
    acwrBadge: acwrBadgeClass(load.acwr, settings),
  }));

  return {
    date,
    dayType: dt,
    days,
    dayLabels,
    kpi: {
      availablePlayers: `${availableCount}/${PLAYERS.length}`,
      availableNote: `離脱${outCount}名・部分参加${partCount}名`,
      teamAal,
      teamAalDelta: `${teamAalUp ? "▲" : "▼"} 前週比 ${teamAalUp ? "+" : "-"}${3 + (seed % 9)}%`,
      teamAalUp,
      wellnessAvg,
      wellnessDelta,
      wellnessUp,
      surveyRate,
    },
    teamLoadSeries: {
      aal: seededSeries(7, 400, 180, days),
      srpe: seededScale5(4, 3.0, days, seed),
    },
    wellnessSeries: {
      distance: seededSeries(23, 3800, 1400, days),
      fatigue: fatigueSeries,
    },
    alerts,
    playerComments,
    dailyTable,
    comment: dailyComment ? dailyComment.comment ?? "" : COMMENT_TEMPLATES[seed % COMMENT_TEMPLATES.length],
    commentEditable: !!dailyComment,
    // このフラグは「デイリーレポート」表内のKinexon由来の数値(Total AAL・ACWR等)が
    // 実データかどうかだけを表す。wellnessToday は空Mapでも truthy になるため含めない
    // (Supabaseに繋がっているだけでKinexon実データ扱いになるバグがあったため修正)。
    usingRealData: anyRealLoad,
  };
}

export function injuryCountForBadge() {
  return INJURIES.length;
}

export { targetAal, DEFAULT_SETTINGS };
