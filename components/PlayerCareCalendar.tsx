"use client";

import { useState } from "react";

export interface CalendarEntry {
  menu: string;
  staff: string;
  done: boolean;
}

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

export default function PlayerCareCalendar({
  playerNo,
  playerName,
  year,
  month, // 1-12
  careByDate,
}: {
  playerNo: number;
  playerName: string;
  year: number;
  month: number;
  careByDate: Record<string, CalendarEntry[]>;
}) {
  const [selected, setSelected] = useState<string | null>(null);

  const firstOfMonth = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  const startOffset = firstOfMonth.getDay(); // 0=日
  const totalCareDays = Object.keys(careByDate).length;

  const cells: (number | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  function dateKey(day: number) {
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  const todayKey = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  })();

  const selectedEntries = selected ? careByDate[selected] : undefined;

  return (
    <div className="card">
      <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 2 }}>
        #{playerNo} {playerName}
      </h3>
      <p className="note" style={{ marginTop: 0, marginBottom: 10 }}>
        {month}月のケア実施: {totalCareDays}日
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, fontSize: 11 }}>
        {WEEKDAYS.map((w) => (
          <div key={w} style={{ textAlign: "center", color: "var(--muted)", fontWeight: 600, padding: "2px 0" }}>
            {w}
          </div>
        ))}
        {cells.map((day, i) => {
          if (day === null) return <div key={i} />;
          const key = dateKey(day);
          const entries = careByDate[key];
          const hasCare = !!entries && entries.length > 0;
          const isToday = key === todayKey;
          const isSelected = key === selected;
          return (
            <button
              key={i}
              type="button"
              onClick={() => hasCare && setSelected(isSelected ? null : key)}
              style={{
                position: "relative",
                aspectRatio: "1",
                borderRadius: 8,
                border: isToday ? "1.5px solid var(--green)" : "1px solid var(--border-soft)",
                background: isSelected ? "var(--green-soft)" : hasCare ? "var(--panel2)" : "transparent",
                cursor: hasCare ? "pointer" : "default",
                color: "var(--text)",
                fontSize: 11.5,
                fontFamily: "var(--font-num)",
                padding: 0,
              }}
            >
              {day}
              {hasCare && (
                <span
                  style={{
                    position: "absolute",
                    bottom: 3,
                    left: "50%",
                    transform: "translateX(-50%)",
                    width: 5,
                    height: 5,
                    borderRadius: "50%",
                    background: "var(--green)",
                  }}
                />
              )}
            </button>
          );
        })}
      </div>

      {selected && selectedEntries && (
        <div className="mt" style={{ fontSize: 12.5, background: "var(--panel2)", borderRadius: 8, padding: "8px 10px" }}>
          <b>
            {selected.slice(5).replace("-", "/")}
          </b>
          {selectedEntries.map((e, i) => (
            <div key={i} style={{ marginTop: 4, color: "var(--soft)" }}>
              {e.menu}
              {e.staff && <span style={{ color: "var(--muted)" }}> ・{e.staff}</span>}
              {e.done && <span className="badge b-ok" style={{ marginLeft: 6 }}>実施済</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
