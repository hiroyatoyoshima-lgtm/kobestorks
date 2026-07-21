"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { TeamSettings } from "@/lib/settings";

export default function SettingsForm({ settings, editable }: { settings: TeamSettings; editable: boolean }) {
  const router = useRouter();
  const [form, setForm] = useState<TeamSettings>(settings);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function num(v: string) {
    return v === "" ? 0 : Number(v);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setSaved(false);
    setLoading(true);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? "保存に失敗しました");
      setSaved(true);
      router.refresh();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "保存に失敗しました");
    } finally {
      setLoading(false);
    }
  }

  if (!editable) {
    return <p className="note">Supabase未接続のため、設定画面は閲覧のみです(現在はコード内デフォルト値で動作中)。</p>;
  }

  const intensityMax = (i: number) => form.intensityBands[i]?.max ?? 0;
  function setIntensityMax(i: number, value: number) {
    setForm((prev) => {
      const bands = [...prev.intensityBands];
      bands[i] = { ...bands[i], max: value };
      return { ...prev, intensityBands: bands };
    });
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="card">
        <h2 className="section-title">ACWR(急性:慢性負荷比)閾値</h2>
        <div className="grid two">
          <div>
            <label>注意閾値</label>
            <input
              type="number"
              step="0.01"
              value={form.acwrWarn}
              onChange={(e) => setForm((p) => ({ ...p, acwrWarn: num(e.target.value) }))}
            />
          </div>
          <div>
            <label>警告閾値</label>
            <input
              type="number"
              step="0.01"
              value={form.acwrAlert}
              onChange={(e) => setForm((p) => ({ ...p, acwrAlert: num(e.target.value) }))}
            />
          </div>
        </div>
      </div>

      <div className="card mt">
        <h2 className="section-title">ポジション別 目標AAL(target_aal)</h2>
        <div className="grid" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
          {(["GUARD", "WING", "BIG"] as const).map((pos) => (
            <div key={pos}>
              <label>{pos}</label>
              <input
                type="number"
                value={form.targetAalByPositionGroup[pos]}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    targetAalByPositionGroup: { ...p.targetAalByPositionGroup, [pos]: num(e.target.value) },
                  }))
                }
              />
            </div>
          ))}
        </div>
        <p className="note">実際のtarget_aalは「この値 × 当日係数(下記)」で計算されます。</p>
      </div>

      <div className="card mt">
        <h2 className="section-title">日別の負荷係数</h2>
        <div className="grid" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
          {(["練習日", "試合日", "OFF"] as const).map((dt) => (
            <div key={dt}>
              <label>{dt}</label>
              <input
                type="number"
                step="0.05"
                value={form.dayTypeCoefficient[dt]}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    dayTypeCoefficient: { ...p.dayTypeCoefficient, [dt]: num(e.target.value) },
                  }))
                }
              />
            </div>
          ))}
        </div>
      </div>

      <div className="card mt">
        <h2 className="section-title">
          Intensity帯の上限値{" "}
          <span style={{ fontSize: 11, color: "var(--muted)", fontWeight: 400 }}>
            AALがこの値以下ならその帯。最後(VERY-HIGH)は上限なし固定
          </span>
        </h2>
        <div className="grid" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
          {["VERY-LOW", "LOW", "MID", "HIGH"].map((label, i) => (
            <div key={label}>
              <label>{label}</label>
              <input type="number" value={intensityMax(i)} onChange={(e) => setIntensityMax(i, num(e.target.value))} />
            </div>
          ))}
        </div>
      </div>

      <div className="card mt">
        <h2 className="section-title">ウェルネスアラート(§6)</h2>
        <div className="grid" style={{ gridTemplateColumns: "repeat(2, 1fr)" }}>
          <div>
            <label>参照期間(日)</label>
            <input
              type="number"
              value={form.wellnessWindowDays}
              onChange={(e) => setForm((p) => ({ ...p, wellnessWindowDays: num(e.target.value) }))}
            />
          </div>
          <div>
            <label>最低回答日数</label>
            <input
              type="number"
              value={form.wellnessMinDays}
              onChange={(e) => setForm((p) => ({ ...p, wellnessMinDays: num(e.target.value) }))}
            />
          </div>
          <div>
            <label>注意閾値(悪化%)</label>
            <input
              type="number"
              value={form.wellnessWarnPct}
              onChange={(e) => setForm((p) => ({ ...p, wellnessWarnPct: num(e.target.value) }))}
            />
          </div>
          <div>
            <label>警告閾値(悪化%)</label>
            <input
              type="number"
              value={form.wellnessAlertPct}
              onChange={(e) => setForm((p) => ({ ...p, wellnessAlertPct: num(e.target.value) }))}
            />
          </div>
        </div>
      </div>

      <div className="card mt">
        <h2 className="section-title">負荷急増アラート</h2>
        <label>直近平均比の急増%</label>
        <input
          type="number"
          value={form.loadSpikePct}
          onChange={(e) => setForm((p) => ({ ...p, loadSpikePct: num(e.target.value) }))}
        />
      </div>

      <button className="submit" type="submit" disabled={loading}>
        {loading ? "保存中..." : "設定を保存する"}
      </button>
      {saved && (
        <p className="note" style={{ color: "var(--green)" }}>
          ✅ 保存しました。ダッシュボードに反映されます。
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
