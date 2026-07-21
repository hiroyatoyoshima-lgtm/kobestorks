import { createAdminClient, withTimeout } from "@/lib/supabase/admin";
import { getDefaultTeamId } from "@/lib/supabase/team";

interface NutritionBody {
  timing: string;
  menu: string;
  kcal: number | null;
  proteinG: number | null;
  fatG: number | null;
  carbG: number | null;
  playerNote?: string;
  staff?: string;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as NutritionBody;

    const teamId = await getDefaultTeamId();
    if (!teamId) {
      return Response.json(
        { ok: false, error: "チーム情報が見つかりません(Supabaseに接続できない可能性があります)。" },
        { status: 503 }
      );
    }

    const supabase = createAdminClient();
    const today = new Date().toISOString().slice(0, 10);

    const { error } = await withTimeout(
      supabase.from("nutrition").insert({
        team_id: teamId,
        date: today,
        timing: body.timing,
        menu: body.menu,
        kcal: body.kcal,
        protein_g: body.proteinG,
        fat_g: body.fatG,
        carb_g: body.carbG,
        player_note: body.playerNote || null,
        staff: body.staff || null,
      })
    );

    if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ ok: false, error: e instanceof Error ? e.message : "接続に失敗しました" }, { status: 503 });
  }
}
