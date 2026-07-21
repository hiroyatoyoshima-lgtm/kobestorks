import { saveTeamSettings } from "@/lib/data/settings-repo";
import type { TeamSettings } from "@/lib/settings";

export async function POST(request: Request) {
  try {
    const settings = (await request.json()) as TeamSettings;
    await saveTeamSettings(settings);
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ ok: false, error: e instanceof Error ? e.message : "保存に失敗しました" }, { status: 503 });
  }
}
