// プロトタイプと同じ疑似乱数(日付シード)ロジック。
// 同じ日付なら常に同じダミー値が出るため、日付ナビで過去日を選んでも
// 「その日のレポートが再現できる」(§13 受入基準)を満たす。

export function dateSeed(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return y * 372 + m * 31 + d;
}

export function seededSeries(seed: number, base: number, amp: number, days: string[]): number[] {
  let x = seed + dateSeed(days[days.length - 1]);
  return days.map((_, i) => {
    x = (x * 9301 + 49297) % 233280;
    const r = x / 233280;
    const game = i % 7 === 5 ? amp * 0.6 : 0;
    return Math.round(base + (r - 0.5) * amp + game);
  });
}

export function seededScale5(seed: number, base: number, days: string[], seed2: number): number[] {
  return days.map((_, i) => {
    const r = (((seed + seed2 + i) * 37) % 20) / 20;
    return +Math.min(5, Math.max(1, base + (r - 0.5) * 1.6 + (i % 7 === 5 ? 0.5 : 0))).toFixed(1);
  });
}

export function last14Days(anchorDate: string): string[] {
  const anchor = new Date(anchorDate + "T00:00:00");
  return [...Array(14)].map((_, i) => {
    const d = new Date(anchor);
    d.setDate(d.getDate() - 13 + i);
    return toISO(d);
  });
}

export function toISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function labelMD(iso: string): string {
  const [, m, d] = iso.split("-").map(Number);
  return `${m}/${d}`;
}

export function dayType(iso: string): "練習日" | "試合日" | "OFF" {
  const wd = new Date(iso + "T00:00:00").getDay();
  if (wd === 6 || wd === 3) return "試合日";
  if (wd === 1) return "OFF";
  return "練習日";
}
