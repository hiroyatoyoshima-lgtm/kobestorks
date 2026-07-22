"use client";

import { useState } from "react";
import { parseCsv, type ParsedCsv } from "@/lib/kinexon/csv";
import { FIELD_LABELS, REQUIRED_FIELDS, guessMapping, type ColumnMapping, type MappingField } from "@/lib/kinexon/mapping";

interface ImportSummary {
  rowCount: number;
  okCount: number;
  errorCount: number;
  unmatchedNames: string[];
  affectedPlayerDates: { playerId: string; playerName: string; date: string; totalAal: number }[];
  rows: {
    rowIndex: number;
    rawName: string;
    date: string | null;
    playerId: string | null;
    playerName: string | null;
    drillName: string;
    aal: number | null;
    error?: string;
  }[];
}

const FIELD_ORDER: MappingField[] = [
  "date",
  "playerNameKinexon",
  "aal",
  "drillName",
  "distanceM",
  "sessionType",
  "startTime",
  "accelCount",
  "decelCount",
  "jumpCount",
  "jumpHeightMaxM",
  "speedMaxKmh",
  "changesOfOrientation",
  "exertions",
  "anaerobicDistanceM",
  "accelLoadHigh",
  "accelLoadVeryHigh",
];

export default function KinexonImportForm() {
  const [fileName, setFileName] = useState<string>("");
  const [parsed, setParsed] = useState<ParsedCsv | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [mappingExpanded, setMappingExpanded] = useState(false);
  const [sessionDate, setSessionDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [preview, setPreview] = useState<ImportSummary | null>(null);
  const [committed, setCommitted] = useState<ImportSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  function loadFile(file: File) {
    setFileName(file.name);
    setPreview(null);
    setCommitted(null);
    file.text().then((text) => {
      const p = parseCsv(text);
      const guessed = guessMapping(p.headers);
      setParsed(p);
      setMapping(guessed);
      // 必須項目が自動認識できなかった場合のみ、最初から列マッピングを開いておく
      setMappingExpanded(REQUIRED_FIELDS.some((f) => !guessed[f]));
    });
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) loadFile(file);
  }

  // Kinexonのエクスポートには日付列が無いことが多いため、列マッピングが無ければ
  // 「対象日」の指定を必須にする(§5.7)
  const missingRequired = [
    ...REQUIRED_FIELDS.filter((f) => !mapping[f]),
    ...(!mapping.date && !sessionDate ? (["date"] as MappingField[]) : []),
  ];

  async function runPreview() {
    if (!parsed) return;
    setErrorMsg(null);
    setLoading(true);
    setCommitted(null);
    try {
      const res = await fetch("/api/kinexon/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parsed, mapping, sessionDate: mapping.date ? undefined : sessionDate }),
      });
      const json = await res.json();
      if (json.ok === false) throw new Error(json.error ?? "処理に失敗しました");
      setPreview(json);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "処理に失敗しました");
      setPreview(null);
    } finally {
      setLoading(false);
    }
  }

  async function runCommit() {
    if (!parsed) return;
    setErrorMsg(null);
    setLoading(true);
    try {
      const res = await fetch("/api/kinexon/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parsed,
          mapping,
          fileName,
          sessionDate: mapping.date ? undefined : sessionDate,
        }),
      });
      const summary = await res.json();
      if (summary.ok === false) throw new Error(summary.error ?? "取込みに失敗しました");
      setCommitted(summary);
      setPreview(summary);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "取込みに失敗しました");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div
        className="card"
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        style={{
          border: dragOver ? "2px dashed var(--green)" : "2px dashed var(--border)",
          textAlign: "center",
          padding: 30,
          cursor: "pointer",
        }}
        onClick={() => document.getElementById("kinexon-file-input")?.click()}
      >
        <input
          id="kinexon-file-input"
          type="file"
          accept=".csv,text/csv"
          style={{ display: "none" }}
          onChange={(e) => e.target.files?.[0] && loadFile(e.target.files[0])}
        />
        <p style={{ fontSize: 14 }}>
          {fileName ? `${fileName}` : "Kinexonエクスポート CSV をここにドラッグ&ドロップ、またはクリックして選択"}
        </p>
        {parsed && (
          <p className="note">
            {parsed.headers.length}列 × {parsed.rows.length}行を検出
          </p>
        )}
      </div>

      {errorMsg && (
        <div className="alert red mt">
          <span>⚠️</span>
          <div>{errorMsg}</div>
        </div>
      )}

      {parsed && (
        <div className="card mt">
          <h2 className="section-title">対象日</h2>
          <p className="note" style={{ marginBottom: 10 }}>
            Kinexonのエクスポートには日付列が無いことが多いため、このCSVがどの日のデータかを指定してください
            (CSVに日付列があり下でマッピングした場合はそちらが優先されます)。
          </p>
          <input
            type="date"
            value={sessionDate}
            disabled={!!mapping.date}
            onChange={(e) => setSessionDate(e.target.value)}
            style={{ maxWidth: 200 }}
          />
        </div>
      )}

      {parsed && !mappingExpanded && (
        <div className="card mt">
          <h2 className="section-title">列マッピング(自動認識)</h2>
          <p className="note" style={{ marginBottom: 10 }}>
            {FIELD_ORDER.filter((f) => mapping[f]).length}項目を自動でマッピングしました。内容が正しければそのままプレビューへ進めます。
          </p>
          <div className="note" style={{ marginBottom: 10 }}>
            {FIELD_ORDER.filter((f) => mapping[f])
              .map((f) => `${FIELD_LABELS[f].replace(/(\(必須\)|\(.*?\))/g, "")}→${mapping[f]}`)
              .join(" / ")}
          </div>
          <button type="button" className="back" style={{ marginBottom: 14 }} onClick={() => setMappingExpanded(true)}>
            列マッピングを確認・変更する
          </button>
          <br />
          <button className="submit" type="button" disabled={missingRequired.length > 0 || loading} onClick={runPreview}>
            {loading ? "処理中..." : "プレビュー"}
          </button>
        </div>
      )}

      {parsed && mappingExpanded && (
        <div className="card mt">
          <h2 className="section-title">列マッピング</h2>
          <p className="note" style={{ marginBottom: 10 }}>
            Kinexonの列名は現時点で未確定のため、自動推測をベースに手動で確認・修正してください。
          </p>
          {FIELD_ORDER.map((field) => (
            <div key={field} style={{ marginBottom: 10 }}>
              <label>{FIELD_LABELS[field]}</label>
              <select
                value={mapping[field] ?? ""}
                onChange={(e) =>
                  setMapping((prev) => ({ ...prev, [field]: e.target.value || undefined }))
                }
              >
                <option value="">(使用しない)</option>
                {parsed.headers.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>
          ))}

          {missingRequired.length > 0 && (
            <p className="note" style={{ color: "var(--yellow)" }}>
              必須項目が未設定です: {missingRequired.map((f) => FIELD_LABELS[f]).join(" / ")}
            </p>
          )}

          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button
              className="submit"
              type="button"
              disabled={missingRequired.length > 0 || loading}
              style={{ marginTop: 0 }}
              onClick={runPreview}
            >
              {loading ? "処理中..." : "プレビュー"}
            </button>
            {missingRequired.length === 0 && (
              <button type="button" className="back" style={{ marginBottom: 0 }} onClick={() => setMappingExpanded(false)}>
                閉じる
              </button>
            )}
          </div>
        </div>
      )}

      {preview && (
        <div className="card mt">
          <h2 className="section-title">{committed ? "取込み結果" : "プレビュー"}</h2>
          <div className="grid kpi">
            <div className="card">
              <div className="lbl">総行数</div>
              <div className="num">{preview.rowCount}</div>
            </div>
            <div className="card">
              <div className="lbl">正常</div>
              <div className="num" style={{ color: "var(--green)" }}>
                {preview.okCount}
              </div>
            </div>
            <div className="card">
              <div className="lbl">エラー</div>
              <div className="num" style={{ color: preview.errorCount > 0 ? "var(--red)" : "var(--text)" }}>
                {preview.errorCount}
              </div>
            </div>
            <div className="card">
              <div className="lbl">対象 選手×日</div>
              <div className="num">{preview.affectedPlayerDates.length}</div>
            </div>
          </div>

          {preview.unmatchedNames.length > 0 && (
            <div className="alert red mt">
              <span>⚠️</span>
              <div>
                <span className="who">未登録の選手名({preview.unmatchedNames.length}件)</span>
                <div>{preview.unmatchedNames.join(" / ")}</div>
                <div className="note">選手マスタ(name_kinexon)に追加するか、CSV側の表記を確認してください。</div>
              </div>
            </div>
          )}

          {preview.affectedPlayerDates.length > 0 && (
            <div className="mt" style={{ overflowX: "auto" }}>
              <table>
                <thead>
                  <tr>
                    <th>選手</th>
                    <th>日付</th>
                    <th>Total AAL(取込み分)</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.affectedPlayerDates.map((a, i) => (
                    <tr key={i}>
                      <td style={{ whiteSpace: "nowrap" }}>{a.playerName}</td>
                      <td style={{ whiteSpace: "nowrap" }}>{a.date}</td>
                      <td style={{ whiteSpace: "nowrap" }}>{a.totalAal}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!committed && (
            <button className="submit mt" type="button" disabled={preview.okCount === 0 || loading} onClick={runCommit}>
              {loading ? "取込み中..." : `この内容で取込みを実行(${preview.okCount}件)`}
            </button>
          )}
          {committed && (
            <p className="note" style={{ color: "var(--green)", marginTop: 10 }}>
              取込みが完了しました。ダッシュボード・選手ページに反映されています(同一date+選手の再取込みは上書き)。
            </p>
          )}
        </div>
      )}
    </div>
  );
}
