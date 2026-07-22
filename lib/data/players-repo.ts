// §4.1 players 選手マスタ。Supabase未接続・エラー時は空配列を返す(ダミーの選手は出さない)。
// player.status(ok/warn/part/out)はplayersテーブルには持たせず、injuries(復帰日未確定の怪我)から
// 都度導出する(手動フラグと怪我記録の二重管理を避けるため)。

import { createAdminClient, withTimeout } from "../supabase/admin";
import { getDefaultTeamId } from "../supabase/team";
import type { InjuryStatus, Player, PlayerStatus, PositionGroup } from "../types";

const AVATAR_COLORS = ["#1d9e75", "#3379c8", "#b0770f", "#7c5cd6", "#d9485a", "#0e9c8f"];

interface PlayerDb {
  player_id: string;
  name_ja: string;
  name_kinexon: string;
  number: number;
  position: string | null;
  position_group: PositionGroup;
  height_cm: number | null;
  weight_kg: number | null;
  birthday: string | null;
  photo_url: string | null;
  active: boolean;
}

function statusFromInjuries(playerId: string, activeStatuses: Map<string, InjuryStatus[]>): PlayerStatus {
  const statuses = activeStatuses.get(playerId) ?? [];
  if (statuses.includes("out")) return "out";
  if (statuses.includes("part")) return "part";
  if (statuses.includes("watch")) return "warn";
  return "ok";
}

function toPlayer(r: PlayerDb, index: number, activeStatuses: Map<string, InjuryStatus[]>): Player {
  return {
    playerId: r.player_id,
    no: r.number,
    nameJa: r.name_ja,
    nameKinexon: r.name_kinexon,
    position: r.position ?? "",
    positionGroup: r.position_group,
    heightCm: r.height_cm ?? undefined,
    weightKg: r.weight_kg ?? undefined,
    birthday: r.birthday ?? undefined,
    photoUrl: r.photo_url ?? undefined,
    active: r.active,
    status: statusFromInjuries(r.player_id, activeStatuses),
    color: AVATAR_COLORS[index % AVATAR_COLORS.length],
  };
}

export interface TeamPlayersResult {
  players: Player[];
  source: "supabase" | "seed";
}

export async function getTeamPlayers({ includeInactive = false } = {}): Promise<TeamPlayersResult> {
  try {
    const teamId = await getDefaultTeamId();
    if (!teamId) throw new Error("team not found");
    const supabase = createAdminClient();

    let query = supabase.from("players").select("*").eq("team_id", teamId).order("number");
    if (!includeInactive) query = query.eq("active", true);

    const [playersRes, injuriesRes] = await Promise.all([
      withTimeout(query),
      withTimeout(
        supabase.from("injuries").select("player_id, status").eq("team_id", teamId).is("return_date", null)
      ),
    ]);
    if (playersRes.error) throw playersRes.error;
    if (injuriesRes.error) throw injuriesRes.error;

    const activeStatuses = new Map<string, InjuryStatus[]>();
    for (const r of (injuriesRes.data ?? []) as { player_id: string; status: InjuryStatus }[]) {
      const list = activeStatuses.get(r.player_id) ?? [];
      list.push(r.status);
      activeStatuses.set(r.player_id, list);
    }

    const rows = (playersRes.data ?? []) as PlayerDb[];
    return { players: rows.map((r, i) => toPlayer(r, i, activeStatuses)), source: "supabase" };
  } catch {
    return { players: [], source: "seed" };
  }
}

export async function getTeamPlayer(playerId: string): Promise<Player | undefined> {
  const { players } = await getTeamPlayers({ includeInactive: true });
  return players.find((p) => p.playerId === playerId);
}

export interface PlayerInput {
  nameJa: string;
  nameKinexon: string;
  no: number;
  position: string;
  positionGroup: PositionGroup;
  heightCm: number | null;
  weightKg: number | null;
  birthday: string | null;
}

