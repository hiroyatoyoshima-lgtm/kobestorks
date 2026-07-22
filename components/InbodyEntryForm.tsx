"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Player } from "@/lib/types";

interface RowState {
  weightKg: string;
  muscleMassKg: string;
  fatMassKg: string;
  fatPct: string;
}

const EMPTY_ROW: RowState = { weightKg: "", muscleMassKg: "", fatMassKg: "", fatPct: "" };

export default function InbodyEntryForm({ players }: { players: Player[] }) {
  const router = useRouter();
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [rows, setRows] = useState<Record<string, RowState>>(
    Object.fromEntries(players.map((p) => [p.playerId, { ...EMPTY_ROW }]))
  );
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function setField(playerId: string, field: keyof RowState, value: string) {
    setRows((prev) => ({ ...prev, [playerId]: { ...prev[playerId], [field]: value } }));
  }

  function toNumberOrNull(v: string): number | null {
    return v.trim() === "" ? null : Number(v);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setSaved(false);
    setLoading(true);
    try {
      const entries = players.map((p) => ({
        playerId: p.playerId,
        weightKg: toNumberOrNull(rows[p.playerId].weightKg),
        muscleMassKg: toNumberOrNull(rows[p.playerId].muscleMassKg),
        fatMassKg: toNumberOrNull(rows[p.playerId].fatMassKg),
        fatPct: toNumberOrNull(rows[p.playerId].fatPct),
      }));
      const res = await fetch("/api/inbody/entry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, entries }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? "保存に失敗しました");
      setSaved(true);
      setRows(Object.fromEntries(players.map((p) => [p.playerId, { ...EMPTY_ROW }])));
      router.refresh();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "保存に失敗しました");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <label>測定日</label>
      <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ maxWidth: 200 }} required />

      <div className="card mt" style={{ overflowX: "auto" }}>
        <table>
          <thead>
            <tr>
              <th>選手</th>
              <th>体重(kg)</th>
              <th>骨格筋量(kg)</th>
              <th>体脂肪量(kg)</th>
              <th>体脂肪率(%)</th>
            </tr>
          </thead>
          <tbody>
            {players.map((p) => (
              <tr key={p.playerId}>
                <td style={{ whiteSpace: "nowrap" }}>
                  #{p.no} {p.nameJa}
                </td>
                {(["weightKg", "muscleMassKg", "fatMassKg", "fatPct"] as const).map((field) => (
                  <td key={field}>
                    <input
                      type="number"
                      step="0.1"
                      value={rows[p.playerId][field]}
                      onChange={(e) => setField(p.playerId, field, e.target.value)}
                      style={{ width: 90 }}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <p className="note">測定していない選手の欄は空欄のままでOKです(その選手はスキップされます)。</p>
      </div>

      <button className="submit" type="submit" disabled={loading}>
        {loading ? "保存中..." : "この日の測定値を保存する"}
      </button>
      {saved && (
        <p className="note" style={{ color: "var(--green)" }}>
          ✅ 保存しました。選手ページのInBody推移に反映されます。
        </p>
      )}
      {errorMsg && (
        <p className="note" style={{ color: "var(--red)" }}>
          ⚠️ {errorMsg}
        </p>
      )}
    </form>
  );
}
