import Link from "next/link";
import { PLAYERS, STATUS_LABEL } from "@/lib/data/seed";

const STATUS_DOT: Record<string, string> = {
  ok: "var(--green)",
  warn: "var(--yellow)",
  part: "var(--yellow)",
  out: "var(--red)",
};

export default function PlayersPage() {
  return (
    <>
      <h2 className="section-title">
        選手一覧{" "}
        <span style={{ fontSize: 12, color: "var(--muted)", fontWeight: 400 }}>
          アイコンをクリックで個人ページへ
        </span>
      </h2>
      <div className="players">
        {PLAYERS.map((p) => (
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
