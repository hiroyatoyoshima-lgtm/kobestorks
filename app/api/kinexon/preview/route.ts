import { processCsv, summarize } from "@/lib/kinexon/importer";
import { ADMIN_ONLY, requireRole } from "@/lib/auth/permissions";
import { getTeamPlayers } from "@/lib/data/players-repo";
import type { ParsedCsv } from "@/lib/kinexon/csv";
import type { ColumnMapping } from "@/lib/kinexon/mapping";

export async function POST(request: Request) {
  try {
    await requireRole(ADMIN_ONLY);
    const body = (await request.json()) as { parsed: ParsedCsv; mapping: ColumnMapping };
    const { players } = await getTeamPlayers();
    const results = processCsv(body.parsed, body.mapping, players);
    return Response.json(summarize(results));
  } catch (e) {
    return Response.json({ ok: false, error: e instanceof Error ? e.message : "処理に失敗しました" }, { status: 403 });
  }
}
