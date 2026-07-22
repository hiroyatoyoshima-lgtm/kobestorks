// §5.7 Kinexon取込みの中核処理。CSV行 → 選手名寄せ → sessions保存 → daily_load再計算。
// Route Handler(preview/commit)から呼ばれる。DB接続後もこのファイルの入出力形は変えずに済む想定。

import type { ParsedCsv } from "./csv";
import { normalizeDate, normalizeName, parseDurationToMinutes, type ColumnMapping } from "./mapping";
import { dayType } from "../data/rng";
import { intensityBand, targetAal } from "../calc";
import { replaceSessionsForPlayerDate, upsertDailyLoad } from "../data/kinexon-repo";
import type { Player, SessionDrill } from "../types";
import { DEFAULT_SETTINGS } from "../settings";

export interface RowResult {
  rowIndex: number;
  rawName: string;
  date: string | null;
  playerId: string | null;
  playerName: string | null;
  drillName: string;
  aal: number | null;
  distanceM: number | null;
  durationMin: number | null;
  accelCount: number | null;
  decelCount: number | null;
  jumpCount: number | null;
  jumpHeightMaxM: number | null;
  speedMaxKmh: number | null;
  changesOfOrientation: number | null;
  exertions: number | null;
  anaerobicDistanceM: number | null;
  accelLoadHigh: number | null;
  accelLoadVeryHigh: number | null;
  error?: string;
}

export interface ImportSummary {
  rowCount: number;
  okCount: number;
  errorCount: number;
  unmatchedNames: string[];
  affectedPlayerDates: { playerId: string; playerName: string; date: string; totalAal: number }[];
  rows: RowResult[];
}

function buildNameIndex(players: Player[]) {
  const idx = new Map<string, string>(); // normalized name -> playerId
  for (const p of players) {
    idx.set(normalizeName(p.nameKinexon), p.playerId);
    idx.set(normalizeName(p.nameJa), p.playerId);
  }
  return idx;
}

// Kinexonのエクスポートは末尾に「⌀ All players」のようなチーム平均の集計行を含むことがある。
// 選手ではないためエラー扱いにせず、取込み対象から静かに除外する。
function isTeamSummaryRow(rawName: string): boolean {
  return /all players/i.test(rawName);
}

function readNumberField(row: Record<string, string>, mapping: ColumnMapping, field: keyof ColumnMapping): number | null {
  const col = mapping[field];
  if (!col) return null;
  const raw = row[col];
  return raw !== "" && raw !== undefined && !Number.isNaN(Number(raw)) ? Number(raw) : null;
}

export function processCsv(
  parsed: ParsedCsv,
  mapping: ColumnMapping,
  players: Player[],
  sessionDate?: string
): RowResult[] {
  const nameIndex = buildNameIndex(players);
  const results: RowResult[] = [];

  parsed.rows.forEach((row, i) => {
    const rawName = mapping.playerNameKinexon ? row[mapping.playerNameKinexon] : "";
    if (isTeamSummaryRow(rawName)) return;

    // 列に日付があればそちらを優先、無ければ取込み画面で指定した対象日を使う(§5.7)
    const rawDate = mapping.date ? row[mapping.date] : "";
    const drillName = (mapping.drillName ? row[mapping.drillName] : "") || "セッション";

    const date = rawDate ? normalizeDate(rawDate) : sessionDate || null;
    const playerId = rawName ? nameIndex.get(normalizeName(rawName)) ?? null : null;
    const aal = readNumberField(row, mapping, "aal");

    let error: string | undefined;
    if (!date) error = "日付を解釈できません(対象日が未指定です)";
    else if (!rawName) error = "選手名が空です";
    else if (!playerId) error = `未登録の選手名: ${rawName}(選手マスタのname_kinexonと不一致)`;
    else if (aal === null) error = "AALが数値ではありません";

    results.push({
      rowIndex: i,
      rawName,
      date,
      playerId,
      playerName: playerId ? players.find((p) => p.playerId === playerId)?.nameJa ?? null : null,
      drillName,
      aal,
      distanceM: readNumberField(row, mapping, "distanceM"),
      durationMin: mapping.durationMin ? parseDurationToMinutes(row[mapping.durationMin] ?? "") : null,
      accelCount: readNumberField(row, mapping, "accelCount"),
      decelCount: readNumberField(row, mapping, "decelCount"),
      jumpCount: readNumberField(row, mapping, "jumpCount"),
      jumpHeightMaxM: readNumberField(row, mapping, "jumpHeightMaxM"),
      speedMaxKmh: readNumberField(row, mapping, "speedMaxKmh"),
      changesOfOrientation: readNumberField(row, mapping, "changesOfOrientation"),
      exertions: readNumberField(row, mapping, "exertions"),
      anaerobicDistanceM: readNumberField(row, mapping, "anaerobicDistanceM"),
      accelLoadHigh: readNumberField(row, mapping, "accelLoadHigh"),
      accelLoadVeryHigh: readNumberField(row, mapping, "accelLoadVeryHigh"),
      error,
    });
  });

  return results;
}

