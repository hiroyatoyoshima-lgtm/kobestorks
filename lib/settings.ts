// §6 アラートロジック・§7 計算仕様の閾値。
// 将来 `settings` テーブル(チームごと)から読み込む前提の形にしてあり、
// コード側は DEFAULT_SETTINGS 経由でのみ値を参照する(ハードコード禁止・§6/§8)。

import type { DayType, PositionGroup } from "./types";

export interface TeamSettings {
  acwrWarn: number;
  acwrAlert: number;
  wellnessWindowDays: number;
  wellnessWarnPct: number;
  wellnessAlertPct: number;
  wellnessMinDays: number;
  loadSpikePct: number;
  targetAalByPositionGroup: Record<PositionGroup, number>;
  dayTypeCoefficient: Record<DayType, number>;
  intensityBands: { label: DailyIntensityBand; max: number }[];
}

export type DailyIntensityBand = "VERY-LOW" | "LOW" | "MID" | "HIGH" | "VERY-HIGH";

export const DEFAULT_SETTINGS: TeamSettings = {
  acwrWarn: 1.2,
  acwrAlert: 1.3,
  wellnessWindowDays: 7,
  wellnessWarnPct: 15,
  wellnessAlertPct: 25,
  wellnessMinDays: 3,
  loadSpikePct: 30,
  targetAalByPositionGroup: {
    GUARD: 420,
    WING: 400,
    BIG: 360,
  },
  dayTypeCoefficient: {
    練習日: 1.0,
    試合日: 1.15,
    OFF: 0.3,
  },
  intensityBands: [
    { label: "VERY-LOW", max: 200 },
    { label: "LOW", max: 320 },
    { label: "MID", max: 440 },
    { label: "HIGH", max: 560 },
    { label: "VERY-HIGH", max: Infinity },
  ],
};
