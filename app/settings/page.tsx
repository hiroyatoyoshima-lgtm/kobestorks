import { getTeamSettings } from "@/lib/data/settings-repo";
import SettingsForm from "@/components/SettingsForm";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const { settings, source } = await getTeamSettings();
  const isLive = source === "supabase";

  return (
    <>
      <h2 className="section-title">
        設定{" "}
        <span style={{ fontSize: 12, color: "var(--muted)", fontWeight: 400 }}>
          管理者用・ACWR/AAL/アラート閾値(§6・§7)
        </span>
      </h2>
      <SettingsForm settings={settings} editable={isLive} />
    </>
  );
}
