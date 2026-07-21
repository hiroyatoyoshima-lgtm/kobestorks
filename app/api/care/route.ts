import { createAdminClient, withTimeout } from "@/lib/supabase/admin";
import { getDefaultTeamId } from "@/lib/supabase/team";
import { EDIT_INJURIES, requireRole } from "@/lib/auth/permissions";

interface CreateBody {
  time: string;
  playerId: string;
  menu: string;
  staff?: string;
}

// 本日のケア予定を新規登録
export async function POST(request: Request) {
  try {
    await requireRole(EDIT_INJURIES);
    const body = (await request.json()) as CreateBody;

    const teamId = await getDefaultTeamId();
    if (!teamId) {
      return Response.json({ ok: false, error: "チーム情報が見つかりません(Supabaseに接続できない可能性があります)。" }, { status: 503 });
    }

    const supabase = createAdminClient();
    const today = new Date().toISOString().slice(0, 10);

    const { error } = await withTimeout(
      supabase.from("care_log").insert({
        team_id: teamId,
        date: today,
        time: body.time,
        player_id: body.playerId,
        menu: body.menu,
        staff: body.staff || null,
        done: false,
      })
    );

    if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ ok: false, error: e instanceof Error ? e.message : "接続に失敗しました" }, { status: 503 });
  }
}

// 実施チェックの更新
export async function PATCH(request: Request) {
  try {
    await requireRole(EDIT_INJURIES);
    const { careId, done } = (await request.json()) as { careId: string; done: boolean };
    const supabase = createAdminClient();
    const { error } = await withTimeout(supabase.from("care_log").update({ done }).eq("care_id", careId));
    if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ ok: false, error: e instanceof Error ? e.message : "接続に失敗しました" }, { status: 503 });
  }
}
