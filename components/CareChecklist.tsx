"use client";

import { useState } from "react";

export interface CareRow {
  id: string;
  time: string;
  playerNo: number;
  playerName: string;
  menu: string;
  staff: string;
}

export default function CareChecklist({ rows }: { rows: CareRow[] }) {
  const [done, setDone] = useState<Record<string, boolean>>({});

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
                checked={!!done[r.id]}
                onChange={(e) => setDone((prev) => ({ ...prev, [r.id]: e.target.checked }))}
              />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
