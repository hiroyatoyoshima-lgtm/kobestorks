// 神戸ストークス 2026-27ロスター(プロトタイプ storks_performance_app_prototype.html 準拠)。
// 負荷・怪我・栄養等の数値はすべてダミー。実データは Supabase 接続後に §7.5 の Sheets 同期または
// Kinexon CSV 取込み(§5.7)で置き換わる。

import type { CareLog, Injury, NutritionReport, Player } from "../types";

const AVATAR_COLORS = ["#1d9e75", "#3379c8", "#b0770f", "#7c5cd6", "#d9485a", "#0e9c8f"];

export const PLAYERS: Player[] = [
  { playerId: "P001", no: 1, nameJa: "中野 司", nameKinexon: "Tsukasa Nakano", position: "SG", positionGroup: "GUARD", active: true, status: "ok", color: AVATAR_COLORS[0] },
  { playerId: "P003", no: 3, nameJa: "小川 麻斗", nameKinexon: "Mato Ogawa", position: "PG", positionGroup: "GUARD", active: true, status: "ok", color: AVATAR_COLORS[1] },
  { playerId: "P004", no: 4, nameJa: "寺園 脩斗", nameKinexon: "Shuto Terazono", position: "PG", positionGroup: "GUARD", active: true, status: "ok", color: AVATAR_COLORS[2] },
  { playerId: "P008", no: 8, nameJa: "八村 阿蓮", nameKinexon: "Aren Hachimura", position: "SF", positionGroup: "WING", active: true, status: "out", color: AVATAR_COLORS[3] },
  { playerId: "P012", no: 12, nameJa: "木村 圭吾", nameKinexon: "Keigo Kimura", position: "SG", positionGroup: "GUARD", active: true, status: "warn", color: AVATAR_COLORS[4] },
  { playerId: "P013", no: 13, nameJa: "道原 紀晃", nameKinexon: "Norihiro Michihara", position: "PG/SG", positionGroup: "GUARD", active: true, status: "part", color: AVATAR_COLORS[5] },
  { playerId: "P017", no: 17, nameJa: "山口 颯斗", nameKinexon: "Hayato Yamaguchi", position: "SG/SF", positionGroup: "WING", active: true, status: "warn", color: AVATAR_COLORS[0] },
  { playerId: "P022", no: 22, nameJa: "ルーカス・サレー", nameKinexon: "Lucas Saley", position: "SF", positionGroup: "WING", active: true, status: "ok", color: AVATAR_COLORS[1] },
  { playerId: "P023", no: 23, nameJa: "ヨーリ・チャイルズ", nameKinexon: "Yohri Childs", position: "PF", positionGroup: "BIG", active: true, status: "ok", color: AVATAR_COLORS[2] },
  { playerId: "P024", no: 24, nameJa: "中島 三千哉", nameKinexon: "Michiya Nakashima", position: "PG/SG", positionGroup: "GUARD", active: true, status: "warn", color: AVATAR_COLORS[3] },
  { playerId: "P030", no: 30, nameJa: "金田 龍弥", nameKinexon: "Tatsuya Kaneda", position: "SF", positionGroup: "WING", active: true, status: "out", color: AVATAR_COLORS[4] },
];

export const STATUS_LABEL: Record<Player["status"], string> = {
  ok: "通常参加",
  warn: "要観察",
  part: "部分参加",
  out: "離脱中",
};

