// 一回限りの投入スクリプト。lib/data/seed.ts のダミーデータを実際のSupabaseに書き込む。
// 実行: node scripts/seed-supabase.mjs
// 同じチーム名(神戸ストークス)の既存行があれば削除してから入れ直すので、複数回実行しても重複しない。

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const root = path.dirname(fileURLToPath(import.meta.url)) + "/..";

function loadEnv(filePath) {
  const text = fs.readFileSync(filePath, "utf-8");
  const env = {};
  for (const line of text.split("\n")) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m) env[m[1]] = m[2].trim();
  }
  return env;
}

const env = loadEnv(path.join(root, ".env.local"));
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const TEAM_NAME = "神戸ストークス";

const PLAYERS = [
  { playerId: "P001", no: 1, nameJa: "中野 司", nameKinexon: "Tsukasa Nakano", position: "SG", positionGroup: "GUARD" },
  { playerId: "P003", no: 3, nameJa: "小川 麻斗", nameKinexon: "Mato Ogawa", position: "PG", positionGroup: "GUARD" },
  { playerId: "P004", no: 4, nameJa: "寺園 脩斗", nameKinexon: "Shuto Terazono", position: "PG", positionGroup: "GUARD" },
  { playerId: "P008", no: 8, nameJa: "八村 阿蓮", nameKinexon: "Aren Hachimura", position: "SF", positionGroup: "WING" },
  { playerId: "P012", no: 12, nameJa: "木村 圭吾", nameKinexon: "Keigo Kimura", position: "SG", positionGroup: "GUARD" },
  { playerId: "P013", no: 13, nameJa: "道原 紀晃", nameKinexon: "Norihiro Michihara", position: "PG/SG", positionGroup: "GUARD" },
  { playerId: "P017", no: 17, nameJa: "山口 颯斗", nameKinexon: "Hayato Yamaguchi", position: "SG/SF", positionGroup: "WING" },
  { playerId: "P022", no: 22, nameJa: "ルーカス・サレー", nameKinexon: "Lucas Saley", position: "SF", positionGroup: "WING" },
  { playerId: "P023", no: 23, nameJa: "ヨーリ・チャイルズ", nameKinexon: "Yohri Childs", position: "PF", positionGroup: "BIG" },
  { playerId: "P024", no: 24, nameJa: "中島 三千哉", nameKinexon: "Michiya Nakashima", position: "PG/SG", positionGroup: "GUARD" },
  { playerId: "P030", no: 30, nameJa: "金田 龍弥", nameKinexon: "Tatsuya Kaneda", position: "SF", positionGroup: "WING" },
];

const INJURIES = [
  { playerId: "P008", diagnosis: "(サンプル)右足関節捻挫", bodyPart: "右足関節", onsetDate: "2026-07-02", mechanism: "接触", status: "out", rtpPhase: "Phase 2:荷重・可動域", rtpTargetDate: "2026-07-28", updatedBy: "寺地" },
  { playerId: "P030", diagnosis: "(サンプル)左ハムストリング肉離れ", bodyPart: "左ハムストリング", onsetDate: "2026-07-10", mechanism: "非接触", status: "out", rtpPhase: "Phase 1:保護・治療", rtpTargetDate: "2026-08-08", updatedBy: "寺地" },
  { playerId: "P013", diagnosis: "(サンプル)腰部痛", bodyPart: "腰部", onsetDate: "2026-06-20", mechanism: "非接触", status: "part", rtpPhase: "Phase 3:練習部分復帰", rtpTargetDate: "2026-07-20", updatedBy: "AT 嶺井" },
  { playerId: "P017", diagnosis: "(サンプル)左ハム張り(予防管理)", bodyPart: "左ハムストリング", onsetDate: "2026-07-14", mechanism: "非接触", status: "watch", rtpPhase: "モニタリング中", updatedBy: "寺地" },
];

const CARE_LOGS = [
  { time: "09:00", playerId: "P008", menu: "アイシング+モビリティ", staff: "寺地" },
  { time: "09:30", playerId: "P030", menu: "超音波+軽負荷エクササイズ", staff: "AT 嶺井" },
  { time: "10:00", playerId: "P013", menu: "体幹スタビリティ+徒手", staff: "寺地" },
  { time: "15:30", playerId: "P017", menu: "練習前ハムストリング評価", staff: "寺地" },
  { time: "17:00", playerId: "P008", menu: "プールリハビリ", staff: "AT 石辻" },
];

async function main() {
  console.log("既存の同名チームを削除(冪等化)...");
  const { error: delErr } = await supabase.from("teams").delete().eq("name", TEAM_NAME);
  if (delErr) throw delErr;

  console.log("teams投入...");
  const { data: team, error: teamErr } = await supabase
    .from("teams")
    .insert({ name: TEAM_NAME, color: "#19b356", plan: "trial" })
    .select()
    .single();
  if (teamErr) throw teamErr;
  const teamId = team.team_id;
  console.log("team_id =", teamId);

  console.log("players投入...");
  const { error: playersErr } = await supabase.from("players").insert(
    PLAYERS.map((p) => ({
      team_id: teamId,
      player_id: p.playerId,
      name_ja: p.nameJa,
      name_kinexon: p.nameKinexon,
      number: p.no,
      position: p.position,
      position_group: p.positionGroup,
      active: true,
    }))
  );
  if (playersErr) throw playersErr;

  console.log("injuries投入...");
  const { error: injuriesErr } = await supabase.from("injuries").insert(
    INJURIES.map((i) => ({
      team_id: teamId,
      player_id: i.playerId,
      diagnosis: i.diagnosis,
      body_part: i.bodyPart,
      onset_date: i.onsetDate,
      mechanism: i.mechanism,
      status: i.status,
      rtp_phase: i.rtpPhase,
      rtp_target_date: i.rtpTargetDate ?? null,
      updated_by: i.updatedBy,
    }))
  );
  if (injuriesErr) throw injuriesErr;

  const today = new Date().toISOString().slice(0, 10);
  console.log(`care_log投入(date=${today})...`);
  const { error: careErr } = await supabase.from("care_log").insert(
    CARE_LOGS.map((c) => ({
      team_id: teamId,
      date: today,
      time: c.time,
      player_id: c.playerId,
      menu: c.menu,
      staff: c.staff,
      done: false,
    }))
  );
  if (careErr) throw careErr;

  console.log("完了。投入件数: players=%d injuries=%d care_log=%d", PLAYERS.length, INJURIES.length, CARE_LOGS.length);
}

main().catch((e) => {
  console.error("失敗:", e);
  process.exit(1);
});
