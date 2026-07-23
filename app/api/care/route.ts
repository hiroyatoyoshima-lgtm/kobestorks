import { withTimeout } from "@/lib/supabase/admin";
import { createClient as createServerSupabase } from "@/lib/supabase/server";
import { getCurrentTeamId } from "@/lib/supabase/team";
import { EDIT_INJURIES, requireRole } from "@/lib/auth/permissions";
import { logAccess } from "@/lib/audit/log";

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

    const teamId = await getCurrentTeamId();
    if (!teamId) {
      return Response.json({ ok: false, error: "チーム情報が見つかりません(Supabaseに接続できない可能性があります)。" }, { status: 503 });
    }

    const supabase = await createServerSupabase();
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
    await logAccess("create", "care_log", body.playerId);
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
    const supabase = await createServerSupabase();
    const { error } = await withTimeout(supabase.from("care_log").update({ done }).eq("care_id", careId));
    if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });
    await logAccess("update", "care_log");
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ ok: false, error: e instanceof Error ? e.message : "接続に失敗しました" }, { status: 503 });
  }
}
