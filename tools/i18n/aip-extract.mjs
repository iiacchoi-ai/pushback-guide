// tools/i18n/aip-extract.mjs — AIP 텍스트 덤프에서 주기장별 pushback procedure / phraseology 행을 뽑는다
// 사용: node tools/i18n/aip-extract.mjs tools/i18n/aip-text.txt tools/i18n/aip-rows.json "AMDT 7/26"
// 표 구조(페이지당): 주기장 헤더 줄(들) → procedure 문장(들) → phraseology. PDF 추출은 줄을 임의로 끊으므로
// 주기장 블록 단위로 이어 붙인 뒤 "The aircraft shall … Pushback approved …" 쌍으로 다시 자른다.
//
// 헤더는 다음 4가지 모양으로 나타난다:
//  1) 온전한 한 줄:            "6" / "1 and 2" / "302 to 311"
//  2) 여러 줄에 걸쳐 쉼표로 이어짐: "105, 107,\n109, 111, 113,\n...\n127 and 129"
//  3) 같은 줄에 procedure 가 바로 붙음: "332 The aircraft shall …", "341, 341R/L The aircraft shall …"
//  4) 괄호 한정자가 헤더 뒤 별도 줄에 옴: "219 to 222\n(224L)\nThe aircraft shall …"
//     (4)의 괄호는 procedure 줄과 함께 buf 에 쌓였다가 flush 시점에 qualifier() 로 분리된다.
import fs from "node:fs";

// 주기장 토큰: "224", "224L", "224R/L", "309A", "309A/B" (숫자 + 단일 접미사 또는 A/B·L/R 슬래시 쌍)
const TOKEN = "\\d{1,3}[LRAB]?(?:\\/[LRAB])?";
const SEPR = "(?:,|and|to|∼|~|–|-)"; // 쉼표 / and / to / ∼ / ~ / – / -
const SPEC = `${TOKEN}(?:\\s*${SEPR}\\s*${TOKEN})*`;
const SPEC_LINE = new RegExp(`^${SPEC}\\s*(?:,|and)?$`); // 온전한 한 줄(끝에 매달린 ","·"and" 도 허용 = 다음 줄로 이어짐)
// 헤더 뒤 같은 줄에 procedure 가 바로 옴("332 The aircraft shall …"). "(" 는 트리거에서 제외한다 —
// 실제 데이터에는 헤더+괄호 같은 줄 사례가 없고, 대신 "815(814)" 같은 phraseology 줄바꿈 잔재가
// "815" 를 새 헤더로 오인하게 만드는 사례만 있다(둘 다 "숫자 바로 뒤 괄호" 모양이라 구분이 안 됨).
const SPEC_PREFIX = new RegExp(`^(${SPEC})(?=\\s*The aircraft shall\\b)`);
const DANGLING = /(?:,|and)$/; // 줄 끝이 쉼표·and 로 매달려 다음 줄로 이어지는지
const SPEC_FULL = new RegExp(`^${SPEC}$`);
const RANGE_RE = new RegExp(`^(\\d{1,3})([LRAB])?(?:\\/([LRAB]))?\\s*(?:to|∼|~|–|-)\\s*(\\d{1,3})([LRAB])?(?:\\/([LRAB]))?$`);

const NOISE = [/^A I P$/, /^Republic of Korea$/, /^RKSI AD 2/, /^\d{1,2} [A-Z]{3} \d{4}$/, /^Aircraft Stands Pushback Procedures Phraseology$/,
  /^Apron \d/, /^Cargo Apron \d/, /^OFFICE OF CIVIL AVIATION/, /^Effective :/, /^Change :/, /^AIRAC AIP AMDT/, /^AIP AMDT/];

function expandToken(tok) {
  const m = tok.match(/^(\d{1,3})([LRAB])?(?:\/([LRAB]))?$/);
  if (!m) return [tok];
  const [, num, s1, s2] = m;
  if (s2) return [num + s1, num + s2];
  if (s1) return [num + s1];
  return [num];
}

export function expandStands(spec) {
  const s = spec.replace(/[()]/g, "").trim();
  const items = s.split(/\s*(?:,|and)\s*/).map(x => x.trim()).filter(Boolean);
  const out = [];
  for (const item of items) {
    const range = item.match(RANGE_RE);
    if (range) {
      const [, n1, a1, b1, n2, a2, b2] = range;
      const sufs = [];
      for (const suf of [a1, b1, a2, b2]) if (suf && !sufs.includes(suf)) sufs.push(suf);
      for (let n = +n1; n <= +n2; n++) {
        if (sufs.length === 0) out.push(String(n));
        else for (const suf of sufs) out.push(String(n) + suf);
      }
    } else {
      out.push(...expandToken(item));
    }
  }
  return out;
}

// 괄호 한정자: "(224L)", "(652R/L)", "(309A/B, 310A/B, 311A/B)" 등 → stands 목록으로.
// 괄호 안이 순수 숫자 하나뿐이면("(32)", "(816)") phraseology 안의 대체 표기이지 한정자가 아니므로 제외한다.
function qualifier(text) {
  if (text[0] !== "(") return null;
  const close = text.indexOf(")");
  if (close === -1) return null;
  const inner = text.slice(1, close).trim();
  if (/^\d{1,3}$/.test(inner)) return null;
  if (!SPEC_FULL.test(inner)) return null;
  const stands = expandStands(inner);
  if (!stands.length) return null;
  return { stands, rest: text.slice(close + 1).trim() };
}

