import { processCsv, summarize } from "@/lib/kinexon/importer";
import type { ParsedCsv } from "@/lib/kinexon/csv";
import type { ColumnMapping } from "@/lib/kinexon/mapping";

export async function POST(request: Request) {
  const body = (await request.json()) as { parsed: ParsedCsv; mapping: ColumnMapping };
  const results = processCsv(body.parsed, body.mapping);
  return Response.json(summarize(results));
}
