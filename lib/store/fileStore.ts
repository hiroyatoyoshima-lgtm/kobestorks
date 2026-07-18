// Supabase接続までの「仮のDB」。Route Handler(サーバー側)からのみ読み書きする。
// 保存形状は Supabase 移行時に sessions / daily_load テーブルへそのまま対応させてある。
// 本番接続後は本ファイルの実装だけを Supabase クエリに差し替えれば呼び出し側は変更不要。

import fs from "node:fs";
import path from "node:path";
import type { SessionDrill } from "../types";

const STORE_DIR = path.join(process.cwd(), ".data");
const STORE_PATH = path.join(STORE_DIR, "store.json");

export interface StoredDailyLoad {
  totalAal: number;
  targetAal: number;
  deficitLoad: number;
  deficitMin: number;
  intensityBand: string;
}

export interface SyncLogEntry {
  id: string;
  ranAt: string;
  fileName: string;
  status: "ok" | "error";
  rowCount: number;
  matchedPlayerDates: number;
  unmatchedNames: string[];
  errorRowCount: number;
}

interface Store {
  sessions: Record<string, SessionDrill[]>; // key: playerId__date
  dailyLoad: Record<string, StoredDailyLoad>; // key: playerId__date
  syncLogs: SyncLogEntry[];
}

const EMPTY_STORE: Store = { sessions: {}, dailyLoad: {}, syncLogs: [] };

function key(playerId: string, date: string) {
  return `${playerId}__${date}`;
}

function readStore(): Store {
  try {
    const raw = fs.readFileSync(STORE_PATH, "utf-8");
    return { ...EMPTY_STORE, ...JSON.parse(raw) };
  } catch {
    return structuredClone(EMPTY_STORE);
  }
}

function writeStore(store: Store) {
  if (!fs.existsSync(STORE_DIR)) fs.mkdirSync(STORE_DIR, { recursive: true });
  fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), "utf-8");
}

// 同一date+player_idの再取込みは上書き(冪等)§5.7・§7.5
export function replaceSessionsForPlayerDate(playerId: string, date: string, drills: SessionDrill[]) {
  const store = readStore();
  store.sessions[key(playerId, date)] = drills;
  writeStore(store);
}

export function getSessionsForPlayerDate(playerId: string, date: string): SessionDrill[] {
  return readStore().sessions[key(playerId, date)] ?? [];
}

export function upsertDailyLoad(playerId: string, date: string, load: StoredDailyLoad) {
  const store = readStore();
  store.dailyLoad[key(playerId, date)] = load;
  writeStore(store);
}

export function getDailyLoad(playerId: string, date: string): StoredDailyLoad | undefined {
  return readStore().dailyLoad[key(playerId, date)];
}

// 直近N日で実データ(store)が存在する分だけ返す(§7 ACWR計算に使用)
export function getRecentTotalAal(playerId: string, uptoDateIso: string, days: number): { date: string; totalAal: number }[] {
  const store = readStore();
  const upto = new Date(uptoDateIso + "T00:00:00");
  const out: { date: string; totalAal: number }[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(upto);
    d.setDate(d.getDate() - i);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const entry = store.dailyLoad[key(playerId, iso)];
    if (entry) out.push({ date: iso, totalAal: entry.totalAal });
  }
  return out;
}

export function appendSyncLog(entry: SyncLogEntry) {
  const store = readStore();
  store.syncLogs.unshift(entry);
  store.syncLogs = store.syncLogs.slice(0, 50);
  writeStore(store);
}

export function listSyncLogs(): SyncLogEntry[] {
  return readStore().syncLogs;
}
