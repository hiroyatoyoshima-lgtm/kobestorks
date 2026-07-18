"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Player } from "@/lib/types";

function nowHHMM() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default function CareForm({ players }: { players: Player[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [time, setTime] = useState(nowHHMM());
  const [playerId, setPlayerId] = useState(players[0]?.playerId ?? "");
  const [menu, setMenu] = useState("");
  const [staff, setStaff] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);
    try {
      const res = await fetch("/api/care", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ time, playerId, menu, staff }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? "登録に失敗しました");
      setMenu("");
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
        + ケア予定を追加
      </button>
    );
  }

  return (
    <div className="card mt" style={{ maxWidth: 480 }}>
      <h2 className="section-title">本日のケア予定を追加</h2>
      <form onSubmit={handleSubmit}>
        <label>時間</label>
        <input type="time" value={time} onChange={(e) => setTime(e.target.value)} required />

        <label>選手</label>
        <select value={playerId} onChange={(e) => setPlayerId(e.target.value)} required>
          {players.map((p) => (
            <option key={p.playerId} value={p.playerId}>
              #{p.no} {p.nameJa}
            </option>
          ))}
        </select>

        <label>内容</label>
        <input
          type="text"
          value={menu}
          onChange={(e) => setMenu(e.target.value)}
          placeholder="例:アイシング+モビリティ"
          required
        />

        <label>担当(任意)</label>
        <input type="text" value={staff} onChange={(e) => setStaff(e.target.value)} placeholder="例:AT 嶺井" />

        <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
          <button className="submit" type="submit" disabled={loading} style={{ marginTop: 0 }}>
            {loading ? "追加中..." : "追加する"}
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
