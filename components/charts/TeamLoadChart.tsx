"use client";

import "./chartSetup";
import { Chart } from "react-chartjs-2";

export default function TeamLoadChart({
  labels,
  aal,
  srpe,
}: {
  labels: string[];
  aal: number[];
  srpe: number[];
}) {
  return (
    <Chart
      type="bar"
      data={{
        labels,
        datasets: [
          {
            type: "bar" as const,
            label: "AAL(チーム平均)",
            data: aal,
            backgroundColor: "#1d9e7540",
            borderColor: "#1d9e75",
            borderWidth: 1,
            borderRadius: 4,
            order: 2,
            yAxisID: "y",
          },
          {
            type: "line" as const,
            label: "sRPE(5段階)",
            data: srpe,
            borderColor: "#b0770f",
            backgroundColor: "#b0770f",
            pointRadius: 3,
            pointBackgroundColor: "#b0770f",
            pointBorderColor: "#fff",
            pointBorderWidth: 1.5,
            tension: 0.35,
            borderWidth: 2.5,
            order: 1,
            yAxisID: "y2",
          },
        ],
      }}
      options={{
        maintainAspectRatio: false,
        scales: {
          y: { position: "left", title: { display: true, text: "AAL" } },
          y2: {
            position: "right",
            min: 1,
            max: 5,
            grid: { drawOnChartArea: false },
            title: { display: true, text: "sRPE" },
          },
        },
        plugins: { legend: { position: "bottom" } },
      }}
    />
  );
}
