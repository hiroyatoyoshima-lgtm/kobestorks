import { NUTRITION_TODAY } from "@/lib/data/seed";
import NutritionForm from "@/components/NutritionForm";

export default function NutritionPage() {
  const pre = NUTRITION_TODAY.find((n) => n.timing === "練習前");
  const post = NUTRITION_TODAY.find((n) => n.timing === "練習後");

  return (
    <>
      <h2 className="section-title">
        栄養レポート(栄養士入力欄){" "}
        <span style={{ fontSize: 12, color: "var(--muted)", fontWeight: 400 }}>本日分</span>
      </h2>
      <div className="grid two">
        {[pre, post].map((n, i) => (
          <div className="card" key={i}>
            <h2 className="section-title">{n?.timing} MENU</h2>
            <table>
              <tbody>
                {n?.menu.map((m, j) => (
                  <tr key={j}>
                    <td>{m}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt">
              <b>栄養価:</b> {n?.kcal}kcal / P={n?.proteinG} F={n?.fatG} C={n?.carbG}
            </p>
          </div>
        ))}
      </div>
      <NutritionForm />
    </>
  );
}
