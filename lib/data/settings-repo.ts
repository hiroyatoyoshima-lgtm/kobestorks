import { createAdminClient, withTimeout } from "../supabase/admin";
import { getDefaultTeamId } from "../supabase/team";
import { DEFAULT_SETTINGS, type TeamSettings } from "../settings";

const INTENSITY_LABELS = ["VERY-LOW", "LOW", "MID", "HIGH"] as const;

// Supabase(jsonb)は Infinity を保存できないため、上限なしのVERY-HIGH帯を除いた
// 4段階のしきい値だけを保存し、読み込み時に復元する。
type StoredSettings = Omit<TeamSettings, "intensityBands"> & {
  intensityThresholds: number[]; // [veryLowMax, lowMax, midMax, highMax]
};

function toStored(s: TeamSettings): StoredSettings {
  const { intensityBands, ...rest } = s;
  return {
    ...rest,
    intensityThresholds: intensityBands.filter((b) => Number.isFinite(b.max)).map((b) => b.max),
  };
}

function fromStored(s: Partial<StoredSettings>): TeamSettings {
  const defaultThresholds = DEFAULT_SETTINGS.intensityBands
    .filter((b) => Number.isFinite(b.max))
    .map((b) => b.max);
  const thresholds = s.intensityThresholds ?? defaultThresholds;

  return {
    ...DEFAULT_SETTINGS,
    ...s,
    intensityBands: [
      ...INTENSITY_LABELS.map((label, i) => ({ label, max: thresholds[i] ?? defaultThresholds[i] })),
      { label: "VERY-HIGH" as const, max: Infinity },
    ],
  };
}

export interface TeamSettingsResult {
  settings: TeamSettings;
  source: "supabase" | "seed";
}

// Supabase未接続・エラー時は source:"seed"(コード内デフォルト・編集不可)。
// 接続済みなら、まだ保存されていなくても source:"supabase"(デフォルト値を初期表示しつつ編集可)。
export async function getTeamSettings(): Promise<TeamSettingsResult> {
  try {
    const teamId = await getDefaultTeamId();
    if (!teamId) return { settings: DEFAULT_SETTINGS, source: "seed" };

    const supabase = createAdminClient();
    const { data, error } = await withTimeout(
      supabase.from("settings").select("value").eq("team_id", teamId).eq("key", "team_settings").maybeSingle()
    );
    if (error) return { settings: DEFAULT_SETTINGS, source: "seed" };
    if (!data) return { settings: DEFAULT_SETTINGS, source: "supabase" };

    return { settings: fromStored(data.value as Partial<StoredSettings>), source: "supabase" };
  } catch {
    return { settings: DEFAULT_SETTINGS, source: "seed" };
  }
}

export async function saveTeamSettings(settings: TeamSettings): Promise<void> {
  const teamId = await getDefaultTeamId();
  if (!teamId) throw new Error("チーム情報が見つかりません(Supabaseに接続できない可能性があります)。");

  const supabase = createAdminClient();
  const { error } = await withTimeout(
    supabase
      .from("settings")
      .upsert({ team_id: teamId, key: "team_settings", value: toStored(settings) }, { onConflict: "team_id,key" })
  );
  if (error) throw new Error(error.message);
}
