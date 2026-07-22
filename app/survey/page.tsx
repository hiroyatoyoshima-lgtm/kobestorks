import { getTeamPlayers } from "@/lib/data/players-repo";
import { getCurrentUser } from "@/lib/auth/session";
import { isPlayerRole } from "@/lib/auth/permissions";
import SurveyForm from "@/components/SurveyForm";

export default async function SurveyPage() {
  const user = await getCurrentUser();
  const { players } = await getTeamPlayers();

  if (isPlayerRole(user)) {
    const player = players.find((p) => p.playerId === user!.playerId);
    if (!player) {
      return (
        <div className="card" style={{ maxWidth: 480 }}>
          <p className="note">選手アカウントに紐づく選手情報が見つかりません。管理者に連絡してください。</p>
        </div>
      );
    }
    return <SurveyForm players={players} lockedPlayer={player} />;
  }

  // admin/プラットフォーム管理者は代理入力(選手を選んで送信)ができる。それ以外の職員は対象外。
  if (!user?.isSuperAdmin && user?.role !== "admin") {
    return (
      <div className="card" style={{ maxWidth: 480 }}>
        <p className="note">この画面を見る権限がありません。</p>
      </div>
    );
  }

  return <SurveyForm players={players} />;
}
