// tools/i18n/sheet-export.mjs — 검수 시트 내보내기. 절차: 사전 항목 + 잔여(unmatched) 를 한 시트에
// 사용: node tools/i18n/sheet-export.mjs <out.csv> [--ui]
import fs from "node:fs";
import path from "node:path";
import { loadGlobal, ROOT } from "./lib.mjs";
import { toCsv } from "./sheet-import.mjs";

const [out, flag] = process.argv.slice(2);
if (flag === "--ui") {
  const UI = loadGlobal(path.join(ROOT, "i18n/ui.en.js"), "UI_EN");
  const rows = Object.entries(UI).map(([key, en]) => ({ key, en, status: "ok" }));
  fs.writeFileSync(out, toCsv(rows, ["key", "en", "status"]), "utf8");
  console.log(`UI ${rows.length}건 → ${out}`);
} else {
  const HANDBOOK = loadGlobal(path.join(ROOT, "gates.js"), "HANDBOOK");
  const HB_EN = loadGlobal(path.join(ROOT, "i18n/handbook.en.js"), "HB_EN");
  const rows = [];
  for (const gid of Object.keys(HANDBOOK).sort((a, b) => (parseInt(a) - parseInt(b)) || a.localeCompare(b))) HANDBOOK[gid].forEach((p, i) => {
    const key = gid + ":" + i, e = HB_EN[key] || {};
    rows.push({ key, gid, title: p[0], ko: p[1], en: e.en || "", title_en: e.title || "", src: e.src || "", aip: e.aip || "", status: e.status || "", note: "" });
  });
  fs.writeFileSync(out, toCsv(rows, ["key", "gid", "title", "ko", "en", "title_en", "src", "aip", "status", "note"]), "utf8");
  console.log(`절차 ${rows.length}건 (영문 있음 ${rows.filter(r => r.en).length}) → ${out}`);
}
