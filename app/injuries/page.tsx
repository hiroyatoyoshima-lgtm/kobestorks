import { CARE_LOGS, INJURIES, PLAYERS } from "@/lib/data/seed";
import InjuryTable from "@/components/InjuryTable";
import CareChecklist from "@/components/CareChecklist";

export default function InjuriesPage() {
  const playerById = new Map(PLAYERS.map((p) => [p.playerId, p]));

  const injuryRows = INJURIES.map((inj) => {
    const p = playerById.get(inj.playerId);
    return { ...inj, no: p?.no ?? 0, name: p?.nameJa ?? "不明" };
  });

  const careRows = CARE_LOGS.map((c) => {
    const p = playerById.get(c.playerId);
    return {
      id: c.careId,
      time: c.time,
      playerNo: p?.no ?? 0,
      playerName: p?.nameJa ?? "不明",
      menu: c.menu,
      staff: c.staff,
    };
  });

  return (
    <>
      <h2 className="section-title">怪我人・リハビリ状況</h2>
      <div className="card" style={{ overflowX: "auto" }}>
        <InjuryTable rows={injuryRows} />
      </div>

      <div className="card mt">
        <h2 className="section-title">本日のケア・治療スケジュール</h2>
        <CareChecklist rows={careRows} />
        <p className="note">✓を入れると記録されます(現在はブラウザ内のみ保存。Supabase接続後にcare_logへ書き込み)</p>
      </div>
    </>
  );
}
