// tools/i18n/coverage.mjs — 영문판 커버리지 검사. 종료코드 0 = 통과
// 1) index.html 의 한글 리터럴 중 t()/tf()/data-t 로 감싸지 않은 것
// 2) handbook.en.js 항목 중 한글 원문 해시가 맞지 않는 것, HANDBOOK 에 있는데 사전에 없는 것
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

// ── 2·3. 절차 사전 ───────────────────────────────────────
const { hbHash } = require("../../i18n/i18n.js");
const HANDBOOK = loadGlobal(path.join(ROOT, "gates.js"), "HANDBOOK");
const HB_EN = loadGlobal(path.join(ROOT, "i18n/handbook.en.js"), "HB_EN");
const stale = [], absent = [], review = [];
for (const gid of Object.keys(HANDBOOK)) HANDBOOK[gid].forEach((p, i) => {
  const k = gid + ":" + i, e = HB_EN[k];
  if (!e) { absent.push(k); return; }
  if (e.hash !== hbHash(String(p[1] || ""))) stale.push(k);
  if (e.status !== "ok") review.push(k);
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
section("절차 미검수", review);
section("SVG 한글 라벨", svgKo);
const fail = unwrapped.length || missing.length || absent.length || stale.length || svgKo.length || (!args.has("--no-status") && review.length);
process.exit(fail ? 1 : 0);
