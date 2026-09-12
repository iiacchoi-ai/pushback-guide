// tools/i18n/match.mjs — HANDBOOK(gates.js) 절차를 AIP 행과 (주기장, phraseology) 기준으로 맞춰
// i18n/handbook.en.js 초안을 만든다. 검수 완료(status ok) 항목은 원문 해시가 같으면 보존한다.
// 사용: node tools/i18n/match.mjs   (입력: gates.js, tools/i18n/aip-rows.json, i18n/handbook.en.js)
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { loadGlobal, serializeDict, ROOT } from "./lib.mjs";
const require = createRequire(import.meta.url);
const { hbHash } = require("../../i18n/i18n.js");

export function normPhr(s) {
  return String(s).toLowerCase()
    .replace(/^pushback approved\s*/, "")
    .replace(/\(number\)/g, "")
    .replace(/\bgate\s+no\.?\s*(\d+(\s*,\s*\d+)*)?/g, "gate")
    .replace(/(\d)\s*romeo\b/g, "$1r")
    .replace(/[.,()[\]]/g, " ")
    .replace(/\s+/g, " ").trim();
}

export function matchHandbook(handbook, rows, amdt, prev) {
  const byStand = new Map();                 // stand → [{norm, proc}]
  for (const r of rows) for (const st of r.stands) {
    if (!byStand.has(st)) byStand.set(st, []);
    byStand.get(st).push({ norm: normPhr(r.phr), proc: r.proc });
  }
  const dict = {}, unmatched = [];
  let total = 0, matched = 0;
  for (const gid of Object.keys(handbook)) handbook[gid].forEach((p, i) => {
    total++;
    const key = gid + ":" + i, title = String(p[0] || ""), ko = String(p[1] || ""), hash = hbHash(ko);
    const old = prev[key];
    if (old && old.status === "ok" && old.hash === hash) { dict[key] = old; matched++; return; }
    const bare = gid.replace(/[LR]$/, "");
    const cands = byStand.get(gid) || byStand.get(bare) || [];
    const norm = normPhr(title);
    let hit = cands.find(c => c.norm === norm);
    // 접미사(L/R) 주기장에 후보는 있으나 phraseology 가 안 맞으면 bare 주기장 후보도 시도한다
    // (501/511/224 같은 qualifier 블록은 접미사 뒤 첫 절차만 접미사 stand 에 붙고 나머지는 bare 로 남는다)
    if (!hit && gid !== bare) hit = (byStand.get(bare) || []).find(c => c.norm === norm);
    if (hit) { dict[key] = { en: hit.proc, src: "aip", aip: amdt, hash, status: "review" }; matched++; return; }
    unmatched.push({ key, gid, title, ko, candidates: cands.map(c => c.proc) });
  });
  return { dict, unmatched, stats: { total, matched } };
}

if (process.argv[1] && /match\.mjs$/.test(process.argv[1])) {
  const HANDBOOK = loadGlobal(path.join(ROOT, "gates.js"), "HANDBOOK");
  const { amdt, rows } = JSON.parse(fs.readFileSync(path.join(ROOT, "tools/i18n/aip-rows.json"), "utf8"));
  const prev = loadGlobal(path.join(ROOT, "i18n/handbook.en.js"), "HB_EN");
  const { dict, unmatched, stats } = matchHandbook(HANDBOOK, rows, amdt, prev);
  // 검수 중인 tr 항목도 보존한다 (match 는 aip 매칭만 갱신)
  for (const [k, v] of Object.entries(prev)) if (!dict[k] && v.src !== "aip") dict[k] = v;
  const header = `// i18n/handbook.en.js — 절차 사전. tools/i18n/match.mjs 와 sheet-import.mjs 가 생성·갱신한다. 손으로 고치지 않는다
// 키 "주기장:순번" (HANDBOOK[주기장][순번]). en: 영문 본문, title: 제목 재정의(선택), src: "aip"|"tr"|"aip+tr",
// aip: AIP AMDT 번호, hash: 한글 원문 해시(i18n.js hbHash), status: "review"|"ok"`;
  const order = Object.keys(dict).sort((a, b) => (parseInt(a) - parseInt(b)) || a.localeCompare(b));
  fs.writeFileSync(path.join(ROOT, "i18n/handbook.en.js"), serializeDict("HB_EN", header, dict, order), "utf8");
  fs.writeFileSync(path.join(ROOT, "tools/i18n/unmatched.json"), JSON.stringify(unmatched, null, 1), "utf8");
  console.log(`매칭 ${stats.matched}/${stats.total} (${(100 * stats.matched / stats.total).toFixed(1)}%) · 잔여 ${unmatched.length}건 → tools/i18n/unmatched.json`);
}
