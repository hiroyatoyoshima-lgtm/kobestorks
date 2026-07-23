import { createAdminClient, withTimeout } from "../supabase/admin";
import { getCurrentUser } from "../auth/session";
import { getCurrentTeamId } from "../supabase/team";

export type AccessAction = "view" | "create" | "update";
export type AccessResource = "player_profile" | "injuries_list" | "injury" | "wellness" | "care_log" | "inbody";

// 要配慮情報(怪我・ウェルネス・InBody・ケア記録)へのアクセスを記録する(§9)。
// ログ記録自体が失敗しても、本来の閲覧・保存処理は止めない。
export async function logAccess(action: AccessAction, resource: AccessResource, playerId?: string): Promise<void> {
  try {
    const [user, teamId] = await Promise.all([getCurrentUser(), getCurrentTeamId()]);
    if (!user || !teamId) return;

    const admin = createAdminClient();
    await withTimeout(
      admin.from("access_logs").insert({
        team_id: teamId,
        actor_user_id: user.id,
        actor_email: user.email,
        actor_role: user.role,
        action,
        resource,
        player_id: playerId ?? null,
      })
    );
  } catch {
    // no-op
  }
}
