"use client";

import "./chartSetup";
import { Chart } from "react-chartjs-2";

export default function WellnessChart({
  labels,
  distance,
  fatigue,
}: {
  labels: string[];
  distance: number[];
  fatigue: number[];
}) {
  return (
    <Chart
      type="bar"
      data={{
        labels,
        datasets: [
          {
            type: "bar" as const,
            label: "Distance(m)",
            data: distance,
            backgroundColor: "#3379c833",
            borderColor: "#3379c8",
            borderWidth: 1,
            borderRadius: 4,
            yAxisID: "y2",
          },
          {
            type: "line" as const,
            label: "疲労度(1=強い〜5=なし)",
            data: fatigue,
            borderColor: "#b0770f",
            pointRadius: 3,
            tension: 0.35,
            borderWidth: 2,
            yAxisID: "y",
          },
        ],
      }}
      options={{
        maintainAspectRatio: false,
        scales: {
          y: { min: 1, max: 5, position: "left", title: { display: true, text: "疲労度" } },
          y2: {
            position: "right",
            grid: { drawOnChartArea: false },
            title: { display: true, text: "Distance(m)" },
          },
        },
        plugins: { legend: { position: "bottom" } },
      }}
    />
  );
}
