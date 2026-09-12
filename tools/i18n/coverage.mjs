// tools/i18n/coverage.mjs — 영문판 커버리지 검사. 종료코드 0 = 통과
// 1) index.html 의 한글 리터럴 중 t()/tf()/data-t 로 감싸지 않은 것
// 2) handbook.en.js 항목 중 한글 원문 해시가 맞지 않는 것, HANDBOOK 에 있는데 사전에 없는 것,
//    한글 본문의 "개방" 조건이 영문에서 빠진 것, 한글 "* 주의 문구" 개수와 영문 " * " 개수가 다른 것
// 3) status !== "ok" 인 항목
// 4) img/*.svg 안의 한글 <text>
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { loadGlobal, ROOT } from "./lib.mjs";
const require = createRequire(import.meta.url);
const args = new Set(process.argv.slice(2));           // --no-status: 미검수를 실패로 치지 않음 (Phase 2 중간 확인용)

const KO = /[가-힣]/;
const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");

// ── 1. UI 문구 ─────────────────────────────────────────────
// 표식 두 종류 (JS 주석 위치 어디든):
//   /* i18n-skip-start */ … /* i18n-skip-end */  관리자 전용 구간. 검사 제외
//   /* i18n-data-start */ … /* i18n-data-end */  데이터 구간(ZONE_GATES·FILLED·PATH_ANIM 등). 렌더 시점에 t() 로 감싸므로
//                                                 감싸지 않아도 되지만, 안의 한글 문자열은 모두 UI_EN 키여야 한다
const DATA_RE = /\/\*\s*i18n-data-start\s*\*\/([\s\S]*?)\/\*\s*i18n-data-end\s*\*\//g;
function stripComments(src) {
  src = src.replace(/\/\*\s*i18n-skip-start\s*\*\/[\s\S]*?\/\*\s*i18n-skip-end\s*\*\//g, "");
  src = src.replace(DATA_RE, "");
  src = src.replace(/\/\*[\s\S]*?\*\//g, "");
  return src.split("\n").map(l => l.replace(/(?<![:"'\\])\/\/.*$/, "")).join("\n");
}
const bodyStart = html.indexOf("<body>"), scriptStart = html.indexOf("<script>", bodyStart);
const markup = html.slice(bodyStart, scriptStart);
const rawScript = html.slice(scriptStart);
// i18n-data 구간 안에도 // 주석(구역 안내 등)이 섞여 있을 수 있어 한글 주석 자체가
// "따옴표 없는 리터럴"로 오검출되지 않도록 스크립트와 동일하게 줄 주석을 먼저 지운다
const dataBlocks = [...rawScript.matchAll(DATA_RE)].map(x => x[1])
  .join("\n").split("\n").map(l => l.replace(/(?<![:"'\\])\/\/.*$/, "")).join("\n");
const script = stripComments(rawScript);
const unwrapped = [];
// 마크업: 한글이 있는 줄은 data-t 계열 속성이 있어야 한다
markup.split("\n").forEach((l, i) => {
  if (KO.test(l) && !/data-t(-alt|-aria)?="/.test(l)) unwrapped.push(`markup:${i + 1}: ${l.trim().slice(0, 100)}`);
});
// 스크립트: 한글이 든 문자열 리터럴은 바로 앞이 t( 또는 tf( 이어야 한다
//
// 주의: 템플릿 리터럴(`…`) 은 내부에 ${...} 표현식이 중첩될 수 있고, 그 표현식 안에 다시
// 따옴표·백틱이 나올 수 있다 (예: `<img alt="${tf("...",{n:g.id})}">`, 또는
// `${cfg.vb ? cfg.vb.join(' ') : `0 0 ${cfg.w} ${cfg.h}`}` 처럼 백틱이 한 번 더 중첩되는 경우).
// 단순히 "다음에 나오는 같은 종류의 따옴표"를 닫는 걸로 보는 정규식(LIT)은 이런 중첩을 이해하지
// 못해 ${...} 안의 백틱/따옴표를 바깥 템플릿의 종료로 착각하거나, 반대로 ${...} 안에 이미
// t()/tf() 로 감싸 등록한 한글이 있는데도 그 바깥 템플릿 전체를 "감싸지 않은 문구"로 오탐한다.
// 그래서 아래 scanLiterals 는 따옴표/백틱을 깊이(depth) 를 세며 직접 훑어, 각 리터럴의 정확한
// 시작·끝과 "실제 출력 텍스트(템플릿의 ${...} 바깥 부분)"만 골라낸다. 정규식 리터럴(/…/)은
// 이 스캐너가 다루는 어떤 구분자(", ', `)도 사용하지 않으므로 애초에 오검출 대상이 아니다.
function scanLiterals(src) {
  const n = src.length;
  const out = []; // { openIndex, text, isTemplateText }
  function findQuoteEnd(i, q) {           // src[i] === q; i 뒤에서 짝이 되는 q 의 바로 다음 인덱스
    let j = i + 1;
    while (j < n) {
      const c = src[j];
      if (c === "\\") { j += 2; continue; }
      if (c === q) return j + 1;
      if (c === "\n") return j;          // 줄바꿈 전 종료(비정상 입력 방어)
      j++;
    }
    return j;
  }
  function scanExpr(i) {                  // i: "${" 바로 다음. depth 가 0 이 되는 "}" 다음 인덱스를 반환
    let depth = 1, j = i;
    while (j < n && depth > 0) {
      const c = src[j];
      if (c === "{") { depth++; j++; }
      else if (c === "}") { depth--; j++; }
      else if (c === "'" || c === '"') {
        out.push({ openIndex: j, text: src.slice(j + 1, findQuoteEnd(j, c) - 1) });
        j = findQuoteEnd(j, c);
      } else if (c === "`") { j = scanTemplate(j); }
      else j++;
    }
    return j;
  }
  function scanTemplate(i) {              // src[i] === '`'. 짝이 되는 '`' 다음 인덱스를 반환
    let j = i + 1, textStart = j;
    while (j < n) {
      const c = src[j];
      if (c === "\\") { j += 2; continue; }
      if (c === "`") { out.push({ openIndex: textStart, text: src.slice(textStart, j), isTemplateText: true }); return j + 1; }
      if (c === "$" && src[j + 1] === "{") {
        out.push({ openIndex: textStart, text: src.slice(textStart, j), isTemplateText: true });
        j = scanExpr(j + 2);
        textStart = j;
        continue;
      }
      j++;
    }
    out.push({ openIndex: textStart, text: src.slice(textStart, j), isTemplateText: true });
    return j;
  }
  let i = 0;
  while (i < n) {
    const c = src[i];
    if (c === "'" || c === '"') { out.push({ openIndex: i, text: src.slice(i + 1, findQuoteEnd(i, c) - 1) }); i = findQuoteEnd(i, c); }
    else if (c === "`") { i = scanTemplate(i); }
    else i++;
  }
  return out;
}
for (const lit of scanLiterals(script)) {
  if (!KO.test(lit.text)) continue;
  if (lit.isTemplateText) {               // 템플릿 리터럴의 순수 출력 텍스트 — t()/tf() 인자가 될 수 없으므로 항상 위반
    const line = script.slice(0, lit.openIndex).split("\n").length;
    unwrapped.push(`script:${line}: ${lit.text.trim().slice(0, 80)}`);
    continue;
  }
  const before = script.slice(Math.max(0, lit.openIndex - 4), lit.openIndex);
  if (/\btf?\($/.test(before)) continue;
  const line = script.slice(0, lit.openIndex).split("\n").length;
  unwrapped.push(`script:${line}: ${lit.text.slice(0, 80)}`);
}
// 사전 미등록: t("…")/tf("…") 의 키가 UI_EN 에 없는 것
//
// index.html 은 텍스트 그대로 정규식으로 훑지만(예: \n 은 문자 두 개 '\'와 'n'), ui.en.js 는
// loadGlobal 이 실제로 실행해서 값을 얻으므로 그 안의 "\n" 은 실행 결과인 개행 문자 한 글자가
// 된다. 이 차이 때문에 이스케이프가 든 키(예: "...\nWi-Fi...")가 실제로는 등록돼 있어도
// 문자열이 달라 보여 미등록으로 오탐한다. 비교 전에 표준 이스케이프를 해석해 맞춰준다
function unesc(s) {
  return s.replace(/\\(u\{[0-9a-fA-F]+\}|u[0-9a-fA-F]{4}|x[0-9a-fA-F]{2}|[\s\S])/g, (_, g) => {
    if (g[0] === "u") return String.fromCodePoint(parseInt(g[1] === "{" ? g.slice(2, -1) : g.slice(1), 16));
    if (g[0] === "x") return String.fromCharCode(parseInt(g.slice(1), 16));
    const map = { n: "\n", t: "\t", r: "\r", b: "\b", f: "\f", v: "\v", "0": "\0" };
    return g in map ? map[g] : g;              // \\, \", \', \` 등은 그 글자 자체가 된다
  });
}
const UI_EN = loadGlobal(path.join(ROOT, "i18n/ui.en.js"), "UI_EN");
const missing = [];
let m;
const CALL = /\btf?\(\s*(["'`])((?:(?!\1)[^\\]|\\.)*?)\1/g;
while ((m = CALL.exec(script))) if (KO.test(m[2]) && !(unesc(m[2]) in UI_EN)) missing.push(m[2]);
const DT = /data-t(?:-alt|-aria)?="([^"]+)"/g;
while ((m = DT.exec(markup))) if (!(unesc(m[1]) in UI_EN)) missing.push(m[1]);
// 데이터 구간의 한글 문자열 리터럴(구역명, 예시 절차, 애니메이션 단계 txt 등)도 사전에 있어야 한다
for (const lit of scanLiterals(dataBlocks)) if (KO.test(lit.text) && !(unesc(lit.text) in UI_EN)) missing.push(lit.text);
// gates.js 의 주의사항(CAUTIONS)은 index.html 에서 t() 로 감싸 그리므로 값이 모두 UI_EN 키여야 한다
const CAUTIONS = loadGlobal(path.join(ROOT, "gates.js"), "CAUTIONS");
for (const v of Object.values(CAUTIONS)) for (const c of [].concat(v)) if (!(String(c) in UI_EN)) missing.push(String(c));

// ── 2·3. 절차 사전 ───────────────────────────────────────
const { hbHash } = require("../../i18n/i18n.js");
const HANDBOOK = loadGlobal(path.join(ROOT, "gates.js"), "HANDBOOK");
const HB_EN = loadGlobal(path.join(ROOT, "i18n/handbook.en.js"), "HB_EN");
// AIP 문장만 옮겨 온 항목이 핸드북의 "* …" 보충 문구를 흘리지 않았는지 함께 본다
//  - noteDropped: 한글에 "*" 가 있는데 src 가 "aip" (AIP 문장 그대로라 보충 문구가 빠져 있다)
//  - noteMissing: 한글에 "*" 가 있고 src 가 "aip+tr" 인데 en 에 " * " 구분이 없고 첫 구간이 그 주기장
//                 AIP 행의 proc 과 완전히 같다 (= AIP 문장만 있고 보충 문구가 아직 안 붙었다).
//                 "AIP 문장. * 보충문" 형태는 통과한다. 한글에 "*" 가 없는 aip+tr 항목(259:3·260:3 처럼
//                 phraseology 가 자동 매칭되지 않아 사람이 같은 주기장 AIP 후보를 그대로 고른 경우)은
//                 보충할 내용 자체가 없으므로 대상이 아니다. src 를 "aip" 로 되돌리면 match.mjs 가
//                 재생성 대상으로 보고 매칭이 안 될 때 항목을 지워 버리므로 aip+tr 로 둔다
const aipProcByStand = new Map();
{
  const { rows } = JSON.parse(fs.readFileSync(path.join(ROOT, "tools/i18n/aip-rows.json"), "utf8"));
  for (const r of rows) for (const st of r.stands) {
    if (!aipProcByStand.has(st)) aipProcByStand.set(st, new Set());
    aipProcByStand.get(st).add(r.proc);
  }
}
const isAipProc = (gid, en) => {
  const bare = gid.replace(/[LR]$/, "");
  return (aipProcByStand.get(gid) || new Set()).has(en) || (aipProcByStand.get(bare) || new Set()).has(en);
};
// "개방" 조건(유도선·유도로·GSE도로를 비워 두는 조건)은 한글 본문에 있으면 영문에도 반드시 남아야 한다.
// AIP 문장과 글자 그대로 맞아떨어지는 항목에서 이 조건절이 통째로 빠지는 사례가 있었으므로
// 영문에 clear / available 이 하나도 없으면 누락으로 본다 (leaving … clear, … remains clear,
// … remains available 이 현재 쓰는 표현)
const clearMissing = [];
// 한글 본문의 "* 주의 문구" 는 영문에서도 " * " 로 같은 개수만큼 구분해 둔다 (index.html procDesc 가
// 이 구분자를 빨간 주의 문구로 렌더한다). 개수가 어긋나면 도면 안내문(hbNotes)도 함께 어긋난다
const noteCount = [];
const stale = [], absent = [], review = [], noteDropped = [], noteMissing = [];
for (const gid of Object.keys(HANDBOOK)) HANDBOOK[gid].forEach((p, i) => {
  const k = gid + ":" + i, e = HB_EN[k], ko = String(p[1] || "");
  if (!e) { absent.push(k); return; }
  const en = String(e.en || "");
  if (e.hash !== hbHash(ko)) stale.push(k);
  if (e.status !== "ok") review.push(k);
  if (e.src === "aip" && ko.includes("*")) noteDropped.push(k);
  if (e.src === "aip+tr" && ko.includes("*") && !en.includes(" * ") && isAipProc(gid, en.split(" * ")[0])) noteMissing.push(k);
  if (ko.includes("개방") && !/clear|available/i.test(en)) clearMissing.push(k);
  const nKo = (ko.match(/\*/g) || []).length, nEn = (en.match(/ \* /g) || []).length;
  if (nKo !== nEn) noteCount.push(`${k} 한글 ${nKo} / 영문 ${nEn}`);
});

// ── 4. SVG 라벨 ─────────────────────────────────────────
const svgKo = [];
for (const f of fs.readdirSync(path.join(ROOT, "img")).filter(f => f.endsWith(".svg"))) {
  const s = fs.readFileSync(path.join(ROOT, "img", f), "utf8");
  const t = [...s.matchAll(/<text[^>]*>([^<]*)<\/text>/g)].filter(x => KO.test(x[1]));
  if (t.length) svgKo.push(`${f}: ${t.map(x => x[1]).join(" | ")}`);
}

function section(title, items) { console.log(`== ${title}: ${items.length}건`); items.slice(0, 40).forEach(x => console.log("  " + x)); if (items.length > 40) console.log(`  … 외 ${items.length - 40}건`); }
section("감싸지 않은 한글 문구", unwrapped);
section("사전 미등록 키", [...new Set(missing)]);
section("절차 사전 없음", absent);
section("절차 해시 불일치", stale);
section("주의 문구 누락(src aip)", noteDropped);
section("주의 문구 보충 안 됨(src aip+tr)", noteMissing);
section("주의 문구 개수 불일치", noteCount);
section("개방 조건 누락", clearMissing);
section("절차 미검수", review);
section("SVG 한글 라벨", svgKo);
const fail = unwrapped.length || missing.length || absent.length || stale.length || noteDropped.length || noteMissing.length
  || noteCount.length || clearMissing.length || svgKo.length || (!args.has("--no-status") && review.length);
process.exit(fail ? 1 : 0);
