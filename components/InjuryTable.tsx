"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Injury } from "@/lib/types";
import PlayerCareCalendar, { type CalendarEntry } from "./PlayerCareCalendar";

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

type Row = Injury & { no: number; name: string };

export default function InjuryTable({
  rows,
  editable = false,
  careCalendar,
  calendarYear,
  calendarMonth,
}: {
  rows: Row[];
  editable?: boolean;
  careCalendar?: Record<string, Record<string, CalendarEntry[]>>;
  calendarYear?: number;
  calendarMonth?: number;
}) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  function toggle(playerId: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(playerId)) next.delete(playerId);
      else next.add(playerId);
      return next;
    });
  }

  const colSpan = 6 + (editable ? 1 : 0);
  const canShowCalendar = !!careCalendar && !!calendarYear && !!calendarMonth;

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
          {editable && <th></th>}
        </tr>
      </thead>
      <tbody>
        {rows.map((r) =>
          editingId === r.injuryId ? (
            <EditRow key={r.injuryId} row={r} onDone={() => { setEditingId(null); router.refresh(); }} onCancel={() => setEditingId(null)} />
          ) : (
            <>
              <tr key={r.injuryId}>
                <td>
                  {canShowCalendar ? (
                    <button
                      type="button"
                      onClick={() => toggle(r.playerId)}
                      style={{
                        background: "none",
                        border: "none",
                        padding: 0,
                        cursor: "pointer",
                        color: "var(--text)",
                        fontWeight: 700,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 5,
                      }}
                    >
                      <span style={{ fontSize: 10, color: "var(--green)" }}>
                        {expandedIds.has(r.playerId) ? "▼" : "▶"}
                      </span>
                      #{r.no} {r.name}
                      <span
                        title="クリックでケア実施カレンダーを表示"
                        style={{ fontSize: 12, opacity: 0.7 }}
                      >
                        📅
                      </span>
                    </button>
                  ) : (
                    <b>
                      #{r.no} {r.name}
                    </b>
                  )}
                </td>
                <td>{r.diagnosis}</td>
                <td>
                  <span className={`badge ${STATUS_BADGE[r.status]}`}>{STATUS_TEXT[r.status]}</span>
                </td>
                <td>{r.onsetDate}</td>
                <td>{r.rtpTargetDate ?? "—"}</td>
                <td>{r.rtpPhase}</td>
                {editable && (
                  <td>
                    <button className="back" style={{ margin: 0 }} onClick={() => setEditingId(r.injuryId)}>
                      編集
                    </button>
                  </td>
                )}
              </tr>
              {canShowCalendar && expandedIds.has(r.playerId) && (
                <tr>
                  <td colSpan={colSpan} style={{ background: "var(--bg-tint)", padding: 12 }}>
                    <PlayerCareCalendar
                      playerNo={r.no}
                      playerName={r.name}
                      year={calendarYear!}
                      month={calendarMonth!}
                      careByDate={careCalendar![r.playerId] ?? {}}
                    />
                  </td>
                </tr>
              )}
            </>
          )
        )}
      </tbody>
    </table>
  );
}

function EditRow({ row, onDone, onCancel }: { row: Row; onDone: () => void; onCancel: () => void }) {
  const [status, setStatus] = useState(row.status);
  const [rtpPhase, setRtpPhase] = useState(row.rtpPhase ?? "");
  const [rtpTargetDate, setRtpTargetDate] = useState(row.rtpTargetDate ?? "");
  const [note, setNote] = useState(row.note ?? "");
  const [loading, setLoading] = useState(false);

  async function save() {
    setLoading(true);
    try {
      await fetch("/api/injuries", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          injuryId: row.injuryId,
          status,
          rtpPhase,
          rtpTargetDate: rtpTargetDate || null,
          note,
        }),
      });
      onDone();
    } finally {
      setLoading(false);
    }
  }

  return (
    <tr>
      <td>
        <b>
          #{row.no} {row.name}
        </b>
      </td>
      <td>{row.diagnosis}</td>
      <td>
        <select value={status} onChange={(e) => setStatus(e.target.value as Injury["status"])} style={{ padding: "4px 6px" }}>
          <option value="out">離脱中</option>
          <option value="part">部分参加</option>
          <option value="watch">要観察</option>
        </select>
      </td>
      <td>{row.onsetDate}</td>
      <td>
        <input type="date" value={rtpTargetDate} onChange={(e) => setRtpTargetDate(e.target.value)} style={{ padding: "4px 6px" }} />
      </td>
      <td>
        <input type="text" value={rtpPhase} onChange={(e) => setRtpPhase(e.target.value)} style={{ padding: "4px 6px" }} />
      </td>
      <td style={{ whiteSpace: "nowrap" }}>
        <button className="submit" style={{ margin: 0, padding: "6px 10px", fontSize: 12 }} disabled={loading} onClick={save}>
          保存
        </button>
        <button className="back" style={{ margin: "0 0 0 6px" }} onClick={onCancel}>
          取消
        </button>
      </td>
    </tr>
  );
}