export const INJURIES: Injury[] = [
  {
    injuryId: "INJ001",
    playerId: "P008",
    diagnosis: "(サンプル)右足関節捻挫",
    bodyPart: "右足関節",
    onsetDate: "2026-07-02",
    mechanism: "接触",
    status: "out",
    rtpPhase: "Phase 2:荷重・可動域",
    rtpTargetDate: "2026-07-28",
    updatedBy: "寺地",
  },
  {
    injuryId: "INJ002",
    playerId: "P030",
    diagnosis: "(サンプル)左ハムストリング肉離れ",
    bodyPart: "左ハムストリング",
    onsetDate: "2026-07-10",
    mechanism: "非接触",
    status: "out",
    rtpPhase: "Phase 1:保護・治療",
    rtpTargetDate: "2026-08-08",
    updatedBy: "寺地",
  },
  {
    injuryId: "INJ003",
    playerId: "P013",
    diagnosis: "(サンプル)腰部痛",
    bodyPart: "腰部",
    onsetDate: "2026-06-20",
    mechanism: "非接触",
    status: "part",
    rtpPhase: "Phase 3:練習部分復帰",
    rtpTargetDate: "2026-07-20",
    updatedBy: "AT 嶺井",
  },
  {
    injuryId: "INJ004",
    playerId: "P017",
    diagnosis: "(サンプル)左ハム張り(予防管理)",
    bodyPart: "左ハムストリング",
    onsetDate: "2026-07-14",
    mechanism: "非接触",
    status: "watch",
    rtpPhase: "モニタリング中",
    updatedBy: "寺地",
  },
];

export const CARE_LOGS: CareLog[] = [
  { careId: "C1", date: "today", time: "09:00", playerId: "P008", menu: "アイシング+モビリティ", staff: "寺地", done: false },
  { careId: "C2", date: "today", time: "09:30", playerId: "P030", menu: "超音波+軽負荷エクササイズ", staff: "AT 嶺井", done: false },
  { careId: "C3", date: "today", time: "10:00", playerId: "P013", menu: "体幹スタビリティ+徒手", staff: "寺地", done: false },
  { careId: "C4", date: "today", time: "15:30", playerId: "P017", menu: "練習前ハムストリング評価", staff: "寺地", done: false },
  { careId: "C5", date: "today", time: "17:00", playerId: "P008", menu: "プールリハビリ", staff: "AT 石辻", done: false },
];

export const NUTRITION_TODAY: NutritionReport[] = [
  {
    date: "today",
    timing: "練習前",
    menu: ["ご飯", "チキンソテー〜ピザソース〜", "サラダ", "コンソメスープ(ほうれん草、人参)"],
    kcal: 1001,
    proteinG: 49,
    fatG: 43,
    carbG: 115,
    staff: "管理栄養士",
  },
  {
    date: "today",
    timing: "練習後",
    menu: ["おにぎり(梅、昆布、ツナマヨ、高菜)", "ハムチーズサンド", "コーンマヨトースト"],
    kcal: 834,
    proteinG: 27,
    fatG: 27,
    carbG: 130,
    staff: "管理栄養士",
  },
];

export const ALERT_MESSAGE_TEMPLATES = [
  { severity: "alert" as const, text: "急性:慢性負荷比 1.42(基準1.3超過)。負荷調整を推奨" },
  { severity: "warn" as const, text: "睡眠の質2/5が3日連続。ヒアリング推奨" },
  { severity: "warn" as const, text: "筋肉痛(左ハムストリング)4/5。練習前チェック要" },
  { severity: "warn" as const, text: "sRPE 5/5申告。翌日の負荷を要調整" },
  { severity: "alert" as const, text: "Distanceが直近平均比+35%。リカバリー優先を推奨" },
];

export const COMMENT_TEMPLATES = [
  "設定しているACWRにBIGのメンバーはヒットしていて、このままシミュレーション通りに行けば週末にピークを持って行けそうです。",
  "数名レッドゾーンですが明日の練習でおおかた元に戻る予定です。強度設定はナイス判断でした。",
  "全体的に疲労スコアが低下傾向。本日のリカバリーセッションを重点的に実施しました。",
  "試合翌日のためロード軽め。離脱組はリハビリプログラム通り進行中です。",
  "来週の連戦に向けて今週は段階的に負荷を上げています。ウェルネス低下者は個別調整済み。",
];
