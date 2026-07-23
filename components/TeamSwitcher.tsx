"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { TeamOption } from "@/lib/data/teams-repo";

// プラットフォーム管理者(isSuperAdmin)向け。チームを切り替えて他チームのデータを閲覧する(§8将来対応)。
export default function TeamSwitcher({
  teams,
  currentTeamId,
}: {
  teams: TeamOption[];
  currentTeamId: string | null;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleChange(teamId: string) {
    setLoading(true);
    try {
      await fetch("/api/admin/team-switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId: teamId || null }),
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <select
      value={currentTeamId ?? ""}
      onChange={(e) => handleChange(e.target.value)}
      disabled={loading}
      style={{
        fontSize: 12.5,
        fontWeight: 600,
        padding: "4px 8px",
        borderRadius: 6,
        border: "1px solid var(--border)",
        background: "var(--panel)",
        color: "inherit",
      }}
    >
      {teams.map((t) => (
        <option key={t.teamId} value={t.teamId}>
          {t.name}
        </option>
      ))}
    </select>
  );
}
