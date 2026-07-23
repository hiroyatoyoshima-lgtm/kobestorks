import { cookies } from "next/headers";
import { createAdminClient, withTimeout } from "./admin";
import { createClient as createServerSupabase } from "./server";

// プラットフォーム管理者(isSuperAdmin)がチームを切り替えて閲覧する際に使うCookie(§8将来対応)。
// team-switch APIでのみ設定・削除する。値の真偽はここではなく毎回platform_adminsで検証する
// (Cookie自体はブラウザ側で自由に書き換えられるため、権限の根拠にしない)。
export const TEAM_OVERRIDE_COOKIE = "admin_team_view";

// ログイン中ユーザーのteam_idを返す(§3, §8のマルチテナント化)。
// 照合はRLSに関わらずusersテーブルを直接参照する(getCurrentUserと同じ考え方、§5.1)。
// 未ログイン、またはusersテーブルに未登録(team_id紐付けなし)ならnull。
export async function getCurrentTeamId(): Promise<string | null> {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const admin = createAdminClient();

  const overrideTeamId = (await cookies()).get(TEAM_OVERRIDE_COOKIE)?.value;
  if (overrideTeamId) {
    const { data: platformAdminRow } = await withTimeout(
      admin.from("platform_admins").select("user_id").eq("user_id", user.id).maybeSingle()
    );
    if (platformAdminRow) return overrideTeamId;
  }

  const { data, error } = await withTimeout(
    admin.from("users").select("team_id").eq("user_id", user.id).maybeSingle()
  );
  if (error || !data) return null;
  return data.team_id;
}
