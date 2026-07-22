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
  | "durationMin"
  | "accelCount"
  | "decelCount"
  | "jumpCount"
  | "jumpHeightMaxM"
  | "speedMaxKmh"
  | "changesOfOrientation"
  | "exertions"
  | "anaerobicDistanceM"
  | "accelLoadVeryHigh"
  | "accelLoadHigh";

// Kinexonのセッション別エクスポートには日付列が無いことが多いため、dateは列マッピングではなく
// 取込み画面で直接指定する運用に変更(§5.7)。CSVに日付列がある場合はここでマッピングしてもよい。
export const REQUIRED_FIELDS: MappingField[] = ["playerNameKinexon", "aal"];

export const FIELD_LABELS: Record<MappingField, string> = {
  date: "日付(列がある場合のみ。無ければ下の「対象日」を使用)",
  playerNameKinexon: "選手名 / Kinexon表記(必須)",
  aal: "AAL(必須)",
  drillName: "ドリル名",
  distanceM: "Distance(m)",
  sessionType: "セッション種別",
  startTime: "開始時刻",
  durationMin: "セッション時間(sRPE計算用。HH:MM:SS形式の列)",
  accelCount: "Accel回数",
  decelCount: "Decel回数",
  jumpCount: "Jump回数",
  jumpHeightMaxM: "Jump Height 最大(m)",
  speedMaxKmh: "Speed 最大(km/h)",
  changesOfOrientation: "Changes of Orientation",
  exertions: "Exertions",
  anaerobicDistanceM: "Anaerobic Activity Distance(m)",
  accelLoadVeryHigh: "Acceleration Load(very high)",
  accelLoadHigh: "Acceleration Load(high)",
};

const GUESS_PATTERNS: Record<MappingField, RegExp[]> = {
  date: [/^date$/i, /日付/, /セッション日/],
  playerNameKinexon: [/name/i, /player/i, /選手/, /氏名/],
  drillName: [/drill/i, /ドリル/],
  aal: [/^aal$/i, /aal/i, /player.?load/i, /load/i],
  distanceM: [/distance/i, /走行距離/],
  sessionType: [/session.?type/i, /type/i, /区分/],
  // Kinexonの実エクスポートでは単なる"Time"列がHH:MM:SS形式のセッション時間(開始時刻ではない)
  // であることが多いため、開始時刻より先に判定してdurationMin側に取らせる。
  durationMin: [/^time$/i, /duration/i, /session.?time/i, /所要時間|セッション時間/],
  startTime: [/start.?time/i, /開始/],
  // "Acceleration Load"等の負荷指標と誤マッチしないよう、count/回数を伴う列名のみを対象にする
  accelCount: [/accel.*count/i, /count.*accel/i],
  decelCount: [/decel.*count/i, /count.*decel/i],
  // "Jump Height"等と誤マッチしないよう、"Jumps"のような回数そのものの列名を優先する
  jumpCount: [/^jumps?$/i, /jump.*count/i],
  jumpHeightMaxM: [/jump.*height/i],
  speedMaxKmh: [/speed/i],
  changesOfOrientation: [/change.*orientation/i, /orientation/i],
  exertions: [/exertion/i],
  anaerobicDistanceM: [/anaerobic/i],
  // "very high"を先に判定して使用済みにし、次のaccelLoadHighが誤ってvery high列を拾わないようにする
  accelLoadVeryHigh: [/very.?high/i],
  accelLoadHigh: [/load.*high/i, /high/i],
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

// "HH:MM:SS"(または"MM:SS")形式のセッション時間表記を分に変換する。解釈できなければnull。
export function parseDurationToMinutes(raw: string): number | null {
  const parts = raw.trim().split(":").map(Number);
  if (parts.some((p) => Number.isNaN(p))) return null;
  let totalSeconds: number;
  if (parts.length === 3) {
    const [h, m, s] = parts;
    totalSeconds = h * 3600 + m * 60 + s;
  } else if (parts.length === 2) {
    const [m, s] = parts;
    totalSeconds = m * 60 + s;
  } else {
    return null;
  }
  return +(totalSeconds / 60).toFixed(1);
}

export function normalizeName(raw: string): string {
  return raw.trim().replace(/\s+/g, " ").toLowerCase();
}
