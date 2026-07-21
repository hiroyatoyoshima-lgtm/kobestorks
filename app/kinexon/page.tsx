import { listSyncLogs } from "@/lib/store/fileStore";
import KinexonImportForm from "@/components/KinexonImportForm";
import InbodyImportForm from "@/components/InbodyImportForm";

export const dynamic = "force-dynamic";

export default function KinexonPage() {
  const logs = listSyncLogs();

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
                  <td>{new Date(log.ranAt).toLocaleString("ja-JP")}</td>
                  <td>{log.fileName}</td>
                  <td>
                    <span className={`badge ${log.status === "ok" ? "b-ok" : "b-out"}`}>
                      {log.status === "ok" ? "成功" : "エラー"}
                    </span>
                  </td>
                  <td>{log.rowCount}</td>
                  <td>{log.matchedPlayerDates}</td>
                  <td>{log.errorRowCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
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
