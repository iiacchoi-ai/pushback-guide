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

// 기존 파일의 `const <name> = {...}` 이전 부분(파일 상단 주석)을 보존한 채 사전을 다시 직렬화한다.
// handbook.en.js/ui.en.js 공용: existingContent 는 갱신 전 파일 원문.
export function serializeWithHeader(name, existingContent, dict, keyOrder) {
  const hasCRLF = existingContent.includes("\r\n");
  const header = existingContent.split(new RegExp(`\\r?\\nconst ${name}`))[0].replace(/\r\n/g, "\n");
  let output = serializeDict(name, header, dict, keyOrder);
  if (hasCRLF) output = output.replace(/\n/g, "\r\n");
  return output;
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
  // CLI 오류는 스택 없이 한 줄 안내로만 알린다
  if (!file) { console.error("사용: node tools/i18n/sheet-import.mjs <in.csv> [--ui]"); process.exit(1); }
  if (!fs.existsSync(file)) { console.error(`CSV 파일을 찾을 수 없습니다: ${file}`); process.exit(1); }
  const sheet = fromCsv(fs.readFileSync(file, "utf8"));
  if (!sheet.length || !("key" in sheet[0])) { console.error(`CSV 에 key 열이 없습니다: ${file}`); process.exit(1); }
  if (flag === "--ui") {
    const UI = loadGlobal(path.join(ROOT, "i18n/ui.en.js"), "UI_EN");
    let n = 0; for (const r of sheet) if (r.key in UI && String(r.en || "").trim()) { UI[r.key] = r.en; n++; }
    // 절차 사전(handbook.en.js)과 동일한 방식: 기존 파일에서 `const UI_EN` 이전 부분(파일 상단 주석)을 그대로 보존한다.
    // 단, serializeDict 는 항목을 한 줄씩 다시 쓰므로 객체 내부의 구역 주석(// 구역, // 홈 …)은
    // 이 경로로 --ui 반영할 때마다 사라진다 — 알려진 한계이며 필요 시 반영 후 수동으로 되살릴 것.
    const uiContent = fs.readFileSync(path.join(ROOT, "i18n/ui.en.js"), "utf8");
    const output = serializeWithHeader("UI_EN", uiContent, UI);
    fs.writeFileSync(path.join(ROOT, "i18n/ui.en.js"), output, "utf8");
    console.log(`UI 사전 ${n}건 반영`);
  } else {
    const HANDBOOK = loadGlobal(path.join(ROOT, "gates.js"), "HANDBOOK");
    const prev = loadGlobal(path.join(ROOT, "i18n/handbook.en.js"), "HB_EN");
    const { dict, skipped } = applySheet(HANDBOOK, prev, sheet);
    const content = fs.readFileSync(path.join(ROOT, "i18n/handbook.en.js"), "utf8");
    const order = Object.keys(dict).sort((a, b) => (parseInt(a) - parseInt(b)) || a.localeCompare(b));
    const output = serializeWithHeader("HB_EN", content, dict, order);
    fs.writeFileSync(path.join(ROOT, "i18n/handbook.en.js"), output, "utf8");
    console.log(`절차 사전 ${Object.keys(dict).length}건, 건너뜀 ${skipped.length}건 ${skipped.join(" ")}`);
  }
}
