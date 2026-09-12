// tools/i18n/aip-extract.mjs — AIP 텍스트 덤프에서 주기장별 pushback procedure / phraseology 행을 뽑는다
// 사용: node tools/i18n/aip-extract.mjs tools/i18n/aip-text.txt tools/i18n/aip-rows.json "AMDT 7/26"
// 표 구조(페이지당): 주기장 헤더 줄 → procedure 문장(들) → phraseology. PDF 추출은 줄을 임의로 끊으므로
// 주기장 블록 단위로 이어 붙인 뒤 "The aircraft shall … Pushback approved …" 쌍으로 다시 자른다.
import fs from "node:fs";

const STAND = /^\(?\d{1,3}[LR]?\)?(?:\s*(?:,|and|to|–|-)\s*\d{1,3}[LR]?)*$/;
const NOISE = [/^A I P$/, /^Republic of Korea$/, /^RKSI AD 2/, /^\d{1,2} [A-Z]{3} \d{4}$/, /^Aircraft Stands Pushback Procedures Phraseology$/,
  /^Apron \d/, /^OFFICE OF CIVIL AVIATION/, /^Effective :/, /^Change :/, /^AIRAC AIP AMDT/, /^AIP AMDT/];

export function expandStands(spec) {
  const s = spec.replace(/[()]/g, "").trim();
  const range = s.match(/^(\d+)([LR]?)\s+to\s+(\d+)([LR]?)$/);
  if (range) { const out = []; for (let n = +range[1]; n <= +range[3]; n++) out.push(String(n)); return out; }
  return s.split(/\s*(?:,|and)\s*/).map(x => x.trim()).filter(Boolean);
}

// "(652R/L)" 같은 괄호 한정자 → ["652R","652L"]
function qualifier(text) {
  const m = text.match(/^\((\d{1,3})([LR])\/([LR])\)\s*/);
  return m ? { stands: [m[1] + m[2], m[1] + m[3]], rest: text.slice(m[0].length) } : null;
}

export function parseAipText(text) {
  const rows = [];
  let page = 0, stands = null, buf = [];
  const flush = () => {
    if (!stands || !buf.length) { buf = []; return; }
    const joined = buf.join(" ").replace(/\s+/g, " ").trim();
    // procedure 시작(The aircraft shall / 괄호 한정자) 기준으로 자른다
    const parts = joined.split(/(?=\(\d{1,3}[LR]\/[LR]\)\s*The aircraft shall|(?<!\(\d{1,3}[LR]\/[LR]\)\s*)(?<!\S)The aircraft shall)/).map(s => s.trim()).filter(Boolean);
    for (let part of parts) {
      let st = stands;
      const q = qualifier(part); if (q) { st = q.stands; part = q.rest; }
      const m = part.match(/^(.*?)\s*(Pushback approved.*)$/);
      if (!m) continue;
      rows.push({ stands: st, proc: m[1].trim(), phr: m[2].trim(), page });
    }
    buf = [];
  };
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    const pm = line.match(/^===== PAGE (\d+) =====$/);
    if (pm) { flush(); page = +pm[1]; continue; }
    if (!line || NOISE.some(re => re.test(line))) continue;
    if (STAND.test(line) && !/^\(/.test(line)) { flush(); stands = expandStands(line); continue; }
    buf.push(line);
  }
  flush();
  return rows;
}

if (process.argv[1] && /aip-extract\.mjs$/.test(process.argv[1])) {
  const [src, dst, amdt] = process.argv.slice(2);
  const rows = parseAipText(fs.readFileSync(src, "utf8"));
  fs.writeFileSync(dst, JSON.stringify({ amdt: amdt || "", rows }, null, 1), "utf8");
  console.log("rows", rows.length, "unique proc", new Set(rows.map(r => r.proc)).size, "unique phr", new Set(rows.map(r => r.phr)).size);
}
