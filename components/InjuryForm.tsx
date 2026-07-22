"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Player } from "@/lib/types";

export default function InjuryForm({ players }: { players: Player[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [playerId, setPlayerId] = useState(players[0]?.playerId ?? "");
  const [diagnosis, setDiagnosis] = useState("");
  const [bodyPart, setBodyPart] = useState("");
  const [onsetDate, setOnsetDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [mechanism, setMechanism] = useState<"接触" | "非接触">("非接触");
  const [status, setStatus] = useState<"out" | "part" | "watch">("watch");
  const [rtpPhase, setRtpPhase] = useState("");
  const [rtpTargetDate, setRtpTargetDate] = useState("");
  const [note, setNote] = useState("");
  const [updatedBy, setUpdatedBy] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    if (rtpTargetDate && rtpTargetDate < onsetDate) {
      setErrorMsg("復帰予定日は受傷日より前に設定できません。");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/injuries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerId,
          diagnosis,
          bodyPart,
          onsetDate,
          mechanism,
          status,
          rtpPhase,
          rtpTargetDate: rtpTargetDate || undefined,
          note,
          updatedBy,
        }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? "登録に失敗しました");
      setDiagnosis("");
      setBodyPart("");
      setRtpPhase("");
      setRtpTargetDate("");
      setNote("");
      setOpen(false);
      router.refresh();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "登録に失敗しました");
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button className="back" type="button" onClick={() => setOpen(true)} style={{ marginBottom: 0 }}>
        + 怪我を登録
      </button>
    );
  }

  return (
    <div className="card mt" style={{ maxWidth: 560 }}>
      <h2 className="section-title">怪我の新規登録</h2>
      <form onSubmit={handleSubmit}>
        <label>選手</label>
        <select value={playerId} onChange={(e) => setPlayerId(e.target.value)} required>
          {players.map((p) => (
            <option key={p.playerId} value={p.playerId}>
              #{p.no} {p.nameJa}
            </option>
          ))}
        </select>

        <label>診断名</label>
        <input type="text" value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} placeholder="例:右足関節捻挫" required />

        <label>部位</label>
        <input type="text" value={bodyPart} onChange={(e) => setBodyPart(e.target.value)} placeholder="例:右足関節" />

        <label>受傷日</label>
        <input type="date" value={onsetDate} onChange={(e) => setOnsetDate(e.target.value)} required />

        <label>受傷機転</label>
        <select value={mechanism} onChange={(e) => setMechanism(e.target.value as "接触" | "非接触")}>
          <option value="非接触">非接触</option>
          <option value="接触">接触</option>
        </select>

        <label>ステータス</label>
        <select value={status} onChange={(e) => setStatus(e.target.value as "out" | "part" | "watch")}>
          <option value="out">離脱中</option>
          <option value="part">部分参加</option>
          <option value="watch">要観察</option>
        </select>

        <label>RTPフェーズ</label>
        <input type="text" value={rtpPhase} onChange={(e) => setRtpPhase(e.target.value)} placeholder="例:Phase 1:保護・治療" />

        <label>復帰予定日(任意)</label>
        <input type="date" value={rtpTargetDate} min={onsetDate} onChange={(e) => setRtpTargetDate(e.target.value)} />

        <label>メモ(任意)</label>
        <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />

        <label>記録者(任意)</label>
        <input type="text" value={updatedBy} onChange={(e) => setUpdatedBy(e.target.value)} placeholder="例:AT 嶺井" />

        <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
          <button className="submit" type="submit" disabled={loading} style={{ marginTop: 0 }}>
            {loading ? "登録中..." : "登録する"}
          </button>
          <button type="button" className="back" style={{ marginBottom: 0 }} onClick={() => setOpen(false)}>
            キャンセル
          </button>
        </div>
      </form>
      {errorMsg && (
        <p className="note" style={{ color: "var(--red)" }}>
          ⚠️ {errorMsg}
        </p>
      )}
    </div>
  );
}
