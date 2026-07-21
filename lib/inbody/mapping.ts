// InBody(体組成計)エクスポートCSVの列マッピング。機種・チームごとに列名が異なるため、
// Kinexon取込みと同じく自動推測+手動確認の方式にする(§7.5のSheets同期と同じ思想:
// チームごとの差異はマッピング設定で吸収し、コードは変えない)。

export type MappingField = "date" | "playerName" | "weightKg" | "muscleMassKg" | "fatMassKg" | "fatPct";

// §4.7: 体重・骨格筋量・体脂肪量・体脂肪率は「マスト4項目」(DBもnot null)。
export const REQUIRED_FIELDS: MappingField[] = ["date", "playerName", "weightKg", "muscleMassKg", "fatMassKg", "fatPct"];

export const FIELD_LABELS: Record<MappingField, string> = {
  date: "測定日(必須)",
  playerName: "選手名(必須)",
  weightKg: "体重 kg(必須)",
  muscleMassKg: "骨格筋量 kg(必須)",
  fatMassKg: "体脂肪量 kg(必須)",
  fatPct: "体脂肪率 %(必須)",
};

const GUESS_PATTERNS: Record<MappingField, RegExp[]> = {
  date: [/^date$/i, /測定日/, /日付/],
  playerName: [/name/i, /選手/, /氏名/],
  weightKg: [/weight/i, /体重/],
  muscleMassKg: [/smm/i, /muscle/i, /骨格筋/],
  fatMassKg: [/fat.?mass/i, /体脂肪量/],
  fatPct: [/pbf/i, /fat.?(pct|percent|rate|%)/i, /体脂肪率/],
};

export type ColumnMapping = Partial<Record<MappingField, string>>;

export function guessMapping(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {};
  const used = new Set<string>();
  (Object.keys(GUESS_PATTERNS) as MappingField[]).forEach((field) => {
    const patterns = GUESS_PATTERNS[field];
    const match = headers.find((h) => !used.has(h) && patterns.some((p) => p.test(h)));
    if (match) {
      mapping[field] = match;
      used.add(match);
    }
  });
  return mapping;
}
