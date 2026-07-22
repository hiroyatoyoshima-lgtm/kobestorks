"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Player, PositionGroup } from "@/lib/types";

const POSITION_GROUPS: { value: PositionGroup; label: string }[] = [
  { value: "GUARD", label: "GUARD" },
  { value: "WING", label: "WING" },
  { value: "BIG", label: "BIG" },
];

interface NewPlayerForm {
  no: string;
  nameJa: string;
  nameKinexon: string;
  position: string;
  positionGroup: PositionGroup;
  heightCm: string;
  weightKg: string;
  birthday: string;
}

const EMPTY_FORM: NewPlayerForm = {
  no: "",
  nameJa: "",
  nameKinexon: "",
  position: "",
  positionGroup: "GUARD",
  heightCm: "",
  weightKg: "",
  birthday: "",
};

export default function PlayerManagement({ players, source }: { players: Player[]; source: "supabase" | "seed" }) {
  const router = useRouter();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<NewPlayerForm>(EMPTY_FORM);

  const editable = source === "supabase";

  async function patchPlayer(playerId: string, patch: Record<string, unknown>) {
    setErrorMsg(null);
    try {
      const res = await fetch("/api/players", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId, ...patch }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? "更新に失敗しました");
      router.refresh();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "更新に失敗しました");
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);
    try {
      const res = await fetch("/api/players", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          no: Number(form.no),
          nameJa: form.nameJa,
          nameKinexon: form.nameKinexon,
          position: form.position,
          positionGroup: form.positionGroup,
          heightCm: form.heightCm ? Number(form.heightCm) : null,
          weightKg: form.weightKg ? Number(form.weightKg) : null,
          birthday: form.birthday || null,
        }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? "登録に失敗しました");
      setForm(EMPTY_FORM);
      router.refresh();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "登録に失敗しました");
    } finally {
      setLoading(false);
    }
  }

  if (!editable) {
    return <p className="note">Supabase未接続のため、選手管理は閲覧のみです(現在はコード内デフォルトのロスターで動作中)。</p>;
  }

  return (
    <div>
      <div className="card" style={{ overflowX: "auto" }}>
        <table>
          <thead>
            <tr>
              <th>背番号</th>
              <th>氏名</th>
              <th>Kinexon名</th>
              <th>ポジション</th>
              <th>グループ</th>
              <th>在籍</th>
            </tr>
          </thead>
          <tbody>
            {players.map((p) => (
              <tr key={p.playerId}>
                <td>#{p.no}</td>
                <td>{p.nameJa}</td>
                <td className="note">{p.nameKinexon}</td>
                <td>
                  <input
                    type="text"
                    defaultValue={p.position}
                    style={{ padding: "4px 6px", width: 90 }}
                    onBlur={(e) => e.target.value !== p.position && patchPlayer(p.playerId, { position: e.target.value })}
                  />
                </td>
                <td>
                  <select
                    defaultValue={p.positionGroup}
                    style={{ padding: "4px 6px", width: 110 }}
                    onChange={(e) => patchPlayer(p.playerId, { positionGroup: e.target.value })}
                  >
                    {POSITION_GROUPS.map((g) => (
                      <option key={g.value} value={g.value}>
                        {g.label}
                      </option>
                    ))}
                  </select>
                </td>
                <td style={{ textAlign: "center" }}>
                  <input
                    type="checkbox"
                    className="chk"
                    checked={p.active}
                    onChange={(e) => patchPlayer(p.playerId, { active: e.target.checked })}
                  />
                </td>
              </tr>
            ))}
            {players.length === 0 && (
              <tr>
                <td colSpan={6} className="note">
                  まだ選手が登録されていません。
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <p className="note">
          「在籍」のチェックを外すと、ダッシュボード等の一覧には出なくなります(データは削除されません)。
        </p>
      </div>

      <div className="card mt" style={{ maxWidth: 480 }}>
        <h2 className="section-title">選手を追加</h2>
        <form onSubmit={handleAdd}>
          <div className="grid two">
            <div>
              <label>背番号</label>
              <input
                type="number"
                value={form.no}
                onChange={(e) => setForm((p) => ({ ...p, no: e.target.value }))}
                required
              />
            </div>
            <div>
              <label>ポジショングループ</label>
              <select
                value={form.positionGroup}
                onChange={(e) => setForm((p) => ({ ...p, positionGroup: e.target.value as PositionGroup }))}
              >
                {POSITION_GROUPS.map((g) => (
                  <option key={g.value} value={g.value}>
                    {g.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <label>氏名</label>
          <input
            type="text"
            value={form.nameJa}
            onChange={(e) => setForm((p) => ({ ...p, nameJa: e.target.value }))}
            placeholder="中野 司"
            required
          />
          <label>Kinexon登録名(半角英字・CSV取込みの名寄せに使用)</label>
          <input
            type="text"
            value={form.nameKinexon}
            onChange={(e) => setForm((p) => ({ ...p, nameKinexon: e.target.value }))}
            placeholder="Tsukasa Nakano"
            required
          />
          <label>ポジション</label>
          <input
            type="text"
            value={form.position}
            onChange={(e) => setForm((p) => ({ ...p, position: e.target.value }))}
            placeholder="PG/SG"
          />
          <div className="grid two">
            <div>
              <label>身長(cm・任意)</label>
              <input
                type="number"
                value={form.heightCm}
                onChange={(e) => setForm((p) => ({ ...p, heightCm: e.target.value }))}
              />
            </div>
            <div>
              <label>体重(kg・任意)</label>
              <input
                type="number"
                value={form.weightKg}
                onChange={(e) => setForm((p) => ({ ...p, weightKg: e.target.value }))}
              />
            </div>
          </div>
          <label>生年月日(任意)</label>
          <input
            type="date"
            value={form.birthday}
            onChange={(e) => setForm((p) => ({ ...p, birthday: e.target.value }))}
          />
          <button className="submit" type="submit" disabled={loading}>
            {loading ? "登録中..." : "追加する"}
          </button>
        </form>
        {errorMsg && (
          <p className="note" style={{ color: "var(--red)" }}>
            ⚠️ {errorMsg}
          </p>
        )}
      </div>
    </div>
  );
}
