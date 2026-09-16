# Sales Performance Tracker

A static, no-build dashboard for tracking Nymbis sales performance month-on-month
and year-on-year. Runs entirely in the browser from GitHub Pages — no server,
no database, no build step.

**Live app:** enable GitHub Pages for this repo (Settings -> Pages -> Deploy from
branch `main`, folder `/`), then open `https://batty0810.github.io/sales-performance/`.

## Financial year

The financial year runs **1 September - 31 August**. FY "2025/26" therefore
spans September 2025 through August 2026. Employment started 1 January 2026,
so FY2025/26 naturally has no data before January — those months are simply
left blank rather than counted as zero.

## Tracked categories

Six raw categories per month, entered as Rand values, in this order in
Manage Data:

- Sales (New)
- Once Off
- Up/Down
- Cancellation
- Cancel Not Install
- Once Off Cancel Not Install

Plus, per month: a **Monthly Target** and a **Pipeline Actual** value.

**Gross** and **Nett** are not entered directly - both are computed and shown
as read-only columns in Manage Data (Gross right after Up/Down, Nett at the
end), and used everywhere they appear elsewhere (MTD/YTD charts, the master
KPI summary).

## Calculations

- **Gross** = Sales (New) + Up/Down + (Once Off / 12) - the once-off value is
  amortised over 12 months before being added in.
- **Nett** = Gross - (Cancellation + Cancel Not Install) - (Once Off Cancel
  Not Install / 12).
- **YTD Target** = running sum of Monthly Target from the start of the
  financial year (or since the first recorded month, for the All Time view).
- **MTD %** = that month's actual / that month's target.
- **YTD %** = cumulative actual / cumulative target, within the FY (or across
  all time).
- **Pipeline Target** = Monthly Target x 3 x 6 (an 18x coverage target).
- **All Time** view is a single continuous cumulative series across every
  recorded month, with no reset at financial year boundaries.

## Updating your data

There is no backend — your data lives in [`data/records.json`](data/records.json),
committed to this repo:

1. Open the site and click **Manage Data**.
2. Select a financial year tab, edit the month(s) you need. Edits save
   instantly to that browser's local cache (so refreshing won't lose them),
   and the message "Saved to browser cache..." confirms it.
3. Click **Export records.json** to download the updated file.
4. Replace [`data/records.json`](data/records.json) with the downloaded file
   and commit + push (or ask Claude Code to do it for you in this repo).

Opening `index.html` directly by double-clicking it (`file://`) will show a
banner saying no data file was found — browsers block `fetch()` of local
files for security. Use GitHub Pages, or serve the folder locally
(e.g. `python -m http.server`) to load `data/records.json` properly.

## Branding

Colours and typography follow the Nymbis brand guide (Pantone 262C `#420A38`,
Fuchsia `#9D0081`, Highlight `#FF1A40`, Encode Sans Semi Expanded). Chart
series colours use a separate, colour-blind-validated categorical palette
(see `js/chartTheme.js`) rather than the brand's supporting colours, since
those are all close-hued pinks/reds and aren't distinguishable enough for six
data series — brand colours are used for the UI chrome (header, buttons,
backgrounds) instead.

## Project structure

```
index.html          Page shell
css/styles.css       Brand theme + layout
js/financialYear.js  FY math (labels, month ordering)
js/data.js           Load/save records, MTD/YTD/All-Time calculations
js/chartTheme.js     Palette, formatting, Chart.js defaults
js/charts.js         Chart.js chart builders + table-view fallback
js/app.js            Wires it all together
data/records.json    Your data
```
