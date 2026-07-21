import { createAdminClient, withTimeout } from "./admin";

let cachedTeamId: string | null = null;
let inFlight: Promise<string | null> | null = null;

// MVPはチーム1件のみ(§8)。マルチテナント化後はログインユーザーのteam_idに置き換える。
// 同一リクエスト内で複数箇所から同時に呼ばれても、Supabaseへの問い合わせは1回だけにする
// (Promise.allで並列に呼ぶダッシュボードなどでの無駄な往復を防ぐ)。
export async function getDefaultTeamId(): Promise<string | null> {
  if (cachedTeamId) return cachedTeamId;
  if (inFlight) return inFlight;

  inFlight = (async () => {
    try {
      const supabase = createAdminClient();
      const { data, error } = await withTimeout(
        supabase.from("teams").select("team_id").limit(1).maybeSingle()
      );
      if (error || !data) return null;
      cachedTeamId = data.team_id;
      return cachedTeamId;
    } catch {
      return null;
    } finally {
      inFlight = null;
    }
  })();

  return inFlight;
}
