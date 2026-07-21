import { createClient as createServerSupabase } from "../supabase/server";
import { createAdminClient } from "../supabase/admin";

export type Role = "admin" | "medical" | "nutrition" | "coach" | "player";

export interface CurrentUser {
  id: string;
  email: string;
  role: Role | null; // null = ログインはできたが usersテーブルに未登録(§5.1「管理者に連絡」)
  teamId: string | null;
  playerId: string | null;
  isTeamManager: boolean; // そのチームでユーザー管理ができるか(roleとは独立したフラグ)
  isSuperAdmin: boolean; // プラットフォーム全体の運営者権限(将来の複数チーム横断管理用)
}

// 現在ログイン中のユーザーを取得し、usersテーブル・platform_adminsと照合する(§3・§5.1)。
// 未ログインなら null。
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // 照合はRLSに関わらずここで行う(権限判定そのものなのでadminクライアントで読む)
  const admin = createAdminClient();
  const [{ data: userRow }, { data: platformAdminRow }] = await Promise.all([
    admin.from("users").select("role, team_id, player_id, is_team_manager").eq("user_id", user.id).maybeSingle(),
    admin.from("platform_admins").select("user_id").eq("user_id", user.id).maybeSingle(),
  ]);

  return {
    id: user.id,
    email: user.email ?? "",
    role: (userRow?.role as Role | undefined) ?? null,
    teamId: userRow?.team_id ?? null,
    playerId: userRow?.player_id ?? null,
    isTeamManager: userRow?.is_team_manager ?? false,
    isSuperAdmin: !!platformAdminRow,
  };
}
