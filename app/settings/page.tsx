import { getTeamSettings } from "@/lib/data/settings-repo";
import { listUsers } from "@/lib/data/users-repo";
import { getTeamPlayers } from "@/lib/data/players-repo";
import { getCurrentUser } from "@/lib/auth/session";
import SettingsForm from "@/components/SettingsForm";
import UserManagement from "@/components/UserManagement";
import PlayerManagement from "@/components/PlayerManagement";
import SettingsTabs, { type SettingsTab } from "@/components/SettingsTabs";

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

  const [{ players: activePlayers }, users, { settings, source }, { players: allPlayers, source: playersSource }] =
    await Promise.all([
      getTeamPlayers(),
      canManageUsers ? listUsers() : Promise.resolve([]),
      canEditThresholds ? getTeamSettings() : Promise.resolve({ settings: null, source: "seed" as const }),
      canEditThresholds ? getTeamPlayers({ includeInactive: true }) : Promise.resolve({ players: [], source: "seed" as const }),
    ]);
  const isLive = source === "supabase";

  const tabs: SettingsTab[] = [];

  if (canManageUsers) {
    tabs.push({
      id: "users",
      label: "ユーザー管理",
      content: (
        <>
          <p className="note" style={{ marginBottom: 14 }}>
            チーム管理者用・ログインできる人とロールを管理(§3)
          </p>
          <UserManagement users={users} players={activePlayers} />
        </>
      ),
    });
  }

  if (canEditThresholds) {
    tabs.push({
      id: "players",
      label: "選手管理",
      content: (
        <>
          <p className="note" style={{ marginBottom: 14 }}>
            管理者用・選手マスタ(§4.1)。入れ替わりはここから登録
          </p>
          <PlayerManagement players={allPlayers} source={playersSource} />
        </>
      ),
    });
  }

  if (canEditThresholds && settings) {
    tabs.push({
      id: "thresholds",
      label: "しきい値設定",
      content: (
        <>
          <p className="note" style={{ marginBottom: 14 }}>
            管理者用・ACWR/AAL/アラート閾値(§6・§7)
          </p>
          <SettingsForm settings={settings} editable={isLive} />
        </>
      ),
    });
  }

  return (
    <>
      <h2 className="section-title">設定</h2>
      <SettingsTabs tabs={tabs} />
    </>
  );
}
