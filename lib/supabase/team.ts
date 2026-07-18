import { createAdminClient } from "./admin";

let cachedTeamId: string | null = null;

// MVPはチーム1件のみ(§8)。マルチテナント化後はログインユーザーのteam_idに置き換える。
export async function getDefaultTeamId(): Promise<string | null> {
  if (cachedTeamId) return cachedTeamId;
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("teams").select("team_id").limit(1).maybeSingle();
  if (error || !data) return null;
  cachedTeamId = data.team_id;
  return cachedTeamId;
}
