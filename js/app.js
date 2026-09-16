import {
  loadRecords,
  listAvailableFYs,
  seriesForFY,
  seriesAllTime,
  kpiSnapshot,
  getMonthRecord,
  setMonthRecord,
  exportRecordsBlob,
  importRecords,
  computeGross,
  computeNett,
  CATEGORY_KEYS,
} from "./data.js";
import { monthKeysForFY, currentFYLabel, currentMonthKey, monthKeyLabel } from "./financialYear.js";
import { CATEGORY_LABELS, formatRand, formatPct, achievementStatus } from "./chartTheme.js";
import {
  renderMTDChart,
  renderYTDChart,
  renderBreakdownChart,
  renderPipelineChart,
  renderKpiBarChart,
  buildDataTable,
} from "./charts.js";

const ALL_TIME = "All Time";
let currentView = currentFYLabel();

const els = {
  fyTabs: document.getElementById("fy-tabs"),
  kpiRow: document.getElementById("kpi-row"),
  dataSourceNote: document.getElementById("data-source-note"),
  manageDataBtn: document.getElementById("manage-data-btn"),
  dataPanel: document.getElementById("data-panel"),
  entryTableWrap: document.getElementById("entry-table-wrap"),
  saveStatus: document.getElementById("save-status"),
  exportBtn: document.getElementById("export-btn"),
  importInput: document.getElementById("import-input"),
};

async function init() {
  const { loadedFrom } = await loadRecords();
  const noteText = {
    file: "Data loaded from data/records.json.",
    cache: "Data loaded from this browser's saved cache (not yet exported to data/records.json).",
    scaffold:
      "No data file found (this can happen when opening index.html directly instead of via GitHub Pages/a local server). Starting from a blank scaffold.",
  }[loadedFrom];
  els.dataSourceNote.textContent = noteText;

  renderFYTabs();
  renderView(currentView);
  wireDataPanel();
}

function renderFYTabs() {
  const fys = listAvailableFYs();
  const tabs = [...fys, ALL_TIME];
  els.fyTabs.innerHTML = "";
  for (const label of tabs) {
    const btn = document.createElement("button");
    btn.textContent = label;
    btn.className = label === currentView ? "active" : "";
    btn.addEventListener("click", () => {
      currentView = label;
      renderFYTabs();
      renderView(currentView);
      renderDataEntryTable();
    });
    els.fyTabs.appendChild(btn);
  }
}

function seriesForView(view) {
  return view === ALL_TIME ? seriesAllTime() : seriesForFY(view);
}

function renderView(view) {
  const series = seriesForView(view);
  renderMTDChart("mtd-chart", series);
  renderYTDChart("ytd-chart", series);
  renderBreakdownChart("breakdown-chart", series);
  renderPipelineChart("pipeline-chart", series);

  // Master summary always reflects "right now", independent of which FY/All
  // Time tab the trend charts below are showing.
  const kpiFY = currentFYLabel();
  const kpi = kpiSnapshot(kpiFY, pickKpiMonth(kpiFY));
  renderKpiTiles(kpi);
  renderKpiBarChart("kpi-bar-chart", kpi);

  wireTableToggle("mtd", series, [
    { label: "Gross", data: series.gross },
    { label: "Nett", data: series.nett },
    { label: "Target", data: series.target },
  ]);
  wireTableToggle("ytd", series, [
    { label: "Gross YTD", data: series.ytdGross },
    { label: "Nett YTD", data: series.ytdNett },
    { label: "Target YTD", data: series.ytdTarget },
  ]);
  wireTableToggle(
    "breakdown",
    series,
    CATEGORY_KEYS.map((k) => ({ label: CATEGORY_LABELS[k], data: series.actuals[k] }))
  );
  wireTableToggle("pipeline", series, [
    { label: "Pipeline Actual", data: series.pipelineActual },
    { label: "Pipeline Target", data: series.pipelineTarget },
  ]);
}

function pickKpiMonth(fyLabelStr) {
  const keys = monthKeysForFY(fyLabelStr);
  const nowKey = currentMonthKey();
  return keys.includes(nowKey) ? nowKey : keys[keys.length - 1];
}

function renderKpiTiles(kpi) {
  const tiles = [
    { label: "MTD Gross", value: kpi.mtd.gross, target: kpi.mtd.target, pct: kpi.mtd.grossPct },
    { label: "MTD Nett", value: kpi.mtd.nett, target: kpi.mtd.target, pct: kpi.mtd.nettPct },
    { label: "YTD Gross", value: kpi.ytd.gross, target: kpi.ytd.target, pct: kpi.ytd.grossPct },
    { label: "YTD Nett", value: kpi.ytd.nett, target: kpi.ytd.target, pct: kpi.ytd.nettPct },
  ];
  els.kpiRow.innerHTML = "";
  for (const t of tiles) {
    const status = achievementStatus(t.pct);
    const tile = document.createElement("div");
    tile.className = "stat-tile";
    tile.innerHTML = `
      <div class="tile-label">${t.label}</div>
      <div class="tile-value">${formatRand(t.value)}</div>
      <div class="tile-target">Target: ${formatRand(t.target)}</div>
      <span class="pill" style="color:${status.color}">${status.icon} ${formatPct(t.pct)} · ${status.label}</span>
    `;
    els.kpiRow.appendChild(tile);
  }
}

