import { createAdminClient, withTimeout } from "@/lib/supabase/admin";
import { getDefaultTeamId } from "@/lib/supabase/team";
import { getCurrentUser } from "@/lib/auth/session";

interface WellnessBody {
  playerId: string;
  sleepHours: number;
  sleepQuality: number;
  fatigue: number;
  soreness: number;
  stress: number;
  painFlag: boolean;
  comment?: string;
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error("ログインが必要です。");

    const body = (await request.json()) as WellnessBody;

    // 選手roleは自分自身のplayer_idでしか送信できない(なりすまし防止・§3)。
    // それ以外は admin(またはプラットフォーム管理者)のみ代理送信を許可。
    let playerId: string;
    if (user.isSuperAdmin || user.role === "admin") {
      playerId = body.playerId;
    } else if (user.role === "player") {
      if (!user.playerId) throw new Error("選手情報が紐づいていません。管理者に連絡してください。");
      playerId = user.playerId;
    } else {
      throw new Error("この操作を行う権限がありません。");
    }

    const teamId = await getDefaultTeamId();
    if (!teamId) {
      throw new Error("チーム情報が見つかりません(Supabaseに接続できない可能性があります)。");
    }

    const supabase = createAdminClient();
    const today = new Date().toISOString().slice(0, 10);

    // (team_id, player_id, date) が一致する行は上書き(§5.6: 当日再送信は上書き)
    const { error } = await withTimeout(
      supabase.from("wellness").upsert(
        {
          team_id: teamId,
          player_id: playerId,
          date: today,
          sleep_hours: body.sleepHours,
          sleep_quality: body.sleepQuality,
          fatigue: body.fatigue,
          soreness: body.soreness,
          stress: body.stress,
          pain_flag: body.painFlag,
          pain_note: body.painFlag ? body.comment ?? null : null,
          comment: body.comment ?? null,
          source: "app",
          submitted_at: new Date().toISOString(),
        },
        { onConflict: "team_id,player_id,date" }
      )
    );

    if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ ok: false, error: e instanceof Error ? e.message : "接続に失敗しました" }, { status: 503 });
  }
}
