import type { Metadata } from "next";
import "./globals.css";
import AppNav from "@/components/AppNav";
import UserMenu from "@/components/UserMenu";
import LogoutButton from "@/components/LogoutButton";
import TeamSwitcher from "@/components/TeamSwitcher";
import { getCurrentUser } from "@/lib/auth/session";
import { getCurrentTeamId } from "@/lib/supabase/team";
import { listAllTeams } from "@/lib/data/teams-repo";

export const metadata: Metadata = {
  title: "Athrens",
  description: "神戸ストークス パフォーマンスチーム データ管理",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getCurrentUser();
  const unregistered = !!user && !user.role && !user.isSuperAdmin;
  const [teams, currentTeamId] = user?.isSuperAdmin
    ? await Promise.all([listAllTeams(), getCurrentTeamId()])
    : [[], null];

  return (
    <html lang="ja">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Zen+Kaku+Gothic+New:wght@400;500;700&family=JetBrains+Mono:wght@400;600;700&display=swap"
        />
      </head>
      <body>
        {unregistered ? (
          <div style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center", padding: 24 }}>
            <div className="card" style={{ maxWidth: 420, width: "100%", textAlign: "center" }}>
              <h1 style={{ fontSize: 16, fontWeight: 700, marginBottom: 10 }}>アクセス権限がありません</h1>
              <p className="note" style={{ marginBottom: 4 }}>
                <b>{user!.email}</b> はまだ登録されていません。
              </p>
              <p className="note" style={{ marginBottom: 16 }}>
                管理者に連絡して、アカウントを登録してもらってください。
              </p>
              <LogoutButton />
            </div>
          </div>
        ) : (
          <>
            <AppNav
              role={user?.role ?? null}
              isSuperAdmin={user?.isSuperAdmin ?? false}
              playerId={user?.playerId ?? null}
            />
            <div className="app-body">
              <header className="topbar">
                <div className="logo">KS</div>
                <div>
                  <h1>Athrens</h1>
                  <div className="sub">神戸ストークス パフォーマンスチーム データ管理</div>
                </div>
                <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
                  {user?.isSuperAdmin && teams.length > 0 && (
                    <TeamSwitcher teams={teams} currentTeamId={currentTeamId} />
                  )}
                  {user && <UserMenu email={user.email} role={user.role} />}
                </div>
              </header>
              <main>{children}</main>
            </div>
          </>
        )}
      </body>
    </html>
  );
}
