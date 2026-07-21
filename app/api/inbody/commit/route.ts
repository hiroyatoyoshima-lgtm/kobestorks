import { commitImport, processCsv } from "@/lib/inbody/importer";
import type { ParsedCsv } from "@/lib/kinexon/csv";
import type { ColumnMapping } from "@/lib/inbody/mapping";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { parsed: ParsedCsv; mapping: ColumnMapping };
    const results = processCsv(body.parsed, body.mapping);
    const summary = await commitImport(results);
    return Response.json(summary);
  } catch (e) {
    return Response.json({ ok: false, error: e instanceof Error ? e.message : "取込みに失敗しました" }, { status: 503 });
  }
}
