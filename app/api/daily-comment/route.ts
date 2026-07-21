import { createAdminClient, withTimeout } from "@/lib/supabase/admin";
import { getDefaultTeamId } from "@/lib/supabase/team";

interface Body {
  date: string;
  comment: string;
  updatedBy?: string;
}

// S&Cコメントの登録・更新(§5.2: decisionsまたは専用列。ここではdaily_commentsに1日1件)
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Body;

    const teamId = await getDefaultTeamId();
    if (!teamId) {
      return Response.json(
        { ok: false, error: "チーム情報が見つかりません(Supabaseに接続できない可能性があります)。" },
        { status: 503 }
      );
    }

    const supabase = createAdminClient();
    const { error } = await withTimeout(
      supabase.from("daily_comments").upsert(
        {
          team_id: teamId,
          date: body.date,
          comment: body.comment,
          updated_by: body.updatedBy || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "team_id,date" }
      )
    );

    if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ ok: false, error: e instanceof Error ? e.message : "接続に失敗しました" }, { status: 503 });
  }
}
