import { withTimeout } from "@/lib/supabase/admin";
import { createClient as createServerSupabase } from "@/lib/supabase/server";
import { getCurrentTeamId } from "@/lib/supabase/team";
import { EDIT_INJURIES, requireRole } from "@/lib/auth/permissions";

interface CreateBody {
  playerId: string;
  diagnosis: string;
  bodyPart?: string;
  side?: string;
  onsetDate: string;
  mechanism: "接触" | "非接触";
  status: "out" | "part" | "watch";
  rtpPhase?: string;
  rtpTargetDate?: string;
  note?: string;
  updatedBy?: string;
}

// 新規登録(§5.4: admin/medicalは編集可 の「新規」側)
export async function POST(request: Request) {
  try {
    await requireRole(EDIT_INJURIES);
    const body = (await request.json()) as CreateBody;

    if (body.rtpTargetDate && body.rtpTargetDate < body.onsetDate) {
      return Response.json({ ok: false, error: "復帰予定日は受傷日より前に設定できません。" }, { status: 400 });
    }

    const teamId = await getCurrentTeamId();
    if (!teamId) {
      return Response.json({ ok: false, error: "チーム情報が見つかりません(Supabaseに接続できない可能性があります)。" }, { status: 503 });
    }

    // 要配慮情報のため、ログイン中ユーザーのセッションでアクセスしてRLSにも判定させる。
    const supabase = await createServerSupabase();
    const { error } = await withTimeout(
      supabase.from("injuries").insert({
        team_id: teamId,
        player_id: body.playerId,
        diagnosis: body.diagnosis,
        body_part: body.bodyPart || null,
        side: body.side || null,
        onset_date: body.onsetDate,
        mechanism: body.mechanism,
        status: body.status,
        rtp_phase: body.rtpPhase || null,
        rtp_target_date: body.rtpTargetDate || null,
        note: body.note || null,
        updated_by: body.updatedBy || null,
      })
    );

    if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ ok: false, error: e instanceof Error ? e.message : "接続に失敗しました" }, { status: 503 });
  }
}

interface UpdateBody {
  injuryId: string;
  status?: "out" | "part" | "watch";
  rtpPhase?: string;
  rtpTargetDate?: string | null;
  returnDate?: string | null;
  note?: string;
  updatedBy?: string;
}

// 既存の怪我レコードの編集(§5.4: admin/medicalは編集可)
export async function PATCH(request: Request) {
  try {
    await requireRole(EDIT_INJURIES);
    const body = (await request.json()) as UpdateBody;
    const supabase = await createServerSupabase();

    if (body.rtpTargetDate) {
      const { data: existing } = await withTimeout(
        supabase.from("injuries").select("onset_date").eq("injury_id", body.injuryId).maybeSingle()
      );
      if (existing && body.rtpTargetDate < existing.onset_date) {
        return Response.json({ ok: false, error: "復帰予定日は受傷日より前に設定できません。" }, { status: 400 });
      }
    }

    const { error } = await withTimeout(
      supabase
        .from("injuries")
        .update({
          status: body.status,
          rtp_phase: body.rtpPhase,
          rtp_target_date: body.rtpTargetDate,
          return_date: body.returnDate,
          note: body.note,
          updated_by: body.updatedBy || null,
          updated_at: new Date().toISOString(),
        })
        .eq("injury_id", body.injuryId)
    );

    if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ ok: false, error: e instanceof Error ? e.message : "接続に失敗しました" }, { status: 503 });
  }
}
