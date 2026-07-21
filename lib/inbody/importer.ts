// InBody CSV取込みの中核処理。CSV行 → 選手名寄せ → Supabase `inbody` へ直接upsert。
// Kinexon取込み(lib/kinexon/importer.ts)と同じ形だが、こちらはローカルstoreを経由せず
// Supabaseへ直接書き込む(InBodyは既にSupabase接続が前提のため)。

import type { ParsedCsv } from "../kinexon/csv";
import { normalizeDate, normalizeName } from "../kinexon/mapping";
import type { ColumnMapping } from "./mapping";
import { PLAYERS } from "../data/seed";
import { createAdminClient, withTimeout } from "../supabase/admin";
import { getDefaultTeamId } from "../supabase/team";

export interface RowResult {
  rowIndex: number;
  rawName: string;
  date: string | null;
  playerId: string | null;
  playerName: string | null;
  weightKg: number | null;
  muscleMassKg: number | null;
  fatMassKg: number | null;
  fatPct: number | null;
  error?: string;
}

export interface ImportSummary {
  rowCount: number;
  okCount: number;
  errorCount: number;
  unmatchedNames: string[];
  affectedPlayerDates: { playerId: string; playerName: string; date: string; weightKg: number }[];
  rows: RowResult[];
}

function buildNameIndex() {
  const idx = new Map<string, string>();
  for (const p of PLAYERS) {
    idx.set(normalizeName(p.nameKinexon), p.playerId);
    idx.set(normalizeName(p.nameJa), p.playerId);
  }
  return idx;
}

function toNumber(raw: string): number | null {
  return raw !== "" && !Number.isNaN(Number(raw)) ? Number(raw) : null;
}

export function processCsv(parsed: ParsedCsv, mapping: ColumnMapping): RowResult[] {
  const nameIndex = buildNameIndex();

  return parsed.rows.map((row, i) => {
    const rawDate = mapping.date ? row[mapping.date] : "";
    const rawName = mapping.playerName ? row[mapping.playerName] : "";
    const weightKg = toNumber(mapping.weightKg ? row[mapping.weightKg] : "");
    const muscleMassKg = toNumber(mapping.muscleMassKg ? row[mapping.muscleMassKg] : "");
    const fatMassKg = toNumber(mapping.fatMassKg ? row[mapping.fatMassKg] : "");
    const fatPct = toNumber(mapping.fatPct ? row[mapping.fatPct] : "");

    const date = rawDate ? normalizeDate(rawDate) : null;
    const playerId = rawName ? nameIndex.get(normalizeName(rawName)) ?? null : null;

    let error: string | undefined;
    if (!date) error = "測定日を解釈できません";
    else if (!rawName) error = "選手名が空です";
    else if (!playerId) error = `未登録の選手名: ${rawName}`;
    else if (weightKg === null) error = "体重が数値ではありません";
    else if (muscleMassKg === null) error = "骨格筋量が数値ではありません";
    else if (fatMassKg === null) error = "体脂肪量が数値ではありません";
    else if (fatPct === null) error = "体脂肪率が数値ではありません";

    return {
      rowIndex: i,
      rawName,
      date,
      playerId,
      playerName: playerId ? PLAYERS.find((p) => p.playerId === playerId)?.nameJa ?? null : null,
      weightKg,
      muscleMassKg,
      fatMassKg,
      fatPct,
      error,
    };
  });
}

export function summarize(results: RowResult[]): ImportSummary {
  const okRows = results.filter((r) => !r.error);
  const errorRows = results.filter((r) => r.error);
  const unmatchedNames = [...new Set(errorRows.filter((r) => !r.playerId && r.rawName).map((r) => r.rawName))];

  return {
    rowCount: results.length,
    okCount: okRows.length,
    errorCount: errorRows.length,
    unmatchedNames,
    affectedPlayerDates: okRows.map((r) => ({
      playerId: r.playerId!,
      playerName: r.playerName!,
      date: r.date!,
      weightKg: r.weightKg!,
    })),
    rows: results,
  };
}

// 同一date+player_idの再取込みは上書き(冪等)。
export async function commitImport(results: RowResult[]): Promise<ImportSummary> {
  const okRows = results.filter((r) => !r.error);

  if (okRows.length > 0) {
    const teamId = await getDefaultTeamId();
    if (!teamId) throw new Error("チーム情報が見つかりません(Supabaseに接続できない可能性があります)。");

    const supabase = createAdminClient();
    const { error } = await withTimeout(
      supabase.from("inbody").upsert(
        okRows.map((r) => ({
          team_id: teamId,
          player_id: r.playerId,
          date: r.date,
          weight_kg: r.weightKg,
          muscle_mass_kg: r.muscleMassKg,
          fat_mass_kg: r.fatMassKg,
          fat_pct: r.fatPct,
          source: "sheets_sync",
        })),
        { onConflict: "team_id,player_id,date" }
      )
    );
    if (error) throw new Error(error.message);
  }

  return summarize(results);
}
