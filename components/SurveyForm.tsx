"use client";

import { useState } from "react";
import type { Player } from "@/lib/types";
import ScaleInput from "@/components/ScaleInput";

export default function SurveyForm({ players, lockedPlayer }: { players: Player[]; lockedPlayer?: Player }) {
  const [playerId, setPlayerId] = useState(lockedPlayer?.playerId ?? players[0]?.playerId ?? "");
  const [sleepHours, setSleepHours] = useState(7);
  const [sleepQuality, setSleepQuality] = useState(3);
  const [fatigue, setFatigue] = useState(3);
  const [soreness, setSoreness] = useState(3);
  const [stress, setStress] = useState(3);
  const [painFlag, setPainFlag] = useState(false);
  const [comment, setComment] = useState("");
  const [toast, setToast] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);
    try {
      const res = await fetch("/api/wellness", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerId,
          sleepHours,
          sleepQuality,
          fatigue,
          soreness,
          stress,
          painFlag,
          comment,
        }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? "送信に失敗しました");
      setToast(true);
      setTimeout(() => setToast(false), 2200);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "送信に失敗しました");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <h2 className="section-title">コンディションアンケート(選手入力画面)</h2>
      <div className="card" style={{ maxWidth: 560 }}>
        <form onSubmit={handleSubmit}>
          <label>選手名</label>
          {lockedPlayer ? (
            <input type="text" value={`#${lockedPlayer.no} ${lockedPlayer.nameJa}`} disabled />
          ) : (
            <select value={playerId} onChange={(e) => setPlayerId(e.target.value)} required>
              {players.map((p) => (
                <option key={p.playerId} value={p.playerId}>
                  #{p.no} {p.nameJa}
                </option>
              ))}
            </select>
          )}

          <label>睡眠時間</label>
          <input
            type="number"
            step={0.5}
            min={0}
            max={14}
            value={sleepHours}
            onChange={(e) => setSleepHours(+e.target.value)}
            required
          />

          <label>睡眠の質(1=悪い 〜 5=良い)</label>
          <ScaleInput value={sleepQuality} onChange={setSleepQuality} />

          <label>疲労感(1=強い 〜 5=なし)</label>
          <ScaleInput value={fatigue} onChange={setFatigue} />

          <label>筋肉痛(1=強い 〜 5=なし)</label>
          <ScaleInput value={soreness} onChange={setSoreness} />

          <label>ストレス(1=高い 〜 5=低い)</label>
          <ScaleInput value={stress} onChange={setStress} />

          <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 14 }}>
            <input
              type="checkbox"
              className="chk"
              checked={painFlag}
              onChange={(e) => setPainFlag(e.target.checked)}
            />
            痛みがある
          </label>

          <label>気になる部位・コメント(任意)</label>
          <textarea
            rows={2}
            placeholder="例:左足首に違和感"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />

          <button className="submit" type="submit" disabled={loading}>
            {loading ? "送信中..." : "送信する"}
          </button>
        </form>
        {errorMsg && (
          <p className="note" style={{ color: "var(--red)" }}>
            ⚠️ {errorMsg}
          </p>
        )}
        <p className="note">
          送信 → Supabaseの`wellness`テーブルに記録 → ダッシュボードに即反映されます(30秒で完了できる入力を想定)。
        </p>
      </div>
      {toast && <div className="toast">送信しました</div>}
    </>
  );
}
