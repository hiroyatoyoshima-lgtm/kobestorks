// 汎用CSVパーサ(§11-1: 実際のKinexon列名は未確定のため、決め打ちにせず
// どんな見出しでも読み込めるようにし、列マッピングはUI側で行う)。
// ダブルクオート囲み・カンマ/セミコロン内包・改行内包(CRLF/LF)・UTF-8 BOMに対応する簡易実装。
// KinexonのエクスポートはExcelのロケール設定によりセミコロン区切りになることがあるため、
// 1行目の出現数からカンマ/セミコロンを自動判定する。

export interface ParsedCsv {
  headers: string[];
  rows: Record<string, string>[];
}

function detectDelimiter(src: string): "," | ";" {
  const firstLine = src.slice(0, src.indexOf("\n") === -1 ? src.length : src.indexOf("\n"));
  const commaCount = (firstLine.match(/,/g) ?? []).length;
  const semicolonCount = (firstLine.match(/;/g) ?? []).length;
  return semicolonCount > commaCount ? ";" : ",";
}

export function parseCsv(text: string): ParsedCsv {
  // 通常のUTF-8 BOM(U+FEFF)に加え、別のツールを経由してBOMが文字化けした
  // "ï»¿"(EF BB BFをLatin-1として誤読した見た目)も念のため除去する。
  const withoutBom =
    text.charCodeAt(0) === 0xfeff ? text.slice(1) : text.startsWith("ï»¿") ? text.slice(3) : text;
  const src = withoutBom.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const delimiter = detectDelimiter(src);

  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
    } else if (ch === delimiter) {
      row.push(field);
      field = "";
    } else if (ch === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += ch;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  const nonEmpty = rows.filter((r) => r.some((c) => c.trim() !== ""));
  if (nonEmpty.length === 0) return { headers: [], rows: [] };

  const headers = nonEmpty[0].map((h) => h.trim());
  const dataRows = nonEmpty.slice(1).map((r) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => (obj[h] = (r[i] ?? "").trim()));
    return obj;
  });

  return { headers, rows: dataRows };
}
