// §5.7 Kinexon取込みの中核処理。CSV行 → 選手名寄せ → sessions保存 → daily_load再計算。
// Route Handler(preview/commit)から呼ばれる。DB接続後もこのファイルの入出力形は変えずに済む想定。

import type { ParsedCsv } from "./csv";
import { normalizeDate, normalizeName, type ColumnMapping } from "./mapping";
import { dayType } from "../data/rng";
import { intensityBand, targetAal } from "../calc";
import { replaceSessionsForPlayerDate, upsertDailyLoad } from "../store/fileStore";
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

export function processCsv(parsed: ParsedCsv, mapping: ColumnMapping, players: Player[]): RowResult[] {
  const nameIndex = buildNameIndex(players);
  const results: RowResult[] = [];

  parsed.rows.forEach((row, i) => {
    const rawDate = mapping.date ? row[mapping.date] : "";
    const rawName = mapping.playerNameKinexon ? row[mapping.playerNameKinexon] : "";
    const rawAal = mapping.aal ? row[mapping.aal] : "";
    const drillName = (mapping.drillName ? row[mapping.drillName] : "") || "セッション";

    const date = rawDate ? normalizeDate(rawDate) : null;
    const playerId = rawName ? nameIndex.get(normalizeName(rawName)) ?? null : null;
    const aal = rawAal !== "" && !Number.isNaN(Number(rawAal)) ? Number(rawAal) : null;

    let error: string | undefined;
    if (!date) error = "日付を解釈できません";
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
export function commitImport(results: RowResult[], players: Player[]): ImportSummary {
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
      source: "kinexon_csv",
    };
    const list = byPlayerDate.get(key) ?? [];
    list.push(drill);
    byPlayerDate.set(key, list);
  }

  for (const [key, drills] of byPlayerDate) {
    const [playerId, date] = key.split("__");
    replaceSessionsForPlayerDate(playerId, date, drills);

    const player = players.find((p) => p.playerId === playerId)!;
    const dt = dayType(date);
    const totalAal = drills.reduce((sum, d) => sum + d.aal, 0);
    const target = targetAal(player, dt, DEFAULT_SETTINGS);
    const deficit = totalAal - target;
    upsertDailyLoad(playerId, date, {
      totalAal: Math.round(totalAal),
      targetAal: target,
      deficitLoad: Math.round(deficit),
      deficitMin: deficit < 0 ? +(Math.abs(deficit) / 20).toFixed(1) : 0,
      intensityBand: intensityBand(totalAal, DEFAULT_SETTINGS),
    });
  }

  return summarize(results);
}
