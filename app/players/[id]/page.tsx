import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { VIEW_PLAYERS, hasRole, isPlayerRole } from "@/lib/auth/permissions";
import {
  aalTrend,
  careHistory,
  getInbodyData,
  getInjuryForPlayer,
  STATUS_LABEL,
  wellnessTrend,
} from "@/lib/data/player";
import { getTeamPlayer } from "@/lib/data/players-repo";
import { todayISO } from "@/lib/data/dashboard";
import BarLineChart from "@/components/charts/BarLineChart";
import LineTrendChart from "@/components/charts/LineTrendChart";
import InbodyChart from "@/components/charts/InbodyChart";

// Kinexon取込み(ローカルstore)の最新反映を毎回見るため静的化しない
export const dynamic = "force-dynamic";

const STATUS_BADGE: Record<string, string> = {
  ok: "b-ok",
  part: "b-part",
  warn: "b-part",
  out: "b-out",
};

export default async function PlayerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const player = await getTeamPlayer(id);
  if (!player) notFound();

  const user = await getCurrentUser();
  if (isPlayerRole(user)) {
    if (user!.playerId !== id) redirect(user!.playerId ? `/players/${user!.playerId}` : "/survey");
  } else if (!hasRole(user, VIEW_PLAYERS)) {
    return (
      <div className="card" style={{ maxWidth: 480 }}>
        <p className="note">この画面を見る権限がありません。</p>
      </div>
    );
  }

  const injury = await getInjuryForPlayer(player.playerId);
  const { latest: ib, trend: ibTrend, isReal: inbodyIsReal, measuredDate } = await getInbodyData(player);
  const date = todayISO();
  const aal = await aalTrend(player, date);
  const wellness = await wellnessTrend(player, date);
  const history = await careHistory(player);

  return (
    <>
      <Link href="/players" className="back">
        ← 選手一覧へ戻る
      </Link>

      <div className="detail-head">
        <div className="avatar" style={{ background: player.color }}>
          {player.no}
        </div>
        <div className="info">
          <h3>
            {player.nameJa} <span className={`badge ${STATUS_BADGE[player.status]}`}>{STATUS_LABEL[player.status]}</span>
          </h3>
          <p>
            #{player.no} / {player.position} / 身長・体重・生年月日はスプシ連携時に取込
          </p>
        </div>
      </div>

      {injury && (
        <div className={`alert ${injury.status === "out" ? "red" : ""}`} style={{ marginBottom: 14 }}>
          <span>🏥</span>
          <div>
            <span className="who">{injury.diagnosis}</span>(受傷 {injury.onsetDate}・復帰予定{" "}
            {injury.rtpTargetDate ?? "—"}) — {injury.rtpPhase}
          </div>
        </div>
      )}

      <div className="card" style={{ marginBottom: 14 }}>
        <h2 className="section-title">
          InBody{inbodyIsReal && measuredDate ? `(最新測定 ${measuredDate})` : "(最新測定)"}{" "}
          {inbodyIsReal ? (
            <span className="badge b-ok">実データ</span>
          ) : (
            <span style={{ fontSize: 11, color: "var(--muted)", fontWeight: 400 }}>
              ※値はダミー。InBody取込み(管理者)で実測値に切替
            </span>
          )}
        </h2>
        <div className="grid kpi">
          <div className="card">
            <div className="lbl">体重</div>
            <div className="num">
              {ib.weightKg}
              <span style={{ fontSize: 13 }}>kg</span>
            </div>
          </div>
          <div className="card">
            <div className="lbl">骨格筋量</div>
            <div className="num">
              {ib.muscleMassKg}
              <span style={{ fontSize: 13 }}>kg</span>
            </div>
          </div>
          <div className="card">
            <div className="lbl">体脂肪量</div>
            <div className="num">
              {ib.fatMassKg}
              <span style={{ fontSize: 13 }}>kg</span>
            </div>
          </div>
          <div className="card">
            <div className="lbl">体脂肪率</div>
            <div className="num">
              {ib.fatPct}
              <span style={{ fontSize: 13 }}>%</span>
            </div>
          </div>
        </div>
        <div className="chart-box mt" style={{ height: 180 }}>
          <InbodyChart
            labels={ibTrend.labels}
            weightKg={ibTrend.weightKg}
            muscleMassKg={ibTrend.muscleMassKg}
            fatPct={ibTrend.fatPct}
          />
        </div>
      </div>

      <div className="grid two">
        <div className="card">
          <h2 className="section-title">GPS負荷推移(14日)</h2>
          <div className="chart-box">
            <BarLineChart labels={aal.labels} label="PlayerLoad" data={aal.values} color={player.color} />
          </div>
        </div>
        <div className="card">
          <h2 className="section-title">ウェルネス推移(14日)</h2>
          <div className="chart-box">
            <LineTrendChart labels={wellness.labels} label="総合スコア" data={wellness.values} color="#3379c8" />
          </div>
        </div>
      </div>

      <div className="card mt">
        <h2 className="section-title">直近のメモ・ケア履歴</h2>
        {history.length === 0 ? (
          <p className="note">まだケア記録・アンケートのコメントはありません。</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table>
              <thead>
                <tr>
                  <th>日付</th>
                  <th>種別</th>
                  <th>内容</th>
                  <th>記録者</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h, i) => (
                  <tr key={i}>
                    <td style={{ whiteSpace: "nowrap" }}>{h.date}</td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      <span className={`badge ${h.badge}`}>{h.type}</span>
                    </td>
                    <td style={{ minWidth: 160 }}>{h.content}</td>
                    <td style={{ whiteSpace: "nowrap" }}>{h.by}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
