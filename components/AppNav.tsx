"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// lucide 系のストロークアイコン(インラインSVG・依存なし)
const ICONS: Record<string, React.ReactNode> = {
  dashboard: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </svg>
  ),
  players: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  injuries: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 14c1.5-1.4 3-3.2 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.8 0-3 .5-4.5 2-1.5-1.5-2.7-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.1 3 5.5l7 7Z" />
      <path d="M3.2 12h5.3l1.5-3 3 6 1.5-3h5.3" />
    </svg>
  ),
  nutrition: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
      <path d="M7 2v20" />
      <path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" />
    </svg>
  ),
  survey: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="8" y="2" width="8" height="4" rx="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <path d="m9 14 2 2 4-4" />
    </svg>
  ),
  kinexon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="M7 10l5 5 5-5" />
      <path d="M12 15V3" />
    </svg>
  ),
  settings: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
    </svg>
  ),
};

type Role = "admin" | "medical" | "nutrition" | "coach" | "player";

// §3の権限表に対応するナビ項目ごとの許可ロール。"all"はログイン済みなら誰でも。
const NAV_ITEMS: { href: string; icon: string; label: string; roles: Role[] | "all" }[] = [
  { href: "/", icon: "dashboard", label: "ホーム", roles: ["admin", "medical", "nutrition", "coach"] },
  { href: "/players", icon: "players", label: "選手", roles: ["admin", "medical", "coach"] },
  { href: "/injuries", icon: "injuries", label: "怪我・ケア", roles: ["admin", "medical", "coach"] },
  { href: "/nutrition", icon: "nutrition", label: "栄養", roles: ["admin", "medical", "nutrition"] },
  { href: "/survey", icon: "survey", label: "入力", roles: ["admin", "player"] },
  { href: "/kinexon", icon: "kinexon", label: "取込み", roles: ["admin"] },
  { href: "/settings", icon: "settings", label: "設定", roles: ["admin"] },
];

export default function AppNav({
  role,
  isSuperAdmin,
  isTeamManager,
  playerId,
}: {
  role: Role | null;
  isSuperAdmin: boolean;
  isTeamManager: boolean;
  playerId: string | null;
}) {
  const pathname = usePathname();

  // 選手roleは自分のページ+コンディション入力の2つだけの専用ナビにする。
  if (role === "player" && !isSuperAdmin) {
    const items = [
      { href: playerId ? `/players/${playerId}` : "/survey", icon: "players", label: "マイページ" },
      { href: "/survey", icon: "survey", label: "入力" },
    ];
    return (
      <nav className="rail">
        {items.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href} className={active ? "active" : ""}>
              {ICONS[item.icon]}
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    );
  }

  const visibleItems = NAV_ITEMS.filter(
    (item) =>
      isSuperAdmin ||
      item.roles === "all" ||
      (role && item.roles.includes(role)) ||
      // isTeamManager(§ユーザー管理権限)はroleと独立したフラグ。設定画面は
      // role=adminでなくてもメンバー管理を任された人なら表示する(/settingsページ側の
      // canManageUsers判定と揃える)。
      (item.href === "/settings" && isTeamManager)
  );

  return (
    <nav className="rail">
      {visibleItems.map((item) => {
        const active =
          item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        return (
          <Link key={item.href} href={item.href} className={active ? "active" : ""}>
            {ICONS[item.icon]}
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
