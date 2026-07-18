import { createAdminClient } from "@/lib/supabase/admin";
import { getDefaultTeamId } from "@/lib/supabase/team";

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
  const body = (await request.json()) as WellnessBody;

  const teamId = await getDefaultTeamId();
  if (!teamId) {
    return Response.json(
      { ok: false, error: "チーム情報が見つかりません。先にSupabaseへのデータ投入(seed-supabase.mjs)を実行してください。" },
      { status: 500 }
    );
  }

  const supabase = createAdminClient();
  const today = new Date().toISOString().slice(0, 10);

  // (team_id, player_id, date) が一致する行は上書き(§5.6: 当日再送信は上書き)
  const { error } = await supabase.from("wellness").upsert(
    {
      team_id: teamId,
      player_id: body.playerId,
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
  );

  if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
