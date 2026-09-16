import {
  fyLabel,
  fyLabelForKey,
  monthKeysForFY,
  currentFYLabel,
  nextFYLabel,
  currentMonthKey,
} from "./financialYear.js";

const STORAGE_KEY = "nymbisPerfTracker.records.v1";
const DATA_URL = "./data/records.json";

// Raw input categories, in entry-table column order. Gross and Nett are NOT
// among these - both are computed wherever they're needed (see computeGross /
// computeNett / buildSeries).
export const CATEGORY_KEYS = [
  "salesNew",
  "onceOff",
  "upDown",
  "cancellation",
  "cancelNotInstall",
  "onceOffCancelNotInstall",
];

export const PIPELINE_MULTIPLIER = 18; // Target = Monthly Target (CTC) x 3 x 6

function blankMonth() {
  return {
    target: null,
    pipelineActual: null,
    actuals: {
      salesNew: null,
      onceOff: null,
      upDown: null,
      cancellation: null,
      cancelNotInstall: null,
      onceOffCancelNotInstall: null,
    },
  };
}

// Gross = Sales (New) + Up/Down + (Once Off / 12). Null only when all three
// inputs are blank.
export function computeGross(salesNew, upDown, onceOff) {
  const allBlank = [salesNew, upDown, onceOff].every((v) => v === null || v === undefined);
  if (allBlank) return null;
  return (salesNew || 0) + (upDown || 0) + (onceOff || 0) / 12;
}

// Nett = Gross - (Cancellation + Cancel Not Install) - (Once Off Cancel Not
// Install / 12). Null whenever Gross itself is null.
export function computeNett(gross, cancellation, cancelNotInstall, onceOffCancelNotInstall) {
  if (gross === null || gross === undefined) return null;
  return gross - ((cancellation || 0) + (cancelNotInstall || 0)) - (onceOffCancelNotInstall || 0) / 12;
}

function isBlankMonth(rec) {
  if (!rec) return true;
  if (rec.target !== null && rec.target !== undefined) return false;
  if (rec.pipelineActual !== null && rec.pipelineActual !== undefined) return false;
  return CATEGORY_KEYS.every((k) => rec.actuals[k] === null || rec.actuals[k] === undefined);
}

let state = { meta: {}, months: {} };
let loadedFrom = "scaffold";

export async function loadRecords() {
  let fetched = null;
  try {
    const res = await fetch(DATA_URL, { cache: "no-store" });
    if (res.ok) {
      fetched = await res.json();
      loadedFrom = "file";
    }
  } catch (e) {
    // fetch() is blocked under file://; fall through to localStorage/scaffold.
  }

  let cached = null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) cached = JSON.parse(raw);
  } catch (e) {
    cached = null;
  }

  const base = fetched || { meta: {}, months: {} };
  // localStorage holds the most recent unsaved edits, so it wins per-month.
  if (cached) {
    state = { meta: { ...base.meta, ...cached.meta }, months: { ...base.months, ...cached.months } };
    if (!fetched) loadedFrom = "cache";
  } else {
    state = base;
  }
  if (!fetched && !cached) loadedFrom = "scaffold";

  ensureScaffoldMonths();
  return { state, loadedFrom };
}

function ensureScaffoldMonths() {
  const fys = [currentFYLabel(), nextFYLabel(currentFYLabel())];
  for (const fy of fys) {
    for (const key of monthKeysForFY(fy)) {
      if (!state.months[key]) state.months[key] = blankMonth();
    }
  }
}

export function getLoadedFrom() {
  return loadedFrom;
}

export function getMonthRecord(monthKey) {
  return state.months[monthKey] || blankMonth();
}

export function setMonthRecord(monthKey, record) {
  state.months[monthKey] = record;
  persistLocal();
}

function persistLocal() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function listAvailableFYs() {
  const set = new Set();
  for (const key of Object.keys(state.months)) {
    if (!isBlankMonth(state.months[key])) set.add(fyLabelForKey(key));
  }
  set.add(currentFYLabel());
  set.add(nextFYLabel(currentFYLabel()));
  // Always offer the FY employment started in, even before any data is entered.
  if (state.meta && state.meta.employmentStart) {
    const [y, m] = state.meta.employmentStart.split("-").map(Number);
    set.add(fyLabel(y, m));
  }
  return Array.from(set).sort();
}

export function allMonthKeysSorted() {
  return Object.keys(state.months).sort();
}

function pctOf(actual, target) {
  if (target === null || target === undefined || target === 0) return null;
  if (actual === null || actual === undefined) return null;
  return (actual / target) * 100;
}

// Series for an FY across its 12 months in FY order, for trend charts.
export function seriesForFY(fyLabelStr) {
  const keys = monthKeysForFY(fyLabelStr);
  const rows = keys.map((k) => ({ key: k, rec: state.months[k] || null }));
  return buildSeries(rows);
}

