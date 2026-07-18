import { getNutritionPageData } from "@/lib/data/nutrition-repo";
import { todayISO } from "@/lib/data/dashboard";
import NutritionForm from "@/components/NutritionForm";

export const dynamic = "force-dynamic";

export default async function NutritionPage() {
  const { reports, source } = await getNutritionPageData(todayISO());
  const pre = reports.find((n) => n.timing === "練習前");
  const post = reports.find((n) => n.timing === "練習後");

  return (
    <>
      <h2 className="section-title">
        栄養レポート(栄養士入力欄){" "}
        {source === "supabase" && <span className="badge b-ok">Supabase接続中</span>}
        <span style={{ fontSize: 12, color: "var(--muted)", fontWeight: 400 }}>本日分</span>
      </h2>
      <div className="grid two">
        {[pre, post].map((n, i) => (
          <div className="card" key={i}>
            <h2 className="section-title">{n?.timing} MENU</h2>
            {n && n.menu.length > 0 ? (
              <table>
                <tbody>
                  {n.menu.map((m, j) => (
                    <tr key={j}>
                      <td>{m}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="note">まだ記録がありません。</p>
            )}
            {n && (
              <p className="mt">
                <b>栄養価:</b> {n.kcal}kcal / P={n.proteinG} F={n.fatG} C={n.carbG}
              </p>
            )}
          </div>
        ))}
      </div>
      <NutritionForm />
    </>
  );
}
