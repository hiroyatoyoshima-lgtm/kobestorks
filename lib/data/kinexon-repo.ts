// §4.2 sessions・§4.3 daily_load(Kinexon取込みの実データ)。
// 元は本番接続までの暫定としてローカルJSONファイル(lib/store/fileStore.ts)に書いていたが、
// Vercelの本番環境はデプロイ後のファイルシステムが読み取り専用のため書き込みが必ず失敗していた。
// Supabaseへ直接読み書きする形に置き換える(他のリポジトリと同じ「フォールバックなしで例外を投げる」書き込み側+
// 「失敗時は空/undefinedを返す」読み取り側のパターンに揃える)。

import { createAdminClient, withTimeout } from "../supabase/admin";
import { getCurrentTeamId } from "../supabase/team";
import type { SessionDrill } from "../types";

export interface StoredDailyLoad {
  totalAal: number;
  targetAal: number;
  deficitLoad: number;
  deficitMin: number;
  intensityBand: string;
  totalDistanceM?: number | null;
  durationMin?: number | null;
}

export interface SyncLogEntry {
  id: string;
  ranAt: string;
  fileName: string;
  status: "ok" | "error";
  rowCount: number;
  matchedPlayerDates: number;
  unmatchedNames: string[];
  errorRowCount: number;
}

