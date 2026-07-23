import { createAdminClient, withTimeout } from "../supabase/admin";
import { getCurrentTeamId } from "../supabase/team";
import type { Role } from "../auth/session";

export interface TeamUser {
  userId: string;
  email: string;
  role: Role;
  playerId: string | null;
  isTeamManager: boolean;
  createdAt: string;
}

// プラットフォーム管理者(platform_admins)は開発者用のクロスチーム越境アカウントなので、
// チーム管理者が見るこの一覧には出さない(自チームのメンバーではないため)。
export async function listUsers(): Promise<TeamUser[]> {
  const teamId = await getCurrentTeamId();
  if (!teamId) return [];
  const supabase = createAdminClient();
  const [{ data, error }, { data: platformAdmins }] = await Promise.all([
    withTimeout(supabase.from("users").select("*").eq("team_id", teamId).order("created_at", { ascending: true })),
    withTimeout(supabase.from("platform_admins").select("user_id")),
  ]);
  if (error) return [];
  const platformAdminIds = new Set((platformAdmins ?? []).map((r) => r.user_id));
  return (data ?? [])
    .filter((r) => !platformAdminIds.has(r.user_id))
    .map((r) => ({
      userId: r.user_id,
      email: r.email,
      role: r.role as Role,
      playerId: r.player_id,
      isTeamManager: r.is_team_manager ?? false,
      createdAt: r.created_at,
    }));
}

// メールアドレスからユーザーを新規登録する。auth.usersに存在しなければ作成し(招待扱い)、
// usersテーブルにロールを紐付ける。
export async function createUser(
  email: string,
  role: Role,
  playerId: string | null,
  isTeamManager: boolean
): Promise<void> {
  const teamId = await getCurrentTeamId();
  if (!teamId) throw new Error("チーム情報が見つかりません。");

  const supabase = createAdminClient();

  const { data: list, error: listErr } = await withTimeout(supabase.auth.admin.listUsers());
  if (listErr) throw new Error(listErr.message);

  let authUserId = list.users.find((u) => u.email === email)?.id;

  if (!authUserId) {
    const { data, error } = await withTimeout(supabase.auth.admin.createUser({ email, email_confirm: true }));
    if (error) throw new Error(error.message);
    authUserId = data.user.id;
  }

  const { error: upsertErr } = await withTimeout(
    supabase.from("users").upsert(
      { user_id: authUserId, team_id: teamId, email, role, player_id: playerId, is_team_manager: isTeamManager },
      { onConflict: "user_id" }
    )
  );
  if (upsertErr) throw new Error(upsertErr.message);
}

export async function updateUserRole(
  userId: string,
  role: Role,
  playerId: string | null,
  isTeamManager: boolean
): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await withTimeout(
    supabase.from("users").update({ role, player_id: playerId, is_team_manager: isTeamManager }).eq("user_id", userId)
  );
  if (error) throw new Error(error.message);
}

// アクセス権限の取り消し(usersテーブルから外すだけ。auth.usersのアカウント自体は残す)。
export async function removeUser(userId: string): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await withTimeout(supabase.from("users").delete().eq("user_id", userId));
  if (error) throw new Error(error.message);
}
