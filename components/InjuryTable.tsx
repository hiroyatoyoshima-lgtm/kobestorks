"use client";

import { useState } from "react";
import type { Injury } from "@/lib/types";

const STATUS_BADGE: Record<string, string> = {
  out: "b-out",
  part: "b-part",
  watch: "b-soon",
};
const STATUS_TEXT: Record<string, string> = {
  out: "離脱中",
  part: "部分参加",
  watch: "要観察",
};

export default function InjuryTable({
  rows,
}: {
  rows: (Injury & { no: number; name: string })[];
}) {
  const [done, setDone] = useState<Record<string, boolean>>({});

  return (
    <table>
      <thead>
        <tr>
          <th>選手</th>
          <th>部位・診断</th>
          <th>ステータス</th>
          <th>受傷日</th>
          <th>復帰予定</th>
          <th>フェーズ</th>
          <th>本日ケア</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.injuryId}>
            <td>
              <b>
                #{r.no} {r.name}
              </b>
            </td>
            <td>{r.diagnosis}</td>
            <td>
              <span className={`badge ${STATUS_BADGE[r.status]}`}>{STATUS_TEXT[r.status]}</span>
            </td>
            <td>{r.onsetDate}</td>
            <td>{r.rtpTargetDate ?? "—"}</td>
            <td>{r.rtpPhase}</td>
            <td>
              <input
                type="checkbox"
                className="chk"
                checked={!!done[r.injuryId]}
                onChange={(e) => setDone((prev) => ({ ...prev, [r.injuryId]: e.target.checked }))}
              />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
