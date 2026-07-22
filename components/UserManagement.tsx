"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Role } from "@/lib/auth/session";
import type { Player } from "@/lib/types";

export interface TeamUserView {
  userId: string;
  email: string;
  role: Role;
  playerId: string | null;
  isTeamManager: boolean;
}

const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: "admin", label: "S&Cコーチ" },
  { value: "medical", label: "トレーナー" },
  { value: "nutrition", label: "栄養士" },
  { value: "coach", label: "ヘッドコーチ" },
  { value: "player", label: "選手" },
];

export default function UserManagement({ users, players }: { users: TeamUserView[]; players: Player[] }) {
  const router = useRouter();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState<Role>("coach");
  const [newPlayerId, setNewPlayerId] = useState(players[0]?.playerId ?? "");
  const [newIsTeamManager, setNewIsTeamManager] = useState(false);

  function playerName(playerId: string | null) {
    if (!playerId) return "";
    return players.find((p) => p.playerId === playerId)?.nameJa ?? playerId;
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: newEmail,
          role: newRole,
          playerId: newRole === "player" ? newPlayerId : null,
          isTeamManager: newIsTeamManager,
        }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? "登録に失敗しました");
      setNewEmail("");
      setNewIsTeamManager(false);
      router.refresh();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "登録に失敗しました");
    } finally {
      setLoading(false);
    }
  }

  async function patchUser(userId: string, patch: Partial<TeamUserView>) {
    const current = users.find((u) => u.userId === userId)!;
    const merged = { ...current, ...patch };
    setErrorMsg(null);
    try {
      const res = await fetch("/api/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          role: merged.role,
          playerId: merged.playerId,
          isTeamManager: merged.isTeamManager,
        }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? "更新に失敗しました");
      router.refresh();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "更新に失敗しました");
    }
  }

  async function handleRemove(userId: string, email: string) {
    if (!confirm(`${email} のアクセス権限を削除しますか?`)) return;
    setErrorMsg(null);
    try {
      const res = await fetch("/api/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? "削除に失敗しました");
      router.refresh();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "削除に失敗しました");
    }
  }

  return (
    <div>
      <div className="card" style={{ overflowX: "auto" }}>
        <table>
          <thead>
            <tr>
              <th>メール</th>
              <th>ロール</th>
              <th>選手(player時)</th>
              <th>チーム管理者</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.userId}>
                <td>{u.email}</td>
                <td>
                  <select
                    value={u.role}
                    style={{ padding: "4px 6px", width: 170 }}
                    onChange={(e) => {
                      const role = e.target.value as Role;
                      // 選手ロールに切り替えた際、選手が未紐付けなら先頭の選手を仮に割り当てる
                      // (紐付け忘れでplayer_idがnullのまま保存されるのを防ぐ。すぐ隣のセレクトで変更可能)
                      const playerId = role === "player" ? u.playerId ?? players[0]?.playerId ?? null : u.playerId;
                      patchUser(u.userId, { role, playerId });
                    }}
                  >
                    {ROLE_OPTIONS.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  {u.role === "player" ? (
                    <select
                      value={u.playerId ?? ""}
                      style={{ padding: "4px 6px", width: 130, borderColor: u.playerId ? undefined : "var(--red)" }}
                      onChange={(e) => patchUser(u.userId, { playerId: e.target.value })}
                    >
                      {!u.playerId && <option value="">未選択(選んでください)</option>}
                      {players.map((p) => (
                        <option key={p.playerId} value={p.playerId}>
                          #{p.no} {p.nameJa}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="note">{playerName(u.playerId) || "—"}</span>
                  )}
                </td>
                <td style={{ textAlign: "center" }}>
                  <input
                    type="checkbox"
                    className="chk"
                    checked={u.isTeamManager}
                    onChange={(e) => patchUser(u.userId, { isTeamManager: e.target.checked })}
                  />
                </td>
                <td>
                  <button className="back" style={{ margin: 0 }} onClick={() => handleRemove(u.userId, u.email)}>
                    削除
                  </button>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={5} className="note">
                  まだ登録されているユーザーがいません。
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <p className="note">
          「チーム管理者」はこの一覧そのものを操作できる権限です(役職とは別枠)。少なくとも1人には付けておいてください。
        </p>
      </div>

      <div className="card mt" style={{ maxWidth: 480 }}>
        <h2 className="section-title">ユーザーを追加</h2>
        <form onSubmit={handleAdd}>
          <label>メールアドレス</label>
          <input
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="you@example.com"
            required
          />
          <label>ロール</label>
          <select value={newRole} onChange={(e) => setNewRole(e.target.value as Role)}>
            {ROLE_OPTIONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
          {newRole === "player" && (
            <>
              <label>対応する選手</label>
              <select value={newPlayerId} onChange={(e) => setNewPlayerId(e.target.value)}>
                {players.map((p) => (
                  <option key={p.playerId} value={p.playerId}>
                    #{p.no} {p.nameJa}
                  </option>
                ))}
              </select>
            </>
          )}
          <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 14 }}>
            <input
              type="checkbox"
              className="chk"
              checked={newIsTeamManager}
              onChange={(e) => setNewIsTeamManager(e.target.checked)}
            />
            チーム管理者にする(ユーザー管理ができる)
          </label>
          <button className="submit" type="submit" disabled={loading}>
            {loading ? "登録中..." : "追加する"}
          </button>
        </form>
        <p className="note">
          追加すると、そのメールアドレスでGoogleログイン・メールログインができるようになります(Googleアカウントを事前に作る必要はありません)。
        </p>
        {errorMsg && (
          <p className="note" style={{ color: "var(--red)" }}>
            ⚠️ {errorMsg}
          </p>
        )}
      </div>
    </div>
  );
}
