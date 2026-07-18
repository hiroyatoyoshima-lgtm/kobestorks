"use client";

import { useState } from "react";

export interface CareRow {
  id: string;
  time: string;
  playerNo: number;
  playerName: string;
  menu: string;
  staff: string;
  done?: boolean;
}

export default function CareChecklist({ rows, persist = false }: { rows: CareRow[]; persist?: boolean }) {
  const [doneMap, setDoneMap] = useState<Record<string, boolean>>(
    Object.fromEntries(rows.map((r) => [r.id, !!r.done]))
  );

  async function toggle(id: string, value: boolean) {
    setDoneMap((prev) => ({ ...prev, [id]: value }));
    if (persist) {
      try {
        await fetch("/api/care", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ careId: id, done: value }),
        });
      } catch {
        // 保存に失敗してもUIは操作可能なままにする(ネットワーク断など)
      }
    }
  }

  return (
    <table>
      <thead>
        <tr>
          <th>時間</th>
          <th>選手</th>
          <th>内容</th>
          <th>担当</th>
          <th>実施</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.id}>
            <td>{r.time}</td>
            <td>
              <b>
                #{r.playerNo} {r.playerName}
              </b>
            </td>
            <td>{r.menu}</td>
            <td>{r.staff}</td>
            <td>
              <input
                type="checkbox"
                className="chk"
                checked={!!doneMap[r.id]}
                onChange={(e) => toggle(r.id, e.target.checked)}
              />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
