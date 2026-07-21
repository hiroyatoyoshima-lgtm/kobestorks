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
          return (
            <div
              key={i}
              style={{
                minHeight: 74,
                borderRadius: 8,
                border: isToday ? "1.5px solid var(--green)" : "1px solid var(--border-soft)",
                background: hasCare ? "var(--green-soft)" : "transparent",
                padding: "4px 5px",
                display: "flex",
                flexDirection: "column",
                gap: 2,
                overflow: "hidden",
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  fontFamily: "var(--font-num)",
                  color: hasCare ? "var(--green-deep)" : "var(--muted)",
                  fontWeight: isToday ? 700 : 400,
                }}
              >
                {day}
              </span>
              {entries?.map((e, idx) => (
                <span
                  key={idx}
                  title={`${e.menu}${e.staff ? " ・" + e.staff : ""}`}
                  style={{
                    fontSize: 10,
                    lineHeight: 1.25,
                    color: "var(--green-deep)",
                    fontWeight: 600,
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  {e.menu}
                </span>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
