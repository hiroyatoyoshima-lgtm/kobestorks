import { listSyncLogs } from "@/lib/data/kinexon-repo";
import KinexonImportForm from "@/components/KinexonImportForm";
import InbodyImportForm from "@/components/InbodyImportForm";
import { getCurrentUser } from "@/lib/auth/session";
import { ADMIN_ONLY, hasRole } from "@/lib/auth/permissions";

export const dynamic = "force-dynamic";

export default async function KinexonPage() {
  const user = await getCurrentUser();
  if (!hasRole(user, ADMIN_ONLY)) {
    return (
      <div className="card" style={{ maxWidth: 480 }}>
        <p className="note">この画面はS&Cコーチのみ利用できます。</p>
      </div>
    );
  }

  const logs = await listSyncLogs();

  return (
    <>
      <h2 className="section-title">
        Kinexon取込み{" "}
        <span style={{ fontSize: 12, color: "var(--muted)", fontWeight: 400 }}>管理者用(§5.7)</span>
      </h2>
      <KinexonImportForm />

      <div className="card mt">
        <h2 className="section-title">取込み履歴</h2>
        {logs.length === 0 ? (
          <p className="note">まだ取込み履歴はありません。</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table>
              <thead>
                <tr>
                  <th>日時</th>
                  <th>ファイル</th>
                  <th>状態</th>
                  <th>行数</th>
                  <th>反映 選手×日</th>
                  <th>エラー行</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td style={{ whiteSpace: "nowrap" }}>{new Date(log.ranAt).toLocaleString("ja-JP")}</td>
                    <td style={{ minWidth: 120 }}>{log.fileName}</td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      <span className={`badge ${log.status === "ok" ? "b-ok" : "b-out"}`}>
                        {log.status === "ok" ? "成功" : "エラー"}
                      </span>
                    </td>
                    <td style={{ whiteSpace: "nowrap" }}>{log.rowCount}</td>
                    <td style={{ whiteSpace: "nowrap" }}>{log.matchedPlayerDates}</td>
                    <td style={{ whiteSpace: "nowrap" }}>{log.errorRowCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <h2 className="section-title mt" style={{ marginTop: 32 }}>
        InBody取込み{" "}
        <span style={{ fontSize: 12, color: "var(--muted)", fontWeight: 400 }}>
          管理者用・体組成計/スプシからのCSVエクスポートに対応
        </span>
      </h2>
      <InbodyImportForm />
    </>
  );
}
