import { PLAYERS } from "@/lib/data/seed";
import { getInjuriesPageData } from "@/lib/data/injuries-repo";
import { todayISO } from "@/lib/data/dashboard";
import InjuryTable from "@/components/InjuryTable";
import InjuryForm from "@/components/InjuryForm";
import CareChecklist from "@/components/CareChecklist";
import CareForm from "@/components/CareForm";

// Supabase/ローカルstoreの最新データを毎回取得する(ビルド時にスナップショット固定させない)
export const dynamic = "force-dynamic";

export default async function InjuriesPage() {
  const playerById = new Map(PLAYERS.map((p) => [p.playerId, p]));
  const { injuries, careLogs, source } = await getInjuriesPageData(todayISO());
  const isLive = source === "supabase";

  const injuryRows = injuries.map((inj) => {
    const p = playerById.get(inj.playerId);
    return { ...inj, no: p?.no ?? 0, name: p?.nameJa ?? "不明" };
  });

  const careRows = careLogs.map((c) => {
    const p = playerById.get(c.playerId);
    return {
      id: c.careId,
      time: c.time,
      playerNo: p?.no ?? 0,
      playerName: p?.nameJa ?? "不明",
      menu: c.menu,
      staff: c.staff,
      done: c.done,
    };
  });

  return (
    <>
      <h2 className="section-title">
        怪我人・リハビリ状況{" "}
        {isLive && <span className="badge b-ok">Supabase接続中</span>}
      </h2>
      <div className="card" style={{ overflowX: "auto" }}>
        <InjuryTable rows={injuryRows} editable={isLive} />
      </div>

      {isLive ? (
        <div className="mt">
          <InjuryForm players={PLAYERS} />
        </div>
      ) : (
        <p className="note mt">Supabase未接続のため、新規登録・編集はできません(表示のみ)。</p>
      )}

      <div className="card mt">
        <h2 className="section-title">本日のケア・治療スケジュール</h2>
        <CareChecklist rows={careRows} persist={isLive} />
        <p className="note">
          {isLive
            ? "✓を入れるとSupabaseのcare_logに保存されます。"
            : "✓を入れると記録されます(現在はブラウザ内のみ保存。Supabase未接続のためダミー表示)"}
        </p>
        {isLive && (
          <div className="mt">
            <CareForm players={PLAYERS} />
          </div>
        )}
      </div>
    </>
  );
}
