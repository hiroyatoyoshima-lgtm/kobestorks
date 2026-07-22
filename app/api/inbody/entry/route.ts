import { saveInbodyEntries, type InbodyEntry } from "@/lib/data/inbody-repo";
import { ADMIN_ONLY, requireRole } from "@/lib/auth/permissions";

export async function POST(request: Request) {
  try {
    await requireRole(ADMIN_ONLY);
    const body = (await request.json()) as { date: string; entries: InbodyEntry[] };
    if (!body.date) throw new Error("測定日を指定してください。");
    await saveInbodyEntries(body.date, body.entries);
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ ok: false, error: e instanceof Error ? e.message : "保存に失敗しました" }, { status: 400 });
  }
}
