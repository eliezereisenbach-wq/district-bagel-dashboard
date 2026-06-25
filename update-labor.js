#!/usr/bin/env node
/*
 * update-labor.js — add a week of Connecteam labor hours to the dashboard.
 *
 * Usage:
 *   node update-labor.js "<week label>" <HH:MM> <employees>
 * Example (week of Jun 21–27, 226:19 total, 9 staff):
 *   node update-labor.js "Jun 21–27" 226:19 9
 *
 * It inserts/updates the entry inside the LABOR_WEEKS marker block and
 * keeps the array sorted oldest to newest. Then commit + push to publish.
 */
const fs = require('fs');
const path = require('path');

const DASH = path.join(__dirname, 'index.html');
const [, , weekLabel, hhmm, empStr] = process.argv;

if (!weekLabel || !hhmm || !empStr) {
  console.error('Usage: node update-labor.js "<week label>" <HH:MM> <employees>');
  console.error('Example: node update-labor.js "Jun 21–27" 226:19 9');
  process.exit(1);
}

// Convert HH:MM → decimal hours
const [h, m] = hhmm.split(':').map(Number);
const hours = Math.round((h + (m || 0) / 60) * 100) / 100;
const employees = parseInt(empStr, 10);

let html = fs.readFileSync(DASH, 'utf8');
const block = /\/\*LABOR_WEEKS_START\*\/[\s\S]*?\/\*LABOR_WEEKS_END\*\//;
const match = html.match(block);
if (!match) { console.error('LABOR_WEEKS markers not found in index.html'); process.exit(1); }

// Parse existing entries
const arrMatch = match[0].match(/const laborWeeks = \[([\s\S]*?)\];/);
const entries = [];
if (arrMatch) {
  const re = /\{week:"([^"]+)",\s*hours:([\d.]+),\s*employees:(\d+)\}/g;
  let mm;
  while ((mm = re.exec(arrMatch[1])) !== null) {
    entries.push({ week: mm[1], hours: parseFloat(mm[2]), employees: parseInt(mm[3], 10) });
  }
}

// Upsert this week
const existing = entries.find(e => e.week === weekLabel);
if (existing) { existing.hours = hours; existing.employees = employees; }
else { entries.push({ week: weekLabel, hours, employees }); }

const lines = entries.map(e => `  {week:"${e.week}", hours:${e.hours}, employees:${e.employees}},`).join('\n');
const rebuilt = `/*LABOR_WEEKS_START*/\nconst laborWeeks = [\n${lines}\n];\n/*LABOR_WEEKS_END*/`;
html = html.replace(block, rebuilt);
fs.writeFileSync(DASH, html);

console.log(`✓ Labor week "${weekLabel}" set to ${hhmm} (${hours}h) across ${employees} employees.`);
console.log(`  Total weeks tracked: ${entries.length}`);
console.log('  Now run:  git add index.html && git commit -m "Labor hours ' + weekLabel + '" && git push');
