import {
  SERIES_COLOR,
  CATEGORY_LABELS,
  baseLineDataset,
  commonScales,
  commonPlugins,
} from "./chartTheme.js";
import { monthKeyLabel } from "./financialYear.js";
import { CATEGORY_KEYS } from "./data.js";

const registry = new Map();

function renderChart(canvasId, config) {
  const existing = registry.get(canvasId);
  if (existing) existing.destroy();
  const ctx = document.getElementById(canvasId);
  const chart = new Chart(ctx, config);
  registry.set(canvasId, chart);
  return chart;
}

function monthLabels(keys) {
  return keys.map(monthKeyLabel);
}

export function renderMTDChart(canvasId, series) {
  renderChart(canvasId, {
    type: "line",
    data: {
      labels: monthLabels(series.labels),
      datasets: [
        baseLineDataset("Gross", series.gross, SERIES_COLOR.gross),
        baseLineDataset("Nett", series.nett, SERIES_COLOR.nett),
        baseLineDataset("Target", series.target, SERIES_COLOR.target, true),
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      plugins: commonPlugins(true),
      scales: commonScales("Rand (R)"),
    },
  });
}

export function renderYTDChart(canvasId, series) {
  renderChart(canvasId, {
    type: "line",
    data: {
      labels: monthLabels(series.labels),
      datasets: [
        baseLineDataset("Gross YTD", series.ytdGross, SERIES_COLOR.gross),
        baseLineDataset("Nett YTD", series.ytdNett, SERIES_COLOR.nett),
        baseLineDataset("Target YTD", series.ytdTarget, SERIES_COLOR.target, true),
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      plugins: commonPlugins(true),
      scales: commonScales("Cumulative Rand (R)"),
    },
  });
}

export function renderBreakdownChart(canvasId, series) {
  const datasets = CATEGORY_KEYS.map((key) =>
    baseLineDataset(CATEGORY_LABELS[key], series.actuals[key], SERIES_COLOR[key])
  );
  renderChart(canvasId, {
    type: "line",
    data: { labels: monthLabels(series.labels), datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      plugins: commonPlugins(true),
      scales: commonScales("Rand (R)"),
    },
  });
}

export function renderPipelineChart(canvasId, series) {
  renderChart(canvasId, {
    type: "line",
    data: {
      labels: monthLabels(series.labels),
      datasets: [
        baseLineDataset("Pipeline Actual", series.pipelineActual, SERIES_COLOR.pipelineActual),
        baseLineDataset("Pipeline Target (Target x 3 x 6)", series.pipelineTarget, SERIES_COLOR.target, true),
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      plugins: commonPlugins(true),
      scales: commonScales("Rand (R)"),
    },
  });
}

// Generic accessible table fallback for a rendered chart.
export function buildDataTable(container, labels, datasets, formatFn) {
  const table = document.createElement("table");
  table.className = "data-table";
  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");
  headRow.innerHTML = "<th>Month</th>" + datasets.map((d) => `<th>${d.label}</th>`).join("");
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  labels.forEach((label, i) => {
    const row = document.createElement("tr");
    const cells = datasets.map((d) => `<td>${formatFn(d.data[i])}</td>`).join("");
    row.innerHTML = `<td>${label}</td>${cells}`;
    tbody.appendChild(row);
  });
  table.appendChild(tbody);

  container.innerHTML = "";
  container.appendChild(table);
}