export function summarize(results: RowResult[]): ImportSummary {
  const okRows = results.filter((r) => !r.error);
  const errorRows = results.filter((r) => r.error);
  const unmatchedNames = [
    ...new Set(errorRows.filter((r) => !r.playerId && r.rawName).map((r) => r.rawName)),
  ];

  const grouped = new Map<string, { playerId: string; playerName: string; date: string; total: number }>();
  for (const r of okRows) {
    const key = `${r.playerId}__${r.date}`;
    const cur = grouped.get(key);
    if (cur) cur.total += r.aal!;
    else grouped.set(key, { playerId: r.playerId!, playerName: r.playerName!, date: r.date!, total: r.aal! });
  }

  return {
    rowCount: results.length,
    okCount: okRows.length,
    errorCount: errorRows.length,
    unmatchedNames,
    affectedPlayerDates: [...grouped.values()].map((g) => ({
      playerId: g.playerId,
      playerName: g.playerName,
      date: g.date,
      totalAal: Math.round(g.total),
    })),
    rows: results,
  };
}

// 同一date+player_idの再取込みは上書き(冪等)。daily_loadも合わせて自動再計算する(§5.7・§7)。
export async function commitImport(results: RowResult[], players: Player[]): Promise<ImportSummary> {
  const byPlayerDate = new Map<string, SessionDrill[]>();
  for (const r of results) {
    if (r.error || !r.playerId || !r.date || r.aal === null) continue;
    const key = `${r.playerId}__${r.date}`;
    const drill: SessionDrill = {
      sessionId: `${r.date}-${r.playerId}-${r.rowIndex}`,
      date: r.date,
      drillName: r.drillName,
      playerId: r.playerId,
      aal: r.aal,
      distanceM: r.distanceM ?? undefined,
      durationMin: r.durationMin ?? undefined,
      accelCount: r.accelCount ?? undefined,
      decelCount: r.decelCount ?? undefined,
      jumpCount: r.jumpCount ?? undefined,
      jumpHeightMaxM: r.jumpHeightMaxM ?? undefined,
      speedMaxKmh: r.speedMaxKmh ?? undefined,
      changesOfOrientation: r.changesOfOrientation ?? undefined,
      exertions: r.exertions ?? undefined,
      anaerobicDistanceM: r.anaerobicDistanceM ?? undefined,
      accelLoadHigh: r.accelLoadHigh ?? undefined,
      accelLoadVeryHigh: r.accelLoadVeryHigh ?? undefined,
      source: "kinexon_csv",
    };
    const list = byPlayerDate.get(key) ?? [];
    list.push(drill);
    byPlayerDate.set(key, list);
  }

  // 選手×日付ごとの書き込みは互いに独立しているため並列化する(逐次実行だとサーバーレス関数の
  // タイムアウトに引っかかりやすいため)。
  await Promise.all(
    [...byPlayerDate.entries()].map(async ([key, drills]) => {
      const [playerId, date] = key.split("__");
      await replaceSessionsForPlayerDate(playerId, date, drills);

      const player = players.find((p) => p.playerId === playerId)!;
      const dt = dayType(date);
      const totalAal = drills.reduce((sum, d) => sum + d.aal, 0);
      const drillsWithDistance = drills.filter((d) => d.distanceM !== undefined);
      const totalDistanceM =
        drillsWithDistance.length > 0 ? drillsWithDistance.reduce((sum, d) => sum + d.distanceM!, 0) : null;
      const drillsWithDuration = drills.filter((d) => d.durationMin !== undefined);
      const totalDurationMin =
        drillsWithDuration.length > 0 ? drillsWithDuration.reduce((sum, d) => sum + d.durationMin!, 0) : null;
      const target = targetAal(player, dt, DEFAULT_SETTINGS);
      const deficit = totalAal - target;
      await upsertDailyLoad(playerId, date, {
        totalAal: Math.round(totalAal),
        targetAal: target,
        deficitLoad: Math.round(deficit),
        deficitMin: deficit < 0 ? +(Math.abs(deficit) / 20).toFixed(1) : 0,
        intensityBand: intensityBand(totalAal, DEFAULT_SETTINGS),
        totalDistanceM: totalDistanceM !== null ? Math.round(totalDistanceM) : null,
        durationMin: totalDurationMin !== null ? +totalDurationMin.toFixed(1) : null,
      });
    })
  );

  return summarize(results);
}
