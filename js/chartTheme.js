// Chart palette: validated categorical set (dark-surface steps), assigned to
// each tracked category by fixed order and never re-cycled. Brand colours
// (Pantone 262C / Fuchsia / Highlight) are used for UI chrome instead, since
// the brand's supporting hues sit too close together (all red/pink) to carry
// six distinct, colour-blind-safe data series.
export const SURFACE = "#1a1a19";
export const INK_PRIMARY = "#ffffff";
export const INK_SECONDARY = "#c3c2b7";
export const MUTED = "#898781";
export const GRIDLINE = "#2c2c2a";
export const BASELINE = "#383835";

export const STATUS = {
  good: "#0ca30c",
  warning: "#fab219",
  serious: "#ec835a",
  critical: "#e66767",
};

// Fixed entity -> colour mapping, using the full validated 8-slot categorical
// order in sequence (blue, orange, aqua, yellow, magenta, green, violet, red)
// so every adjacent pair stays inside the validated adjacency list. Gross is
// derived (Sales New + Up/Down) but keeps its own colour identity - it never
// appears in the same chart as the raw Sales New / Up/Down inputs.
export const SERIES_COLOR = {
  gross: "#3987e5", // slot 1 blue - derived Sales New + Up/Down
  nett: "#d95926", // slot 2 orange
  salesNew: "#199e70", // slot 3 aqua
  upDown: "#c98500", // slot 4 yellow
  cancellation: "#d55181", // slot 5 magenta
  cancelNotInstall: "#008300", // slot 6 green
  onceOff: "#9085e9", // slot 7 violet
  onceOffCancelNotInstall: "#e66767", // slot 8 red
  pipelineActual: "#3987e5",
  target: MUTED,
};

export const CATEGORY_LABELS = {
  salesNew: "Sales (New)",
  upDown: "Up/Down",
  nett: "Nett",
  cancellation: "Cancellation",
  cancelNotInstall: "Cancel Not Install",
  onceOff: "Once Off",
  onceOffCancelNotInstall: "Once Off Cancel Not Install",
};

export function achievementStatus(pct) {
  if (pct === null || pct === undefined || !isFinite(pct)) {
    return { label: "No data yet", color: MUTED, icon: "—" };
  }
  if (pct >= 100) return { label: "On track", color: STATUS.good, icon: "▲" };
  if (pct >= 85) return { label: "Slightly behind", color: STATUS.warning, icon: "●" };
  return { label: "Behind target", color: STATUS.critical, icon: "▼" };
}

export function formatRand(value) {
  if (value === null || value === undefined || !isFinite(value)) return "—";
  return "R " + Math.round(value).toLocaleString("en-ZA");
}

export function formatPct(value) {
  if (value === null || value === undefined || !isFinite(value)) return "—";
  return value.toFixed(1) + "%";
}

Chart.defaults.font.family =
  "'Encode Sans Semi Expanded', system-ui, -apple-system, 'Segoe UI', sans-serif";
Chart.defaults.color = MUTED;
Chart.defaults.borderColor = GRIDLINE;

export function baseLineDataset(label, data, color, dashed = false) {
  return {
    label,
    data,
    borderColor: color,
    backgroundColor: color,
    borderWidth: 2,
    borderDash: dashed ? [6, 4] : undefined,
    pointRadius: dashed ? 0 : 3,
    pointHoverRadius: dashed ? 0 : 5,
    pointBackgroundColor: color,
    tension: 0.25,
    spanGaps: true,
  };
}

export function baseBarDataset(label, data, color) {
  return {
    label,
    data,
    backgroundColor: color,
    borderRadius: 4,
    maxBarThickness: 42,
  };
}

export function commonScales(yLabel) {
  return {
    x: {
      grid: { color: GRIDLINE, display: false },
      ticks: { color: MUTED },
    },
    y: {
      grid: { color: GRIDLINE },
      ticks: { color: MUTED },
      title: { display: !!yLabel, text: yLabel, color: MUTED },
      beginAtZero: true,
    },
  };
}

export function commonPlugins(showLegend) {
  return {
    legend: {
      display: showLegend,
      position: "top",
      align: "start",
      labels: { color: INK_SECONDARY, usePointStyle: true, boxWidth: 8, padding: 16 },
    },
    tooltip: {
      backgroundColor: "#0d0d0c",
      titleColor: INK_PRIMARY,
      bodyColor: INK_SECONDARY,
      borderColor: GRIDLINE,
      borderWidth: 1,
      padding: 10,
      usePointStyle: true,
    },
  };
}