// flush 시 procedure 블록을 다시 자르는 지점: "(한정자) The aircraft shall" 또는 단독 "The aircraft shall".
// 괄호 안이 순수 숫자 하나뿐인 경우("(32)", "(816)")는 한정자가 아니므로 분리 지점에서 제외한다.
const QUAL_PAREN = `\\((?!\\d{1,3}\\))${SPEC}\\)`;
const SPLIT_RE = new RegExp(`(?=${QUAL_PAREN}\\s*The aircraft shall|(?<!${QUAL_PAREN}\\s*)(?<!\\S)The aircraft shall)`);

export function parseAipText(text) {
  const rows = [];
  let page = 0, stands = null, buf = [];
  let pendingHeader = null; // 여러 줄에 걸쳐 쉼표로 이어지는 주기장 목록을 모으는 중
  let noContentYet = false; // 방금 헤더를 확정했고 아직 본문(procedure) 줄을 하나도 안 쌓은 상태

  const flush = () => {
    if (!stands || !buf.length) { buf = []; return; }
    const joined = buf.join(" ").replace(/\s+/g, " ").trim();
    const parts = joined.split(SPLIT_RE).map(s => s.trim()).filter(Boolean);
    for (let part of parts) {
      let st = stands;
      const q = qualifier(part); if (q) { st = q.stands; part = q.rest; }
      const m = part.match(/^(.*?)\s*(Pushback approved.*)$/);
      if (!m) continue;
      rows.push({ stands: st, proc: m[1].trim(), phr: m[2].trim(), page });
    }
    buf = [];
  };

  // 새 헤더 확정: 직전에 확정한 헤더 뒤로 procedure 를 하나도 못 쌓은 채 곧바로 또 헤더가 나오면
  // (예: "601 to 614" 다음 줄이 바로 "621 to 634") 같은 procedure 를 공유하는 것이므로 합친다.
  const setStands = newStands => {
    if (noContentYet && stands) stands = stands.concat(newStands);
    else { flush(); stands = newStands; }
    noContentYet = true;
  };

  // 괄호 한정자가 여러 줄에 걸치면("(342R/L, 343R/L,\n345R, 347R,\n352R/L)") 안쪽 줄만 떼어놓고 보면
  // 그 자체로도 유효한 주기장 목록 조각처럼 보인다("345R, 347R," 등). 괄호가 열려 있는 동안은
  // 헤더 판정을 전부 건너뛰고 무조건 buf 에 쌓아, flush 시점에 qualifier() 가 통째로 처리하게 한다.
  let parenDepth = 0;
  const pushBuf = line => {
    buf.push(line);
    noContentYet = false;
    for (const ch of line) {
      if (ch === "(") parenDepth++;
      else if (ch === ")") parenDepth = Math.max(0, parenDepth - 1);
    }
  };

  // "Pilot shall …" 로 시작하는 운영 remark(디아이싱 시 자력 이동 지시 등)는 procedure/phraseology
  // 쌍이 아니라 별도 주석이며, 한 줄로 끝나기도("… deicing. -") 여러 줄에 걸쳐 "-" 로 끝나기도
  // 한다("Pilot shall request … following\naircraft : … series.\n-"). 이 표의 스키마에는
  // remark 를 담을 자리가 없으므로, 인접 행의 proc/phr 이 오염되지 않도록 통째로 건너뛴다.
  let inRemark = false;

  for (const raw of text.split("\n")) {
    const line = raw.trim();
    const pm = line.match(/^===== PAGE (\d+) =====$/);
    if (pm) { flush(); page = +pm[1]; pendingHeader = null; noContentYet = false; parenDepth = 0; inRemark = false; continue; }
    if (!line || NOISE.some(re => re.test(line))) continue;

    if (inRemark) { inRemark = line !== "-" && !/-$/.test(line); continue; }
    if (/^Pilot shall\b/.test(line)) { inRemark = !/-$/.test(line); continue; }

    if (parenDepth > 0) { pushBuf(line); continue; }

    if (pendingHeader) {
      if (SPEC_LINE.test(line)) {
        pendingHeader = `${pendingHeader} ${line}`;
        if (!DANGLING.test(line)) { setStands(expandStands(pendingHeader)); pendingHeader = null; }
        continue;
      }
      // 예상 밖 상황: 지금까지 모은 것으로 헤더를 확정하고, 이번 줄은 아래 일반 분기로 다시 판단한다
      setStands(expandStands(pendingHeader));
      pendingHeader = null;
    }

    const pfx = line.match(SPEC_PREFIX);
    if (pfx) {
      setStands(expandStands(pfx[1]));
      pushBuf(line.slice(pfx[0].length).trim());
      continue;
    }

    if (SPEC_LINE.test(line)) {
      if (DANGLING.test(line)) { pendingHeader = line; continue; }
      setStands(expandStands(line));
      continue;
    }

    pushBuf(line);
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
