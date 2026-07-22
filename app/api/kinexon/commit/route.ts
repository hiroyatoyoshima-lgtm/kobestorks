import { commitImport, processCsv } from "@/lib/kinexon/importer";
import { appendSyncLog } from "@/lib/data/kinexon-repo";
import { ADMIN_ONLY, requireRole } from "@/lib/auth/permissions";
import { getTeamPlayers } from "@/lib/data/players-repo";
import type { ParsedCsv } from "@/lib/kinexon/csv";
import type { ColumnMapping } from "@/lib/kinexon/mapping";

export async function POST(request: Request) {
  try {
    await requireRole(ADMIN_ONLY);
    const body = (await request.json()) as {
      parsed: ParsedCsv;
      mapping: ColumnMapping;
      fileName?: string;
      sessionDate?: string;
    };
    const { players } = await getTeamPlayers();
    const results = processCsv(body.parsed, body.mapping, players, body.sessionDate);
    const summary = await commitImport(results, players);

    await appendSyncLog({
      id: `${Date.now()}`,
      ranAt: new Date().toISOString(),
      fileName: body.fileName ?? "(不明なファイル)",
      status: summary.errorCount > 0 && summary.okCount === 0 ? "error" : "ok",
      rowCount: summary.rowCount,
      matchedPlayerDates: summary.affectedPlayerDates.length,
      unmatchedNames: summary.unmatchedNames,
      errorRowCount: summary.errorCount,
    });

    return Response.json(summary);
  } catch (e) {
    return Response.json({ ok: false, error: e instanceof Error ? e.message : "取込みに失敗しました" }, { status: 403 });
  }
}
