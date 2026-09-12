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
  let total = 0, matched = 0, kept = 0;      // kept: 기존 검수분(tr·aip+tr)을 그대로 둔 건수
  for (const gid of Object.keys(handbook)) handbook[gid].forEach((p, i) => {
    total++;
    const key = gid + ":" + i, title = String(p[0] || ""), ko = String(p[1] || ""), hash = hbHash(ko);
    const old = prev[key];
    if (old && old.status === "ok" && old.hash === hash) { dict[key] = old; matched++; return; }
    const bare = gid.replace(/[LR]$/, "");
    const cands = byStand.get(gid) || byStand.get(bare) || [];
    // 검수 중인 tr·aip+tr 항목은 매칭 결과와 무관하게 보존한다 (자동 생성 대상은 src:"aip" 뿐).
    // 한글 원문이 바뀌면(해시 불일치) 번역이 낡은 것이므로 보존하지 않고 AIP 에서 다시 만든다
    if (old && old.src && old.src !== "aip" && old.hash === hash) {
      dict[key] = old; matched++; kept++;
      // 보존했더라도 본문이 아직 AIP 문장 그대로면(= "* …" 보충이 안 붙었으면) 대기 목록에 계속 남긴다
      const base = ko.includes("*") && cands.find(c => c.proc === String(old.en || ""));
      if (base) unmatched.push({ key, gid, title, ko, aipBase: base.proc, candidates: cands.map(c => c.proc) });
      return;
    }
    const norm = normPhr(title);
    let hit = cands.find(c => c.norm === norm);
    // 접미사(L/R) 주기장에 후보는 있으나 phraseology 가 안 맞으면 bare 주기장 후보도 시도한다
    // (501/511/224 같은 qualifier 블록은 접미사 뒤 첫 절차만 접미사 stand 에 붙고 나머지는 bare 로 남는다)
    if (!hit && gid !== bare) hit = (byStand.get(bare) || []).find(c => c.norm === norm);
    if (hit) {
      // 핸드북 본문에 "* …" 보충 문구가 있으면 AIP 문장만으로는 내용이 빠진다.
      // en 은 AIP 문장으로 채우되 src 를 aip+tr 로 두고 보충 대기 목록(unmatched)에 남긴다
      const hasNote = ko.includes("*");
      dict[key] = { en: hit.proc, src: hasNote ? "aip+tr" : "aip", aip: amdt, hash, status: "review" };
      matched++;
      if (hasNote) unmatched.push({ key, gid, title, ko, aipBase: hit.proc, candidates: cands.map(c => c.proc) });
      return;
    }
    unmatched.push({ key, gid, title, ko, candidates: cands.map(c => c.proc) });
  });
  return { dict, unmatched, stats: { total, matched, kept } };
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
  const awaitSup = unmatched.filter(u => u.aipBase).length;
  console.log(`매칭·보존 ${stats.matched}/${stats.total} (${(100 * stats.matched / stats.total).toFixed(1)}%, 기존 검수분 보존 ${stats.kept}건)`
    + ` · 잔여 ${unmatched.length}건(보충 대기 ${awaitSup}건 포함) → tools/i18n/unmatched.json`);
}
