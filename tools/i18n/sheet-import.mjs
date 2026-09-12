// tools/i18n/sheet-import.mjs — 검수 시트(CSV) → i18n/handbook.en.js / i18n/ui.en.js 반영
// 사용: node tools/i18n/sheet-import.mjs <in.csv>        (절차 사전)
//       node tools/i18n/sheet-import.mjs <in.csv> --ui   (UI 사전: en 만 갱신)
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { loadGlobal, serializeDict, ROOT } from "./lib.mjs";
const require = createRequire(import.meta.url);
const { hbHash } = require("../../i18n/i18n.js");

const q = s => { s = String(s ?? ""); return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
export function toCsv(rows, cols) {
  return "﻿" + [cols.join(","), ...rows.map(r => cols.map(c => q(r[c])).join(","))].join("\r\n") + "\r\n";
}
export function fromCsv(text) {
  text = text.replace(/^﻿/, "");
  const out = [], row = [], push = () => { row.push(cell); cell = ""; };
  let cell = "", inQ = false, i = 0;
  const rows = [];
  while (i < text.length) {
    const ch = text[i];
    if (inQ) { if (ch === '"') { if (text[i + 1] === '"') { cell += '"'; i += 2; continue; } inQ = false; i++; continue; } cell += ch; i++; continue; }
    if (ch === '"') { inQ = true; i++; continue; }
    if (ch === ",") { push(); i++; continue; }
    if (ch === "\r" || ch === "\n") { push(); rows.push(row.splice(0)); if (ch === "\r" && text[i + 1] === "\n") i++; i++; continue; }
    cell += ch; i++;
  }
  if (cell || row.length) { push(); rows.push(row.splice(0)); }
  const [head, ...body] = rows.filter(r => r.length > 1 || r[0] !== "");
  return body.map(r => Object.fromEntries(head.map((h, k) => [h, r[k] ?? ""])));
}

export function applySheet(handbook, prev, sheet) {
  const dict = { ...prev }, skipped = [];
  for (const r of sheet) {
    const [gid, i] = r.key.split(":");
    const p = (handbook[gid] || [])[+i];
    if (!p) { skipped.push(r.key); continue; }
    if (!String(r.en || "").trim()) continue;
    const e = { en: r.en, src: r.src || "tr" };
    if (r.aip) e.aip = r.aip;
    e.hash = hbHash(String(p[1] || ""));
    e.status = r.status === "ok" ? "ok" : "review";
    if (r.title_en) e.title = r.title_en;
    dict[r.key] = e;
  }
  return { dict, skipped };
}

if (process.argv[1] && /sheet-import\.mjs$/.test(process.argv[1])) {
  const [file, flag] = process.argv.slice(2);
  const sheet = fromCsv(fs.readFileSync(file, "utf8"));
  if (flag === "--ui") {
    const UI = loadGlobal(path.join(ROOT, "i18n/ui.en.js"), "UI_EN");
    let n = 0; for (const r of sheet) if (r.key in UI && String(r.en || "").trim()) { UI[r.key] = r.en; n++; }
    const header = `// i18n/ui.en.js — UI 문구 사전. 키는 한글 원문 그대로 (index.html 의 t()/tf() 호출과 1:1)
// 매개변수는 {이름} 자리표시자. 검수 완료 항목만 main 에 올린다`;
    fs.writeFileSync(path.join(ROOT, "i18n/ui.en.js"), serializeDict("UI_EN", header, UI), "utf8");
    console.log(`UI 사전 ${n}건 반영`);
  } else {
    const HANDBOOK = loadGlobal(path.join(ROOT, "gates.js"), "HANDBOOK");
    const prev = loadGlobal(path.join(ROOT, "i18n/handbook.en.js"), "HB_EN");
    const { dict, skipped } = applySheet(HANDBOOK, prev, sheet);
    const content = fs.readFileSync(path.join(ROOT, "i18n/handbook.en.js"), "utf8");
    const hasCRLF = content.includes("\r\n");
    const header = content.split(/\r?\nconst HB_EN/)[0].replace(/\r\n/g, "\n");
    const order = Object.keys(dict).sort((a, b) => (parseInt(a) - parseInt(b)) || a.localeCompare(b));
    let output = serializeDict("HB_EN", header, dict, order);
    if (hasCRLF) output = output.replace(/\n/g, "\r\n");
    fs.writeFileSync(path.join(ROOT, "i18n/handbook.en.js"), output, "utf8");
    console.log(`절차 사전 ${Object.keys(dict).length}건, 건너뜀 ${skipped.length}건 ${skipped.join(" ")}`);
  }
}
