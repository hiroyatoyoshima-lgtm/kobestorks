"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "📊 ダッシュボード" },
  { href: "/players", label: "👤 選手" },
  { href: "/injuries", label: "🏥 怪我人・ケア" },
  { href: "/nutrition", label: "🍚 栄養" },
  { href: "/survey", label: "📝 コンディション入力" },
  { href: "/kinexon", label: "📥 Kinexon取込み" },
];

export default function AppNav() {
  const pathname = usePathname();

  return (
    <nav className="app-nav">
      {NAV_ITEMS.map((item) => {
        const active =
          item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        return (
          <Link key={item.href} href={item.href} className={active ? "active" : ""}>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
