"use client";

import "./chartSetup";
import { Chart } from "react-chartjs-2";

export default function InbodyChart({
  labels,
  weightKg,
  muscleMassKg,
  fatPct,
}: {
  labels: string[];
  weightKg: number[];
  muscleMassKg: number[];
  fatPct: number[];
}) {
  return (
    <Chart
      type="line"
      data={{
        labels,
        datasets: [
          { type: "line" as const, label: "体重(kg)", data: weightKg, borderColor: "#1d9e75", tension: 0.3 },
          { type: "line" as const, label: "骨格筋量(kg)", data: muscleMassKg, borderColor: "#3379c8", tension: 0.3 },
          { type: "line" as const, label: "体脂肪率(%)", data: fatPct, borderColor: "#b0770f", tension: 0.3 },
        ],
      }}
      options={{ maintainAspectRatio: false, plugins: { legend: { position: "bottom" } } }}
    />
  );
}