function wireTableToggle(prefix, series, datasets) {
  const toggleBtn = document.getElementById(`${prefix}-view-toggle`);
  const chartBox = document.getElementById(`${prefix}-chart-box`);
  const tableBox = document.getElementById(`${prefix}-table-box`);
  if (!toggleBtn) return;
  toggleBtn.onclick = () => {
    const showingTable = tableBox.style.display !== "none";
    if (showingTable) {
      tableBox.style.display = "none";
      chartBox.style.display = "";
      toggleBtn.textContent = "View as table";
    } else {
      buildDataTable(tableBox, series.labels.map(monthKeyLabel), datasets, formatRand);
      tableBox.style.display = "block";
      chartBox.style.display = "none";
      toggleBtn.textContent = "View as chart";
    }
  };
}

function wireDataPanel() {
  els.manageDataBtn.addEventListener("click", () => {
    els.dataPanel.classList.toggle("open");
    if (els.dataPanel.classList.contains("open")) renderDataEntryTable();
  });

  els.exportBtn.addEventListener("click", () => {
    const blob = exportRecordsBlob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "records.json";
    a.click();
    URL.revokeObjectURL(url);
  });

  els.importInput.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const text = await file.text();
    try {
      importRecords(JSON.parse(text));
      renderFYTabs();
      renderView(currentView);
      renderDataEntryTable();
      flashSaveStatus("Imported.");
    } catch (err) {
      alert("Could not read that file as valid JSON.");
    }
  });
}

function flashSaveStatus(msg) {
  els.saveStatus.textContent = msg;
  setTimeout(() => (els.saveStatus.textContent = ""), 4000);
}

// Raw categories rendered before the computed Gross column, and after it
// (Nett is computed too, and always rendered last).
const CATEGORIES_BEFORE_GROSS = ["salesNew", "onceOff", "upDown"];
const CATEGORIES_AFTER_GROSS = CATEGORY_KEYS.filter((k) => !CATEGORIES_BEFORE_GROSS.includes(k));

function renderDataEntryTable() {
  const fy = currentView === ALL_TIME ? currentFYLabel() : currentView;
  const keys = monthKeysForFY(fy);

  const table = document.createElement("table");
  table.className = "entry-table";
  const headCols = [
    "Month",
    "Target",
    "Pipeline Actual",
    ...CATEGORIES_BEFORE_GROSS.map((k) => CATEGORY_LABELS[k]),
    "Gross",
    ...CATEGORIES_AFTER_GROSS.map((k) => CATEGORY_LABELS[k]),
    "Nett",
  ];
  const thead = document.createElement("thead");
  thead.innerHTML = `<tr>${headCols.map((c) => `<th>${c}</th>`).join("")}</tr>`;
  table.appendChild(thead);

  const inputCell = (key, field, value) =>
    `<td><input type="number" step="0.01" data-key="${key}" data-field="${field}" value="${value ?? ""}" /></td>`;

  const tbody = document.createElement("tbody");
  for (const key of keys) {
    const rec = getMonthRecord(key);
    const gross = computeGross(rec.actuals.salesNew, rec.actuals.upDown, rec.actuals.onceOff);
    const nett = computeNett(gross, rec.actuals.cancellation, rec.actuals.cancelNotInstall, rec.actuals.onceOffCancelNotInstall);
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${monthKeyLabel(key)}</td>
      ${inputCell(key, "target", rec.target)}
      ${inputCell(key, "pipelineActual", rec.pipelineActual)}
      ${CATEGORIES_BEFORE_GROSS.map((cat) => inputCell(key, `actuals.${cat}`, rec.actuals[cat])).join("")}
      <td class="computed" data-gross-cell="${key}">${formatRand(gross)}</td>
      ${CATEGORIES_AFTER_GROSS.map((cat) => inputCell(key, `actuals.${cat}`, rec.actuals[cat])).join("")}
      <td class="computed" data-nett-cell="${key}">${formatRand(nett)}</td>
    `;
    tbody.appendChild(row);
  }
  table.appendChild(tbody);

  els.entryTableWrap.innerHTML = "";
  els.entryTableWrap.appendChild(table);

  // Live-update the computed Gross/Nett cells as any contributing field is
  // typed, ahead of the change/save handler below (which fires on blur).
  const readField = (row, field) => {
    const el = row.querySelector(`input[data-field="actuals.${field}"]`);
    return el.value === "" ? null : parseFloat(el.value);
  };
  table.addEventListener("input", (e) => {
    const input = e.target;
    if (input.tagName !== "INPUT" || !input.dataset.field.startsWith("actuals.")) return;
    const row = input.closest("tr");
    const g = computeGross(readField(row, "salesNew"), readField(row, "upDown"), readField(row, "onceOff"));
    const n = computeNett(g, readField(row, "cancellation"), readField(row, "cancelNotInstall"), readField(row, "onceOffCancelNotInstall"));
    const grossCell = row.querySelector("[data-gross-cell]");
    const nettCell = row.querySelector("[data-nett-cell]");
    if (grossCell) grossCell.textContent = formatRand(g);
    if (nettCell) nettCell.textContent = formatRand(n);
  });

  table.addEventListener("change", (e) => {
    const input = e.target;
    if (input.tagName !== "INPUT") return;
    const key = input.dataset.key;
    const field = input.dataset.field;
    const value = input.value === "" ? null : parseFloat(input.value);
    const rec = getMonthRecord(key);
    if (field.startsWith("actuals.")) {
      const cat = field.split(".")[1];
      rec.actuals[cat] = value;
    } else {
      rec[field] = value;
    }
    setMonthRecord(key, rec);
    renderFYTabs();
    renderView(currentView);
    flashSaveStatus("Saved to browser cache. Click “Export records.json” and commit it to GitHub to keep it permanently.");
  });
}

init();
