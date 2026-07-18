import {
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  Legend,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Tooltip,
} from "chart.js";

Chart.register(
  BarController,
  LineController,
  BarElement,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Legend,
  Tooltip
);

Chart.defaults.color = "#6f8a7b";
Chart.defaults.borderColor = "rgba(14, 36, 26, 0.08)";
Chart.defaults.font.size = 11;
Chart.defaults.font.family =
  '"Zen Kaku Gothic New", "Hiragino Kaku Gothic ProN", "Noto Sans JP", system-ui, sans-serif';

// マークは細く・グリッドは控えめに(ホバーで詳細を出す)
Chart.defaults.elements.bar.borderRadius = 4;
Chart.defaults.elements.line.borderWidth = 2;
Chart.defaults.elements.point.radius = 0;
Chart.defaults.elements.point.hoverRadius = 4;
Chart.defaults.elements.point.hitRadius = 12;
Chart.defaults.datasets.bar.maxBarThickness = 16;
Chart.defaults.interaction = {
  mode: "index",
  intersect: false,
  axis: "x",
  includeInvisible: false,
};

Chart.defaults.plugins.legend.labels.usePointStyle = true;
Chart.defaults.plugins.legend.labels.boxWidth = 8;
Chart.defaults.plugins.legend.labels.boxHeight = 8;
Chart.defaults.plugins.legend.labels.padding = 14;

Chart.defaults.plugins.tooltip.backgroundColor = "#10241a";
Chart.defaults.plugins.tooltip.titleColor = "#ffffff";
Chart.defaults.plugins.tooltip.bodyColor = "#d9e5dd";
Chart.defaults.plugins.tooltip.cornerRadius = 8;
Chart.defaults.plugins.tooltip.padding = 10;
Chart.defaults.plugins.tooltip.boxWidth = 8;
Chart.defaults.plugins.tooltip.boxHeight = 8;
Chart.defaults.plugins.tooltip.usePointStyle = true;

Chart.defaults.scale.grid = { ...Chart.defaults.scale.grid, tickLength: 0 };
Chart.defaults.scales.category.grid = {
  ...Chart.defaults.scales.category.grid,
  display: false,
};
