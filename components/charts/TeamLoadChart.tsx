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
            backgroundColor: "#19b356",
            borderRadius: 4,
            yAxisID: "y",
          },
          {
            type: "line" as const,
            label: "sRPE(5段階)",
            data: srpe,
            borderColor: "#e0b13d",
            pointRadius: 3,
            tension: 0.35,
            borderWidth: 2,
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
