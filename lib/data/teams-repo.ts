import { createAdminClient, withTimeout } from "../supabase/admin";

export interface TeamOption {
  teamId: string;
  name: string;
}

// プラットフォーム管理者のチーム切り替えUI向け(§8)。呼び出し側でisSuperAdminを確認すること
// (RLSを迂回するadminクライアントで全チームを横断取得するため)。
export async function listAllTeams(): Promise<TeamOption[]> {
  const supabase = createAdminClient();
  const { data, error } = await withTimeout(supabase.from("teams").select("team_id, name").order("name"));
  if (error) return [];
  return (data ?? []).map((r) => ({ teamId: r.team_id, name: r.name }));
}
