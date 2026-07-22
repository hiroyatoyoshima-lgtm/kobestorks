// §4.2 sessions・§4.3 daily_load(Kinexon取込みの実データ)。
// 元は本番接続までの暫定としてローカルJSONファイル(lib/store/fileStore.ts)に書いていたが、
// Vercelの本番環境はデプロイ後のファイルシステムが読み取り専用のため書き込みが必ず失敗していた。
// Supabaseへ直接読み書きする形に置き換える(他のリポジトリと同じ「フォールバックなしで例外を投げる」書き込み側+
// 「失敗時は空/undefinedを返す」読み取り側のパターンに揃える)。

import { createAdminClient, withTimeout } from "../supabase/admin";
import { getDefaultTeamId } from "../supabase/team";
import type { SessionDrill } from "../types";

export interface StoredDailyLoad {
  totalAal: number;
  targetAal: number;
  deficitLoad: number;
  deficitMin: number;
  intensityBand: string;
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
  const teamId = await getDefaultTeamId();
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
        source: d.source,
      }))
    )
  );
  if (insErr) throw new Error(insErr.message);
}

export async function upsertDailyLoad(playerId: string, date: string, load: StoredDailyLoad): Promise<void> {
  const teamId = await getDefaultTeamId();
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
      },
      { onConflict: "team_id,player_id,date" }
    )
  );
  if (error) throw new Error(error.message);
}

export async function getDailyLoad(playerId: string, date: string): Promise<StoredDailyLoad | undefined> {
  try {
    const teamId = await getDefaultTeamId();
    if (!teamId) return undefined;
    const supabase = createAdminClient();
    const { data, error } = await withTimeout(
      supabase
        .from("daily_load")
        .select("total_aal, target_aal, deficit_load, deficit_min, intensity_band")
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
    };
  } catch {
    return undefined;
  }
}

// 直近N日で実データが存在する分だけ返す(§7 ACWR計算に使用)。存在しない日は含めない。
export async function getRecentTotalAal(
  playerId: string,
  uptoDateIso: string,
  days: number
): Promise<{ date: string; totalAal: number }[]> {
  try {
    const teamId = await getDefaultTeamId();
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
    const teamId = await getDefaultTeamId();
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
    const teamId = await getDefaultTeamId();
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
