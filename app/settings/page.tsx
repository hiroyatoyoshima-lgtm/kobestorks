import { getTeamSettings } from "@/lib/data/settings-repo";
import { listUsers } from "@/lib/data/users-repo";
import { getCurrentUser } from "@/lib/auth/session";
import { PLAYERS } from "@/lib/data/seed";
import SettingsForm from "@/components/SettingsForm";
import UserManagement from "@/components/UserManagement";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const currentUser = await getCurrentUser();

  const canManageUsers = !!currentUser && (currentUser.isSuperAdmin || currentUser.isTeamManager);
  const canEditThresholds = !!currentUser && (currentUser.isSuperAdmin || currentUser.role === "admin");

  if (!canManageUsers && !canEditThresholds) {
    return (
      <div className="card" style={{ maxWidth: 480 }}>
        <h2 className="section-title">設定</h2>
        <p className="note">この画面には権限がある人のみアクセスできます。管理者に連絡してください。</p>
      </div>
    );
  }

  const users = canManageUsers ? await listUsers() : [];
  const { settings, source } = canEditThresholds ? await getTeamSettings() : { settings: null, source: "seed" as const };
  const isLive = source === "supabase";

  return (
    <>
      {canManageUsers && (
        <>
          <h2 className="section-title">
            ユーザー管理{" "}
            <span style={{ fontSize: 12, color: "var(--muted)", fontWeight: 400 }}>
              チーム管理者用・ログインできる人とロールを管理(§3)
            </span>
          </h2>
          <UserManagement users={users} players={PLAYERS} />
        </>
      )}

      {canEditThresholds && settings && (
        <>
          <h2 className="section-title mt" style={{ marginTop: canManageUsers ? 32 : 0 }}>
            しきい値設定{" "}
            <span style={{ fontSize: 12, color: "var(--muted)", fontWeight: 400 }}>
              管理者用・ACWR/AAL/アラート閾値(§6・§7)
            </span>
          </h2>
          <SettingsForm settings={settings} editable={isLive} />
        </>
      )}
    </>
  );
}
