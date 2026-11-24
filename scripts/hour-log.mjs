// Regenerates hour-log.md from hour-log.json, so the log is easy to read on GitHub.
// hour-log.json is the source of truth: add a row there, then run
//   node scripts/hour-log.mjs
// Each row: { "date": "11/24", "who": "Jack", "what": "...", "hours": 1.5 }
// Use "hours": null (or "") for work whose time isn't filled in yet.
// Keep one fully blank row at the bottom of the JSON as a template to copy-paste; rows
// where every field is empty are skipped when writing the markdown.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const jsonPath = fileURLToPath(new URL("../hour-log.json", import.meta.url));
const mdPath = fileURLToPath(new URL("../hour-log.md", import.meta.url));

const rows = JSON.parse(readFileSync(jsonPath, "utf8"));
if (!Array.isArray(rows)) throw new Error("hour-log.json must be an array of rows.");

// Empty strings are allowed in every field; "hours" may also be null.
rows.forEach((r, i) => {
  for (const key of ["date", "who", "what"]) {
    if (typeof r[key] !== "string") throw new Error(`Row ${i + 1}: "${key}" must be a string (can be "").`);
  }
  if (r.hours !== null && r.hours !== "" && (typeof r.hours !== "number" || r.hours < 0)) {
    throw new Error(`Row ${i + 1}: "hours" must be a non-negative number, null, or "".`);
  }
});

const hoursOf = (r) => (typeof r.hours === "number" ? r.hours : 0);
const isBlank = (r) => !r.date && !r.who && !r.what && hoursOf(r) === 0;
const entries = rows.filter((r) => !isBlank(r));

// A "|" inside a cell would break the markdown table.
const cell = (v) => String(v).replaceAll("|", "\\|");

const header = ["Date", "Who", "What", "Hours"];
const body = entries.map((r) => [r.date, r.who, r.what, typeof r.hours === "number" ? String(r.hours) : ""].map(cell));

// Pad every column to its widest cell so the raw markdown stays aligned too.
const widths = header.map((h, c) => Math.max(h.length, 3, ...body.map((row) => row[c].length)));
const line = (cols) => `| ${cols.map((v, c) => v.padEnd(widths[c])).join(" | ")} |`;

// Totals per person (in order of first appearance) and overall. Rounded to avoid 0.1 + 0.2 noise.
const round = (n) => Math.round(n * 100) / 100;
const fmt = (n) => `${round(n)} ${round(n) === 1 ? "hour" : "hours"}`;
const perPerson = new Map();
for (const r of entries) {
  const name = r.who || "(no name)";
  perPerson.set(name, (perPerson.get(name) ?? 0) + hoursOf(r));
}
const total = entries.reduce((sum, r) => sum + hoursOf(r), 0);

const md = [
  "<!-- Generated from hour-log.json by scripts/hour-log.mjs. Edit the JSON, not this file. -->",
  "",
  line(header),
  `| ${widths.map((w) => "-".repeat(w)).join(" | ")} |`,
  ...body.map(line),
  "",
  "**Totals**",
  "",
  ...[...perPerson].map(([name, h]) => `- ${name}: ${fmt(h)}`),
  `- **Everyone: ${fmt(total)}**`,
  "",
].join("\n");

writeFileSync(mdPath, md);
console.log(`Wrote hour-log.md (${entries.length} rows, ${fmt(total)}).`);