// Series across ALL recorded months in calendar order (no FY reset).
export function seriesAllTime() {
  const keys = allMonthKeysSorted();
  const rows = keys.map((k) => ({ key: k, rec: state.months[k] || null }));
  return buildSeries(rows);
}

// Cumulative helper: once a value has been seen, the running total is shown
// even if a later month is still blank (unentered), rather than reverting to null.
function cumulative(values) {
  let seen = false;
  let running = 0;
  return values.map((v) => {
    if (v !== null) {
      seen = true;
      running += v;
    }
    return seen ? running : null;
  });
}

function buildSeries(rows) {
  const labels = rows.map((r) => r.key);
  const target = [];
  const pipelineActual = [];
  const pipelineTarget = [];
  const gross = [];
  const nett = [];
  const actuals = Object.fromEntries(CATEGORY_KEYS.map((k) => [k, []]));

  for (const { rec } of rows) {
    const hasRec = rec && !isBlankMonth(rec);
    const t = hasRec && rec.target !== null && rec.target !== undefined ? rec.target : null;
    target.push(t);
    pipelineActual.push(hasRec && rec.pipelineActual !== null && rec.pipelineActual !== undefined ? rec.pipelineActual : null);
    pipelineTarget.push(t !== null ? t * PIPELINE_MULTIPLIER : null);

    for (const key of CATEGORY_KEYS) {
      const v = hasRec && rec.actuals[key] !== null && rec.actuals[key] !== undefined ? rec.actuals[key] : null;
      actuals[key].push(v);
    }
    const g = hasRec ? computeGross(rec.actuals.salesNew, rec.actuals.upDown, rec.actuals.onceOff) : null;
    gross.push(g);
    nett.push(
      hasRec ? computeNett(g, rec.actuals.cancellation, rec.actuals.cancelNotInstall, rec.actuals.onceOffCancelNotInstall) : null
    );
  }

  const ytdTarget = cumulative(target);
  const ytdGross = cumulative(gross);
  const ytdNett = cumulative(nett);
  const ytdActuals = Object.fromEntries(CATEGORY_KEYS.map((k) => [k, cumulative(actuals[k])]));

  return { labels, target, pipelineActual, pipelineTarget, gross, nett, actuals, ytdTarget, ytdGross, ytdNett, ytdActuals };
}

// Walks backward from index i to find the most recent non-null value.
// Pipeline is a point-in-time snapshot, not a monthly flow - if this month
// hasn't been updated yet, the last known value is more useful than blank.
function lastNonNull(arr, uptoIndex) {
  for (let idx = uptoIndex; idx >= 0; idx--) {
    if (arr[idx] !== null && arr[idx] !== undefined) return arr[idx];
  }
  return null;
}

// Snapshot for the KPI/master panel: MTD (a single month) and YTD (cumulative
// through that month), computed from whichever series the caller passes in -
// an FY-scoped series (resets each financial year) or the All Time series
// (never resets), so the master summary matches whichever tab is selected.
export function kpiSnapshot(series, monthKey) {
  const idx = series.labels.indexOf(monthKey);
  const i = idx === -1 ? series.labels.length - 1 : idx;

  const mtdTarget = series.target[i];
  const mtdGross = series.gross[i];
  const mtdNett = series.nett[i];
  const ytdTarget = series.ytdTarget[i];
  const ytdGross = series.ytdGross[i];
  const ytdNett = series.ytdNett[i];
  const pipelineActual = lastNonNull(series.pipelineActual, i);
  const pipelineTarget = lastNonNull(series.pipelineTarget, i);

  return {
    monthKey: series.labels[i],
    mtd: {
      target: mtdTarget,
      gross: mtdGross,
      nett: mtdNett,
      grossPct: pctOf(mtdGross, mtdTarget),
      nettPct: pctOf(mtdNett, mtdTarget),
    },
    ytd: {
      target: ytdTarget,
      gross: ytdGross,
      nett: ytdNett,
      grossPct: pctOf(ytdGross, ytdTarget),
      nettPct: pctOf(ytdNett, ytdTarget),
    },
    pipeline: {
      actual: pipelineActual,
      target: pipelineTarget,
      pct: pctOf(pipelineActual, pipelineTarget),
    },
  };
}

export function exportRecordsBlob() {
  const ordered = { meta: state.meta, months: {} };
  for (const key of allMonthKeysSorted()) {
    ordered.months[key] = state.months[key];
  }
  return new Blob([JSON.stringify(ordered, null, 2)], { type: "application/json" });
}

export function importRecords(json) {
  state = { meta: json.meta || state.meta, months: json.months || {} };
  ensureScaffoldMonths();
  persistLocal();
}

export { blankMonth, currentMonthKey };
