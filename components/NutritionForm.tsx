"use client";

import { useState } from "react";

export default function NutritionForm() {
  const [toast, setToast] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setToast(true);
    setTimeout(() => setToast(false), 2200);
    (e.target as HTMLFormElement).reset();
  }

  return (
    <div className="card mt" style={{ maxWidth: 560 }}>
      <h2 className="section-title">本日の入力(管理栄養士用)</h2>
      <form onSubmit={handleSubmit}>
        <label>タイミング</label>
        <select defaultValue="練習前">
          <option>練習前</option>
          <option>練習後</option>
          <option>試合前</option>
          <option>試合後</option>
        </select>
        <label>メニュー</label>
        <textarea rows={3} placeholder="1行1品で入力" />
        <label>栄養価(kcal / P / F / C)</label>
        <div style={{ display: "flex", gap: 8 }}>
          <input type="number" placeholder="kcal" />
          <input type="number" placeholder="P" />
          <input type="number" placeholder="F" />
          <input type="number" placeholder="C" />
        </div>
        <label>選手個別メモ(任意)</label>
        <textarea rows={2} placeholder="例:○○選手は増量期のため補食追加" />
        <button className="submit" type="submit">
          記録する
        </button>
      </form>
      <p className="note">
        実運用ではSupabaseの`nutrition`テーブルに記録され、デイリーレポートに自動掲載されます。
      </p>
      {toast && <div className="toast">✅ 記録しました</div>}
    </div>
  );
}
