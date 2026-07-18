"use client";

import "./chartSetup";
import { Chart } from "react-chartjs-2";

export default function BarLineChart({
  labels,
  label,
  data,
  color,
}: {
  labels: string[];
  label: string;
  data: number[];
  color: string;
}) {
  return (
    <Chart
      type="bar"
      data={{
        labels,
        datasets: [{ type: "bar" as const, label, data, backgroundColor: color, borderRadius: 4 }],
      }}
      options={{ maintainAspectRatio: false, plugins: { legend: { display: false } } }}
    />
  );
}