// player_idは背番号から自動採番する(例: 背番号7→P007)。既存の選手マスタと同じ命名規則。
export async function createPlayer(input: PlayerInput): Promise<void> {
  const teamId = await getDefaultTeamId();
  if (!teamId) throw new Error("チーム情報が見つかりません(Supabaseに接続できない可能性があります)。");
  const supabase = createAdminClient();

  const playerId = `P${String(input.no).padStart(3, "0")}`;
  const { data: existing } = await withTimeout(
    supabase.from("players").select("player_id").eq("team_id", teamId).eq("player_id", playerId).maybeSingle()
  );
  if (existing) throw new Error(`背番号${input.no}は既に登録されています。`);

  const { error } = await withTimeout(
    supabase.from("players").insert({
      team_id: teamId,
      player_id: playerId,
      name_ja: input.nameJa,
      name_kinexon: input.nameKinexon,
      number: input.no,
      position: input.position,
      position_group: input.positionGroup,
      height_cm: input.heightCm,
      weight_kg: input.weightKg,
      birthday: input.birthday,
      active: true,
    })
  );
  if (error) throw new Error(error.message);
}

export async function updatePlayer(playerId: string, patch: Partial<PlayerInput> & { active?: boolean }): Promise<void> {
  const teamId = await getDefaultTeamId();
  if (!teamId) throw new Error("チーム情報が見つかりません(Supabaseに接続できない可能性があります)。");
  const supabase = createAdminClient();
  const update: Record<string, unknown> = {};
  if (patch.nameJa !== undefined) update.name_ja = patch.nameJa;
  if (patch.nameKinexon !== undefined) update.name_kinexon = patch.nameKinexon;
  if (patch.no !== undefined) update.number = patch.no;
  if (patch.position !== undefined) update.position = patch.position;
  if (patch.positionGroup !== undefined) update.position_group = patch.positionGroup;
  if (patch.heightCm !== undefined) update.height_cm = patch.heightCm;
  if (patch.weightKg !== undefined) update.weight_kg = patch.weightKg;
  if (patch.birthday !== undefined) update.birthday = patch.birthday;
  if (patch.active !== undefined) update.active = patch.active;

  const { error } = await withTimeout(
    supabase.from("players").update(update).eq("team_id", teamId).eq("player_id", playerId)
  );
  if (error) throw new Error(error.message);
}

// 選手に紐づくデータが1件でもあるテーブル(§4のFK参照先すべて+ログインアカウント)。
const LINKED_DATA_TABLES: { table: string; label: string }[] = [
  { table: "sessions", label: "Kinexonセッション" },
  { table: "daily_load", label: "日次負荷データ" },
  { table: "wellness", label: "コンディションアンケート" },
  { table: "injuries", label: "怪我記録" },
  { table: "care_log", label: "ケア記録" },
  { table: "inbody", label: "InBody記録" },
  { table: "decisions", label: "判断ログ" },
];

// 入力ミスの取り消し用。何かデータが1件でも紐づいている選手は削除させない
// (履歴を巻き込んで壊れる/FK制約でエラーになるのを避ける。その場合は在籍チェックを外す運用にする)。
export async function deletePlayer(playerId: string): Promise<void> {
  const teamId = await getDefaultTeamId();
  if (!teamId) throw new Error("チーム情報が見つかりません(Supabaseに接続できない可能性があります)。");
  const supabase = createAdminClient();

  for (const { table, label } of LINKED_DATA_TABLES) {
    const { count, error } = await withTimeout(
      supabase.from(table).select("*", { count: "exact", head: true }).eq("team_id", teamId).eq("player_id", playerId)
    );
    if (error) throw new Error(error.message);
    if (count && count > 0) {
      throw new Error(`削除できません: ${label}が${count}件既に登録されています。在籍チェックを外して非表示にしてください。`);
    }
  }

  const { data: userRow, error: userErr } = await withTimeout(
    supabase.from("users").select("email").eq("team_id", teamId).eq("player_id", playerId).maybeSingle()
  );
  if (userErr) throw new Error(userErr.message);
  if (userRow) {
    throw new Error(
      `削除できません: この選手に紐づくログインアカウント(${userRow.email})があります。先にユーザー管理で紐付けを解除してください。`
    );
  }

  const { error } = await withTimeout(
    supabase.from("players").delete().eq("team_id", teamId).eq("player_id", playerId)
  );
  if (error) throw new Error(error.message);
}
