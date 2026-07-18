// §4 データ構造に対応する型定義。
// 将来 Supabase に接続する際も同じ形で受け取れるようにしてある。

export type PositionGroup = "GUARD" | "WING" | "BIG";
export type DayType = "練習日" | "試合日" | "OFF";
export type PlayerStatus = "ok" | "warn" | "part" | "out";

// 4.1 players
export interface Player {
  playerId: string;
  no: number;
  nameJa: string;
  nameKinexon: string;
  position: string;
  positionGroup: PositionGroup;
  heightCm?: number;
  weightKg?: number;
  birthday?: string;
  photoUrl?: string;
  active: boolean;
  status: PlayerStatus;
  color: string;
}

// 4.3 daily_load(アプリが自動計算)
export interface DailyLoad {
  playerId: string;
  date: string;
  totalAal: number;
  targetAal: number;
  deficitLoad: number;
  deficitMin: number;
  intensityBand: "VERY-LOW" | "LOW" | "MID" | "HIGH" | "VERY-HIGH";
  acwr: number;
  srpe: number;
}

// 4.4 wellness(全項目 5=良い に正規化)
export interface Wellness {
  playerId: string;
  date: string;
  sleepHours: number;
  sleepQuality: number;
  fatigue: number;
  soreness: number;
  stress: number;
  painFlag: boolean;
  painNote?: string;
  comment?: string;
  submittedAt: string;
}

// 4.5 injuries
export type InjuryStatus = "out" | "part" | "watch";
export interface Injury {
  injuryId: string;
  playerId: string;
  diagnosis: string;
  bodyPart: string;
  side?: string;
  onsetDate: string;
  mechanism: "接触" | "非接触";
  status: InjuryStatus;
  rtpPhase: string;
  rtpTargetDate?: string;
  returnDate?: string;
  note?: string;
  updatedBy: string;
}

// 4.6 care_log
export interface CareLog {
  careId: string;
  date: string;
  time: string;
  playerId: string;
  menu: string;
  staff: string;
  done: boolean;
  note?: string;
}

// 4.2 sessions(Kinexon取込み・ドリル単位で1行)
export interface SessionDrill {
  sessionId: string;
  date: string;
  startTime?: string;
  endTime?: string;
  sessionType?: string;
  drillName: string;
  playerId: string;
  aal: number;
  distanceM?: number;
  distancePerMin?: number;
  accelCount?: number;
  decelCount?: number;
  jumpCount?: number;
  source: "kinexon_csv";
}

// 4.7 inbody
export interface Inbody {
  playerId: string;
  date: string;
  weightKg: number;
  muscleMassKg: number;
  fatMassKg: number;
  fatPct: number;
}

// 4.8 nutrition
export type NutritionTiming = "練習前" | "練習後" | "試合前" | "試合後";
export interface NutritionReport {
  date: string;
  timing: NutritionTiming;
  menu: string[];
  kcal: number;
  proteinG: number;
  fatG: number;
  carbG: number;
  playerNote?: string;
  staff: string;
}

// 4.9 decisions
export interface Decision {
  date: string;
  playerId: string;
  decision: "通常" | "強度減" | "時間短縮" | "個別" | "完全休養" | "ケア" | "医師確認";
  reason: string;
  decidedBy: string;
  outcomeNote?: string;
}

// 4.10 schedule
export interface ScheduleDay {
  date: string;
  dayType: DayType;
}

// アラート(§6)
export type AlertSeverity = "warn" | "alert";
export interface AlertItem {
  playerId: string;
  date: string;
  type: "ACWR" | "WELLNESS" | "LOAD_SPIKE";
  severity: AlertSeverity;
  value: string;
  message: string;
}
