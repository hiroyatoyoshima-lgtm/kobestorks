import { commitImport, processCsv } from "@/lib/inbody/importer";
import { ADMIN_ONLY, requireRole } from "@/lib/auth/permissions";
import { logAccess } from "@/lib/audit/log";
import { getTeamPlayers } from "@/lib/data/players-repo";
import type { ParsedCsv } from "@/lib/kinexon/csv";
import type { ColumnMapping } from "@/lib/inbody/mapping";

export async function POST(request: Request) {
  try {
    await requireRole(ADMIN_ONLY);
    const body = (await request.json()) as { parsed: ParsedCsv; mapping: ColumnMapping };
    const { players } = await getTeamPlayers();
    const results = processCsv(body.parsed, body.mapping, players);
    const summary = await commitImport(results);
    await logAccess("create", "inbody");
    return Response.json(summary);
  } catch (e) {
    return Response.json({ ok: false, error: e instanceof Error ? e.message : "取込みに失敗しました" }, { status: 503 });
  }
}
