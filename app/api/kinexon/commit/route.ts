import { commitImport, processCsv } from "@/lib/kinexon/importer";
import { appendSyncLog } from "@/lib/store/fileStore";
import type { ParsedCsv } from "@/lib/kinexon/csv";
import type { ColumnMapping } from "@/lib/kinexon/mapping";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    parsed: ParsedCsv;
    mapping: ColumnMapping;
    fileName?: string;
  };
  const results = processCsv(body.parsed, body.mapping);
  const summary = commitImport(results);

  appendSyncLog({
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
}
