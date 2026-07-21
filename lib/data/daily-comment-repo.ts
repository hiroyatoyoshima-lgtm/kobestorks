import { createAdminClient, withTimeout } from "../supabase/admin";
import { getDefaultTeamId } from "../supabase/team";

export interface DailyCommentResult {
  comment: string | null;
  source: "supabase" | "seed";
}

// Supabase未接続・エラー時は null を返し、呼び出し側でダミーコメントにフォールバックする。
export async function getDailyComment(date: string): Promise<DailyCommentResult | null> {
  try {
    const teamId = await getDefaultTeamId();
    if (!teamId) return null;
    const supabase = createAdminClient();
    const { data, error } = await withTimeout(
      supabase.from("daily_comments").select("comment").eq("team_id", teamId).eq("date", date).maybeSingle()
    );
    if (error) return null;
    return { comment: data?.comment ?? null, source: "supabase" };
  } catch {
    return null;
  }
}
