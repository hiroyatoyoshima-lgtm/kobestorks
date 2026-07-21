import { getDashboardData, todayISO } from "@/lib/data/dashboard";
import DateNav from "@/components/DateNav";
import TeamLoadChart from "@/components/charts/TeamLoadChart";
import WellnessChart from "@/components/charts/WellnessChart";
import DailyCommentEditor from "@/components/DailyCommentEditor";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date: dateParam } = await searchParams;
  const date = dateParam || todayISO();
  const data = await getDashboardData(date);

  return (
    <>
      <h2 className="section-title">チームサマリー</h2>
      <DateNav date={data.date} dayType={data.dayType} />

      <div className="grid kpi">
        <div className="card">
          <div className="lbl">参加可能選手</div>
          <div className="num">{data.kpi.availablePlayers}</div>
          <div className="delta warn">{data.kpi.availableNote}</div>
        </div>
        <div className="card">
          <div className="lbl">チーム平均 AAL</div>
          <div className="num">{data.kpi.teamAal}</div>
          <div className={`delta ${data.kpi.teamAalUp ? "up" : "down"}`}>{data.kpi.teamAalDelta}</div>
        </div>
        <div className="card">
          <div className="lbl">ウェルネス平均</div>
          <div className="num">
            <span>{data.kpi.wellnessAvg}</span>
            <span style={{ fontSize: 14, color: "var(--muted)" }}>/5</span>
          </div>
          <div className={`delta ${data.kpi.wellnessUp ? "up" : "down"}`}>{data.kpi.wellnessDelta}</div>
        </div>
        <div className="card">
          <div className="lbl">アンケート回答</div>
          <div className="num">{data.kpi.surveyRate}</div>
          <div className="delta warn">未回答あり</div>
        </div>
      </div>

      <div className="grid two mt">
        <div className="card">
          <h2 className="section-title">チーム負荷推移(直近14日) AAL × sRPE</h2>
          <div className="chart-box">
            <TeamLoadChart labels={data.dayLabels} aal={data.teamLoadSeries.aal} srpe={data.teamLoadSeries.srpe} />
          </div>
        </div>
        <div className="card">
          <h2 className="section-title">疲労度 × Distance(チーム平均・直近14日)</h2>
          <div className="chart-box">
            <WellnessChart
              labels={data.dayLabels}
              distance={data.wellnessSeries.distance}
              fatigue={data.wellnessSeries.fatigue}
            />
          </div>
        </div>
      </div>

      <div className="card mt">
        <h2 className="section-title">
          この日のアラート{" "}
          <span style={{ fontSize: 11, color: "var(--muted)", fontWeight: 400 }}>※内容はダミー</span>
        </h2>
        {data.alerts.length === 0 ? (
          <p className="note">この日のアラートはありません</p>
        ) : (
          data.alerts.map((a, i) => (
            <div key={i} className={`alert ${a.cls}`}>
              <span>{a.icon}</span>
              <div>
                <span className="who">
                  #{a.playerNo} {a.playerName}
                </span>{" "}
                — {a.text}
              </div>
            </div>
          ))
        )}
      </div>

      {data.playerComments && (
        <div className="card mt">
          <h2 className="section-title">
            選手コメント・申告{" "}
            <span style={{ fontSize: 11, color: "var(--muted)", fontWeight: 400 }}>
              コンディションアンケートより
            </span>
          </h2>
          {data.playerComments.length === 0 ? (
            <p className="note">本日、コメント・痛みの申告はありません</p>
          ) : (
            data.playerComments.map((c, i) => (
              <div key={i} className={`alert ${c.painFlag ? "red" : ""}`}>
                <span>{c.painFlag ? "🩹" : "💬"}</span>
                <div>
                  <span className="who">
                    #{c.playerNo} {c.playerName}
                  </span>
                  {c.painFlag && <span className="badge b-out" style={{ marginLeft: 8 }}>痛みの申告あり</span>}
                  {c.text && <div style={{ marginTop: 4 }}>{c.text}</div>}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      <div className="card mt" style={{ overflowX: "auto" }}>
        <h2 className="section-title">
          デイリーレポート(選手別サマリー){" "}
          {data.usingRealData ? (
            <span className="badge b-ok">Kinexon実データ反映中</span>
          ) : (
            <span style={{ fontSize: 11, color: "var(--muted)", fontWeight: 400 }}>
              ※数値はダミー。Kinexon取込み(管理者)で実データに切替
            </span>
          )}
        </h2>
        <table>
          <thead>
            <tr>
              <th>選手</th>
              <th>Total AAL</th>
              <th>設定値</th>
              <th>不足load</th>
              <th>不足mins</th>
              <th>Intensity</th>
              <th>ACWR</th>
            </tr>
          </thead>
          <tbody>
            {data.dailyTable.map((row) => (
              <tr key={row.no}>
                <td>
                  <b>
                    #{row.no} {row.name}
                  </b>
                </td>
                <td>{row.total}</td>
                <td>{row.target}</td>
                <td style={{ color: row.diff < 0 ? "var(--red)" : "var(--green)" }}>
                  {row.diff > 0 ? "+" : ""}
                  {row.diff}
                </td>
                <td>{row.minsLabel}</td>
                <td>{row.intensity}</td>
                <td>
                  <span className={`badge ${row.acwrBadge}`}>{row.acwr}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card mt">
        <h2 className="section-title">
          S&Cコメント{" "}
          {!data.commentEditable && (
            <span style={{ fontSize: 11, color: "var(--muted)", fontWeight: 400 }}>※内容はダミー</span>
          )}
        </h2>
        <DailyCommentEditor date={data.date} initialComment={data.comment} editable={data.commentEditable} />
      </div>
    </>
  );
}
