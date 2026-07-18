// Kinexon CSVの列名は実データが来るまで未確定(§11-1)。
// ここでは「よくある見出し」から自動推測しつつ、管理画面で必ず人間が確認・修正できるようにする。

export type MappingField =
  | "date"
  | "playerNameKinexon"
  | "drillName"
  | "aal"
  | "distanceM"
  | "sessionType"
  | "startTime"
  | "accelCount"
  | "decelCount"
  | "jumpCount";

export const REQUIRED_FIELDS: MappingField[] = ["date", "playerNameKinexon", "aal"];

export const FIELD_LABELS: Record<MappingField, string> = {
  date: "日付(必須)",
  playerNameKinexon: "選手名 / Kinexon表記(必須)",
  aal: "AAL(必須)",
  drillName: "ドリル名",
  distanceM: "Distance(m)",
  sessionType: "セッション種別",
  startTime: "開始時刻",
  accelCount: "Accel回数",
  decelCount: "Decel回数",
  jumpCount: "Jump回数",
};

const GUESS_PATTERNS: Record<MappingField, RegExp[]> = {
  date: [/^date$/i, /日付/, /セッション日/],
  playerNameKinexon: [/name/i, /player/i, /選手/, /氏名/],
  drillName: [/drill/i, /activity/i, /ドリル/],
  aal: [/^aal$/i, /aal/i, /player.?load/i, /load/i],
  distanceM: [/distance/i, /走行距離/],
  sessionType: [/session.?type/i, /type/i, /区分/],
  startTime: [/start/i, /time/i, /開始/],
  accelCount: [/accel/i],
  decelCount: [/decel/i],
  jumpCount: [/jump/i],
};

export type ColumnMapping = Partial<Record<MappingField, string>>;

export function guessMapping(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {};
  const used = new Set<string>();
  (Object.keys(GUESS_PATTERNS) as MappingField[]).forEach((field) => {
    const patterns = GUESS_PATTERNS[field];
    const match = headers.find(
      (h) => !used.has(h) && patterns.some((p) => p.test(h))
    );
    if (match) {
      mapping[field] = match;
      used.add(match);
    }
  });
  return mapping;
}

// Kinexonの日付表記(YYYY-MM-DD / YYYY/MM/DD / MM/DD/YYYY 等)をISOに正規化する。
export function normalizeDate(raw: string): string | null {
  const s = raw.trim();
  let m = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  m = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (m) return `${m[3]}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}`;
  return null;
}

export function normalizeName(raw: string): string {
  return raw.trim().replace(/\s+/g, " ").toLowerCase();
}
