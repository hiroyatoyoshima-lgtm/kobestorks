"use client";

import "./chartSetup";
import { Chart } from "react-chartjs-2";

export default function LineTrendChart({
  labels,
  label,
  data,
  color,
  min = 1,
  max = 5,
}: {
  labels: string[];
  label: string;
  data: number[];
  color: string;
  min?: number;
  max?: number;
}) {
  return (
    <Chart
      type="line"
      data={{
        labels,
        datasets: [
          { type: "line" as const, label, data, borderColor: color, tension: 0.35, pointRadius: 2 },
        ],
      }}
      options={{
        maintainAspectRatio: false,
        scales: { y: { min, max } },
        plugins: { legend: { display: false } },
      }}
    />
  );
}