function daysBeforeISO(iso: string, n: number): string {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// 同一date+player_idの再取込みは上書き(冪等)§5.7。既存行を削除してから入れ直す。
export async function replaceSessionsForPlayerDate(
  playerId: string,
  date: string,
  drills: SessionDrill[]
): Promise<void> {
  const teamId = await getCurrentTeamId();
  if (!teamId) throw new Error("チーム情報が見つかりません(Supabaseに接続できない可能性があります)。");
  const supabase = createAdminClient();

  const { error: delErr } = await withTimeout(
    supabase.from("sessions").delete().eq("team_id", teamId).eq("player_id", playerId).eq("date", date)
  );
  if (delErr) throw new Error(delErr.message);
  if (drills.length === 0) return;

  const { error: insErr } = await withTimeout(
    supabase.from("sessions").insert(
      drills.map((d) => ({
        team_id: teamId,
        session_id: d.sessionId,
        date: d.date,
        drill_name: d.drillName,
        player_id: d.playerId,
        aal: d.aal,
        distance_m: d.distanceM ?? null,
        duration_min: d.durationMin ?? null,
        accel_count: d.accelCount ?? null,
        decel_count: d.decelCount ?? null,
        jump_count: d.jumpCount ?? null,
        jump_height_max_m: d.jumpHeightMaxM ?? null,
        speed_max_kmh: d.speedMaxKmh ?? null,
        changes_of_orientation: d.changesOfOrientation ?? null,
        exertions: d.exertions ?? null,
        anaerobic_distance_m: d.anaerobicDistanceM ?? null,
        accel_load_high: d.accelLoadHigh ?? null,
        accel_load_very_high: d.accelLoadVeryHigh ?? null,
        source: d.source,
      }))
    )
  );
  if (insErr) throw new Error(insErr.message);
}

export async function upsertDailyLoad(playerId: string, date: string, load: StoredDailyLoad): Promise<void> {
  const teamId = await getCurrentTeamId();
  if (!teamId) throw new Error("チーム情報が見つかりません(Supabaseに接続できない可能性があります)。");
  const supabase = createAdminClient();
  const { error } = await withTimeout(
    supabase.from("daily_load").upsert(
      {
        team_id: teamId,
        player_id: playerId,
        date,
        total_aal: load.totalAal,
        target_aal: load.targetAal,
        deficit_load: load.deficitLoad,
        deficit_min: load.deficitMin,
        intensity_band: load.intensityBand,
        total_distance_m: load.totalDistanceM ?? null,
        duration_min: load.durationMin ?? null,
      },
      { onConflict: "team_id,player_id,date" }
    )
  );
  if (error) throw new Error(error.message);
}

export async function getDailyLoad(playerId: string, date: string): Promise<StoredDailyLoad | undefined> {
  try {
    const teamId = await getCurrentTeamId();
    if (!teamId) return undefined;
    const supabase = createAdminClient();
    const { data, error } = await withTimeout(
      supabase
        .from("daily_load")
        .select("total_aal, target_aal, deficit_load, deficit_min, intensity_band, total_distance_m, duration_min")
        .eq("team_id", teamId)
        .eq("player_id", playerId)
        .eq("date", date)
        .maybeSingle()
    );
    if (error || !data) return undefined;
    return {
      totalAal: data.total_aal,
      targetAal: data.target_aal,
      deficitLoad: data.deficit_load,
      deficitMin: data.deficit_min,
      intensityBand: data.intensity_band,
      totalDistanceM: data.total_distance_m,
      durationMin: data.duration_min,
    };
  } catch {
    return undefined;
  }
}

function averageByDate(rows: { date: string; value: number | null }[]): Map<string, number> {
  const byDate = new Map<string, number[]>();
  for (const r of rows) {
    if (r.value === null) continue;
    const list = byDate.get(r.date) ?? [];
    list.push(r.value);
    byDate.set(r.date, list);
  }
  const avgByDate = new Map<string, number>();
  for (const [date, values] of byDate) {
    avgByDate.set(date, Math.round(values.reduce((s, v) => s + v, 0) / values.length));
  }
  return avgByDate;
}

// 直近日付範囲でチーム平均のTotal AAL・Distanceを日別に集計する(ダッシュボードの14日推移グラフ用)。
// その日に実データを持つ選手だけで平均を取り、実データが無い日は結果に含めない(§13: ダミー値は返さない)。
export async function getTeamLoadSeriesRange(
  startDate: string,
  endDate: string
): Promise<{ aal: Map<string, number>; distance: Map<string, number> }> {
  try {
    const teamId = await getCurrentTeamId();
    if (!teamId) return { aal: new Map(), distance: new Map() };
    const supabase = createAdminClient();
    const { data, error } = await withTimeout(
      supabase
        .from("daily_load")
        .select("date, total_aal, total_distance_m")
        .eq("team_id", teamId)
        .gte("date", startDate)
        .lte("date", endDate)
    );
    if (error) return { aal: new Map(), distance: new Map() };

    const rows = (data ?? []) as { date: string; total_aal: number | null; total_distance_m: number | null }[];
    return {
      aal: averageByDate(rows.map((r) => ({ date: r.date, value: r.total_aal }))),
      distance: averageByDate(rows.map((r) => ({ date: r.date, value: r.total_distance_m }))),
    };
  } catch {
    return { aal: new Map(), distance: new Map() };
  }
}

// 日付ごと・選手ごとのセッション時間(分)を返す(sRPE = RPE × セッション時間 の計算用)。
// wellnessテーブルのRPEと選手×日付単位で突き合わせる必要があるため、チーム平均ではなく生の値を返す。
export async function getTeamDurationByPlayerRange(
  startDate: string,
  endDate: string
): Promise<Map<string, Map<string, number>>> {
  try {
    const teamId = await getCurrentTeamId();
    if (!teamId) return new Map();
    const supabase = createAdminClient();
    const { data, error } = await withTimeout(
      supabase
        .from("daily_load")
        .select("date, player_id, duration_min")
        .eq("team_id", teamId)
        .gte("date", startDate)
        .lte("date", endDate)
        .not("duration_min", "is", null)
    );
    if (error) return new Map();

    const map = new Map<string, Map<string, number>>();
    for (const r of (data ?? []) as { date: string; player_id: string; duration_min: number }[]) {
      const byPlayer = map.get(r.date) ?? new Map<string, number>();
      byPlayer.set(r.player_id, r.duration_min);
      map.set(r.date, byPlayer);
    }
    return map;
  } catch {
    return new Map();
  }
}

// 直近N日で実データが存在する分だけ返す(§7 ACWR計算に使用)。存在しない日は含めない。
export async function getRecentTotalAal(
  playerId: string,
  uptoDateIso: string,
  days: number
): Promise<{ date: string; totalAal: number }[]> {
  try {
    const teamId = await getCurrentTeamId();
    if (!teamId) return [];
    const supabase = createAdminClient();
    const fromIso = daysBeforeISO(uptoDateIso, days - 1);
    const { data, error } = await withTimeout(
      supabase
        .from("daily_load")
        .select("date, total_aal")
        .eq("team_id", teamId)
        .eq("player_id", playerId)
        .gte("date", fromIso)
        .lte("date", uptoDateIso)
    );
    if (error) return [];
    return (data ?? []).map((r) => ({ date: r.date as string, totalAal: r.total_aal as number }));
  } catch {
    return [];
  }
}

// Kinexon取込みの同期ログ。Sheets同期用のsync_logsテーブル(§7.5)を共用し、
// Kinexon固有の情報(ファイル名・件数など)はdetail(jsonb)に格納する。
export async function appendSyncLog(entry: SyncLogEntry): Promise<void> {
  try {
    const teamId = await getCurrentTeamId();
    if (!teamId) return;
    const supabase = createAdminClient();
    await withTimeout(
      supabase.from("sync_logs").insert({
        team_id: teamId,
        ran_at: entry.ranAt,
        sheet_tab: entry.fileName,
        status: entry.status,
        error_count: entry.errorRowCount,
        detail: {
          rowCount: entry.rowCount,
          matchedPlayerDates: entry.matchedPlayerDates,
          unmatchedNames: entry.unmatchedNames,
        },
      })
    );
  } catch {
    // 同期ログの保存に失敗しても取込み自体は成功させる(ログは補助情報のため)
  }
}

export async function listSyncLogs(): Promise<SyncLogEntry[]> {
  try {
    const teamId = await getCurrentTeamId();
    if (!teamId) return [];
    const supabase = createAdminClient();
    const { data, error } = await withTimeout(
      supabase.from("sync_logs").select("*").eq("team_id", teamId).order("ran_at", { ascending: false }).limit(50)
    );
    if (error) return [];
    return (data ?? []).map((r) => ({
      id: r.id,
      ranAt: r.ran_at,
      fileName: r.sheet_tab ?? "(不明なファイル)",
      status: r.status,
      rowCount: r.detail?.rowCount ?? 0,
      matchedPlayerDates: r.detail?.matchedPlayerDates ?? 0,
      unmatchedNames: r.detail?.unmatchedNames ?? [],
      errorRowCount: r.error_count ?? 0,
    }));
  } catch {
    return [];
  }
}
