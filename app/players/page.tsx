import Link from "next/link";
import { redirect } from "next/navigation";
import { STATUS_LABEL } from "@/lib/data/seed";
import { getTeamPlayers } from "@/lib/data/players-repo";
import { getCurrentUser } from "@/lib/auth/session";
import { VIEW_PLAYERS, hasRole, isPlayerRole } from "@/lib/auth/permissions";

// Kinexon取込み(ローカルstore)の最新反映を毎回見るため静的化しない
export const dynamic = "force-dynamic";

const STATUS_DOT: Record<string, string> = {
  ok: "var(--green)",
  warn: "var(--yellow)",
  part: "var(--yellow)",
  out: "var(--red)",
};

export default async function PlayersPage() {
  const user = await getCurrentUser();
  if (isPlayerRole(user)) {
    redirect(user!.playerId ? `/players/${user!.playerId}` : "/survey");
  }
  if (!hasRole(user, VIEW_PLAYERS)) {
    return (
      <div className="card" style={{ maxWidth: 480 }}>
        <p className="note">この画面を見る権限がありません。</p>
      </div>
    );
  }

  const { players } = await getTeamPlayers();

  return (
    <>
      <h2 className="section-title">
        選手一覧{" "}
        <span style={{ fontSize: 12, color: "var(--muted)", fontWeight: 400 }}>
          アイコンをクリックで個人ページへ
        </span>
      </h2>
      <div className="players">
        {players.map((p) => (
          <Link key={p.playerId} href={`/players/${p.playerId}`} className="pcard" style={{ textDecoration: "none", color: "inherit" }}>
            <div className="avatar" style={{ background: p.color }}>
              {p.no}
              <span className="dot" style={{ background: STATUS_DOT[p.status] }} />
            </div>
            <div className="nm">{p.nameJa}</div>
            <div className="pos">
              #{p.no} / {p.position}
            </div>
            <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 4 }}>{STATUS_LABEL[p.status]}</div>
          </Link>
        ))}
      </div>
    </>
  );
}
