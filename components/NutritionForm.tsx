"use client";

import { useState } from "react";

export default function NutritionForm() {
  const [timing, setTiming] = useState("練習前");
  const [menu, setMenu] = useState("");
  const [kcal, setKcal] = useState("");
  const [protein, setProtein] = useState("");
  const [fat, setFat] = useState("");
  const [carb, setCarb] = useState("");
  const [playerNote, setPlayerNote] = useState("");
  const [staff, setStaff] = useState("");
  const [toast, setToast] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);
    try {
      const res = await fetch("/api/nutrition", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          timing,
          menu,
          kcal: kcal ? Number(kcal) : null,
          proteinG: protein ? Number(protein) : null,
          fatG: fat ? Number(fat) : null,
          carbG: carb ? Number(carb) : null,
          playerNote,
          staff,
        }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? "記録に失敗しました");
      setToast(true);
      setTimeout(() => setToast(false), 2200);
      setMenu("");
      setKcal("");
      setProtein("");
      setFat("");
      setCarb("");
      setPlayerNote("");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "記録に失敗しました");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card mt" style={{ maxWidth: 560 }}>
      <h2 className="section-title">本日の入力(管理栄養士用)</h2>
      <form onSubmit={handleSubmit}>
        <label>タイミング</label>
        <select value={timing} onChange={(e) => setTiming(e.target.value)}>
          <option>練習前</option>
          <option>練習後</option>
          <option>試合前</option>
          <option>試合後</option>
        </select>
        <label>メニュー</label>
        <textarea
          rows={3}
          placeholder="1行1品で入力"
          value={menu}
          onChange={(e) => setMenu(e.target.value)}
          required
        />
        <label>栄養価(kcal / P / F / C)</label>
        <div style={{ display: "flex", gap: 8 }}>
          <input type="number" placeholder="kcal" value={kcal} onChange={(e) => setKcal(e.target.value)} />
          <input type="number" placeholder="P" value={protein} onChange={(e) => setProtein(e.target.value)} />
          <input type="number" placeholder="F" value={fat} onChange={(e) => setFat(e.target.value)} />
          <input type="number" placeholder="C" value={carb} onChange={(e) => setCarb(e.target.value)} />
        </div>
        <label>選手個別メモ(任意)</label>
        <textarea
          rows={2}
          placeholder="例:○○選手は増量期のため補食追加"
          value={playerNote}
          onChange={(e) => setPlayerNote(e.target.value)}
        />
        <label>記録者(任意)</label>
        <input type="text" placeholder="例:管理栄養士 ○○" value={staff} onChange={(e) => setStaff(e.target.value)} />
        <button className="submit" type="submit" disabled={loading}>
          {loading ? "記録中..." : "記録する"}
        </button>
      </form>
      {errorMsg && (
        <p className="note" style={{ color: "var(--red)" }}>
          ⚠️ {errorMsg}
        </p>
      )}
      <p className="note">送信するとSupabaseの`nutrition`テーブルに記録され、上のメニュー表示にも反映されます。</p>
      {toast && <div className="toast">記録しました</div>}
    </div>
  );
}
