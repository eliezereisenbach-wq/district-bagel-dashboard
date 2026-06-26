# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A single-file financial dashboard for **District Bagel Park Ave (Montreal)** — a bagel shop. The entire app is `index.html` (vanilla HTML/CSS/JS + Chart.js from CDN). No build step, no dependencies to install, no tests.

To preview: open `index.html` in a browser.

## Updating data

All data lives as inline JavaScript constants inside `index.html`. The dashboard has three tabs: Overview, Sales & Channels, P&L.

### Marker-delimited blocks (safe to script-edit)

These sections are bounded by comment markers so scripts can find and replace them:

| Marker | What it holds |
|---|---|
| `/*LABOR_WEEKS_START*/` … `/*LABOR_WEEKS_END*/` | `const laborWeeks` — weekly Connecteam hours |
| `/*SNAPPY_DAILY_START*/` … `/*SNAPPY_DAILY_END*/` | `const SNAPPY_DAILY` + `SNAPPY_UPDATED` — daily Snappy POS sales |
| `/*JUNE_MTD_START*/` … `/*JUNE_MTD_END*/` | June MTD total sales figure |
| `/*JUNE_BYM_CL_START*/` … `/*JUNE_BYM_CL_END*/` | June Clover channel figure |

### Script: update labor hours

```
node update-labor.js "<week label>" <HH:MM> <employees>
# e.g.
node update-labor.js "Jun 21–27" 226:19 9
```

Parses `index.html`, upserts the week entry inside the `LABOR_WEEKS` block, writes the file back. After running: `git add index.html && git commit -m "Labor hours <week>" && git push`.

### Manual edits (P&L and sales)

- **Monthly P&L**: edit the `mData` array — one object per month with `sales`, `cogs`, `labor`, `admin`, `overhead`, `net`, and the `%` fields.
- **Weekly sales by channel**: edit the `weeks` array — one object per week with `cl` (Clover), `cng` (Curbngo), `ub` (Uber Eats), optional `sn` (Snappy), and `total`.
- **Monthly channel split**: edit the `byM` object keyed by month name.

## Architecture

Everything renders on `DOMContentLoaded` (no framework, no async). The flow is:

1. Constants are declared (`mData`, `weeks`, `byM`, `laborWeeks`, `SNAPPY_DAILY`).
2. Aggregates are computed immediately (YTD totals, best month, channel splits, labor efficiency join).
3. DOM elements are written directly via `getElementById`.
4. Chart.js instances are created inline (no abstraction layer).

The labor efficiency section joins `weeks` and `laborWeeks` by normalising week labels with `wkKey()` (strips em-dashes and spaces). If a week exists in `weeks` but not `laborWeeks` (or is marked `partial:true`), it is excluded from the efficiency chart and table.

Tab switching is a pure CSS `display:none` / `display:block` toggle via `showTab()`.

## Key conventions

- Week labels use en-dash (`–`) separators. `wkKey()` normalises both en-dash and hyphen, so either works in `laborWeeks`.
- Passover week (`Apr 5–11`) is flagged `passover:true` in `weeks` and excluded from the average week calculation.
- June is always the last entry in `mData` and `byM`; its figures are MTD (in-progress) and its `cogs`/`labor`/`net` fields are `null`.
- The gauge and P&L summary only operate over `histFull` — months where `net != null` (closed months).
