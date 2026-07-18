"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { toISO } from "@/lib/data/rng";

const DAY_TYPE_BADGE: Record<string, string> = {
  試合日: "b-part",
  OFF: "b-ok",
  練習日: "b-soon",
};

export default function DateNav({ date, dayType }: { date: string; dayType: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setDate(next: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("date", next);
    router.push(`${pathname}?${params.toString()}`);
  }

  function shift(n: number) {
    const d = new Date(date + "T00:00:00");
    d.setDate(d.getDate() + n);
    setDate(toISO(d));
  }

  return (
    <div className="datenav">
      <button onClick={() => shift(-1)}>◀ 前日</button>
      <input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} />
      <button onClick={() => shift(1)}>翌日 ▶</button>
      <span className={`badge ${DAY_TYPE_BADGE[dayType] ?? "b-soon"}`}>{dayType}</span>
      <span style={{ fontSize: 11, color: "var(--muted)" }}>
        日付を選ぶとその日のレポートに切替(現在はダミーデータ)
      </span>
    </div>
  );
}
