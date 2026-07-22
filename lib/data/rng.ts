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
