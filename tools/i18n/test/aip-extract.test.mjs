import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseAipText, expandStands } from "../aip-extract.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test("expandStands: 단일·and·쉼표·to 범위", () => {
  assert.deepEqual(expandStands("3"), ["3"]);
  assert.deepEqual(expandStands("1 and 2"), ["1", "2"]);
  assert.deepEqual(expandStands("10, 11 and 12"), ["10", "11", "12"]);
  assert.deepEqual(expandStands("615 to 616"), ["615", "616"]);
  assert.deepEqual(expandStands("682, 683"), ["682", "683"]);
  assert.deepEqual(expandStands("224L"), ["224L"]);
});

test("expandStands: to 범위의 L/R 접미사 — 같으면 유지, 다르면 둘 다", () => {
  assert.deepEqual(expandStands("236L to 238L"), ["236L", "237L", "238L"]);
  assert.deepEqual(expandStands("236L to 238R"), ["236L", "236R", "237L", "237R", "238L", "238R"]);
});

test("expandStands: A/B 접미사, ∼ 범위(슬래시 쌍)", () => {
  assert.deepEqual(expandStands("309A/B"), ["309A", "309B"]);
  assert.deepEqual(expandStands("309A/B, 310A/B, 311A/B"), ["309A", "309B", "310A", "310B", "311A", "311B"]);
  assert.deepEqual(expandStands("266R/L∼268R/L"), ["266R", "266L", "267R", "267L", "268R", "268L"]);
  assert.deepEqual(expandStands("341, 341R/L"), ["341", "341R", "341L"]);
});

const SAMPLE = `===== PAGE 30 =====
A I P
Republic of Korea
RKSI AD 2 - 18 - 1
20 OCT 2022
Aircraft Stands Pushback Procedures Phraseology
Apron 1
1 and 2
The aircraft shall be pushed back to face north along blue line
until its nosewheel is at spot 1.
Pushback approved to point 1
6
The aircraft shall be pushed back onto taxilane R1 to face north. Pushback approved to face north
The aircraft shall be pushed back to face south along taxilane
R1 until the specific gate position.
Pushback approved to face south
abeam gate(number)
7
The aircraft shall be pushed back onto taxilane R1 to face north. Pushback approved to face north
OFFICE OF CIVIL AVIATION AIP AMDT 11/22
`;

test("parseAipText: 줄바꿈 이어붙이기, 같은 줄 phraseology, 두 줄 phraseology", () => {
  const rows = parseAipText(SAMPLE);
  assert.deepEqual(rows.map(r => [r.stands, r.proc, r.phr, r.page]), [
    [["1", "2"], "The aircraft shall be pushed back to face north along blue line until its nosewheel is at spot 1.", "Pushback approved to point 1", 30],
    [["6"], "The aircraft shall be pushed back onto taxilane R1 to face north.", "Pushback approved to face north", 30],
    [["6"], "The aircraft shall be pushed back to face south along taxilane R1 until the specific gate position.", "Pushback approved to face south abeam gate(number)", 30],
    [["7"], "The aircraft shall be pushed back onto taxilane R1 to face north.", "Pushback approved to face north", 30],
  ]);
});

test("parseAipText: 괄호 한정자는 stands 에 붙는다", () => {
  const rows = parseAipText(`===== PAGE 38 =====\n641 to 652\n(652R/L) The aircraft shall be pushed back onto taxilane D9 to face west. Pushback approved\n`);
  assert.equal(rows.length, 1);
  assert.deepEqual(rows[0].stands, ["652R", "652L"]);
  assert.equal(rows[0].phr, "Pushback approved");
});

test("parseAipText: phraseology 안의 '단어(숫자)' 뒤에 오는 다음 procedure 도 분리된다", () => {
  // 실제 AIP(35p) 에서 "Pushback approved to point 31(32) The aircraft shall …" 처럼
  // phraseology 가 괄호 숫자로 끝나고 바로 다음 procedure 가 이어 붙는 경우가 있다.
  // 이는 "(652R/L) The aircraft shall" 같은 stand 괄호 한정자와 다르므로 분리되어야 한다.
  const rows = parseAipText(`===== PAGE 35 =====\n242\nThe aircraft shall be pushed back to face south and then towed forward until its nosewheel is at spot 31 (or 32).\nPushback approved to point 31(32)\nThe aircraft shall be pushed back to face west until its nosewheel is at spot 33.\nPushback approved to point 33\n`);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].phr, "Pushback approved to point 31(32)");
  assert.equal(rows[1].proc, "The aircraft shall be pushed back to face west until its nosewheel is at spot 33.");
  assert.equal(rows[1].phr, "Pushback approved to point 33");
});

test("parseAipText: 헤더+procedure 같은 줄에서 뒤에 붙는 phraseology 줄바꿈(815(814))도 새 헤더로 오인하지 않는다", () => {
  const rows = parseAipText(`===== PAGE 36 =====\n256\nThe aircraft shall be pushed back onto the stand 815 (or 814) to \nface east.\nPushback approved to stand \n815(814)\n257\n`);
  assert.equal(rows.length, 1);
  assert.deepEqual(rows[0].stands, ["256"]);
  assert.equal(rows[0].phr, "Pushback approved to stand 815(814)");
});

test("parseAipText: 'Pilot shall …' remark 은 procedure/phraseology 쌍이 아니므로 건너뛰고 인접 행을 오염시키지 않는다", () => {
  // 한 줄로 끝나는 형태("… deicing. -")
  const oneLine = parseAipText(`===== PAGE 39 =====\n551 to 554\nThe aircraft shall be pushed back onto taxilane R4 to face north. Pushback approved to face north\nPilot shall taxi on stand when assigned for deicing. -\n557\n`);
  assert.equal(oneLine.length, 1);
  assert.equal(oneLine[0].phr, "Pushback approved to face north");

  // 여러 줄에 걸쳐 "-" 로 끝나는 형태
  const multiLine = parseAipText(`===== PAGE 37 =====\n361\nPilot shall request start engine then taxi on stand except following \naircraft : A320 series, B737 series and A220 series.\n-\nThe aircraft shall be pushed back onto taxilane R11 to face east. Pushback approved to face east\n`);
  assert.equal(multiLine.length, 1);
  assert.equal(multiLine[0].proc, "The aircraft shall be pushed back onto taxilane R11 to face east.");
  assert.equal(multiLine[0].phr, "Pushback approved to face east");
});

test("parseAipText: 헤더와 procedure 가 같은 줄에 붙은 경우(332 The aircraft shall …)", () => {
  const rows = parseAipText(`===== PAGE 33 =====\n332 The aircraft shall be pushed back onto taxilane RG to face west. Pushback approved to face west\n341, 341R/L The aircraft shall be pushed back onto taxilane RG to face east. Pushback approved to face east\n`);
  assert.equal(rows.length, 2);
  assert.deepEqual(rows[0].stands, ["332"]);
  assert.equal(rows[0].phr, "Pushback approved to face west");
  assert.deepEqual(rows[1].stands, ["341", "341R", "341L"]);
  assert.equal(rows[1].phr, "Pushback approved to face east");
});

test("parseAipText: 여러 줄에 걸쳐 쉼표로 이어지는 주기장 목록(105…129)", () => {
  const rows = parseAipText(`===== PAGE 33 =====\n105, 107, \n109, 111, 113,\n115, 117, 119, \n121, 123, 125,\n127 and 129\nThe aircraft shall be pushed back onto taxilane AS to face east. Pushback approved to face east\n`);
  assert.equal(rows.length, 1);
  assert.deepEqual(rows[0].stands, ["105", "107", "109", "111", "113", "115", "117", "119", "121", "123", "125", "127", "129"]);
});

test("parseAipText: 헤더 뒤 별도 줄의 괄호 한정자 — 단일 접미사(224L)", () => {
  const rows = parseAipText(`===== PAGE 34 =====\n219 to 222\n(224L)\nThe aircraft shall be pushed back onto taxilane R4 to face south. Pushback approved to face south\nThe aircraft shall be pushed back onto taxilane R4 to face north. Pushback approved to face north\n`);
  assert.equal(rows.length, 2);
  assert.deepEqual(rows[0].stands, ["224L"]);
  assert.deepEqual(rows[1].stands, ["219", "220", "221", "222"]);
});

test("parseAipText: 여러 줄에 걸친 괄호 한정자 목록(342R/L, 343R/L, 345R, 347R, 352R/L)", () => {
  // "345R, 347R," 같은 중간 줄만 떼어 보면 그 자체로 유효한 주기장 목록 조각처럼 보이므로,
  // 괄호가 아직 안 닫힌 상태에서는 헤더 판정을 하지 않고 그대로 buf 에 쌓아야 한다.
  const rows = parseAipText(`===== PAGE 33 =====\n342 to 352\n(342R/L, 343R/L, \n345R, 347R, \n352R/L)\nThe aircraft shall be pushed back onto taxilane RG to face east. Pushback approved to face east\nThe aircraft shall be pushed back onto taxilane RG to face west. Pushback approved to face west\n`);
  assert.equal(rows.length, 2);
  assert.deepEqual(rows[0].stands, ["342R", "342L", "343R", "343L", "345R", "347R", "352R", "352L"]);
  assert.deepEqual(rows[1].stands, ["342", "343", "344", "345", "346", "347", "348", "349", "350", "351", "352"]);
});

test("parseAipText: 연속된 두 헤더가 procedure 없이 바로 이어지면 stands 를 합친다(601 to 614 / 621 to 634)", () => {
  const rows = parseAipText(`===== PAGE 39 =====\n601 to 614\n621 to 634\nThe aircraft shall be pushed back onto taxilane D7 or D8 to face west. Pushback approved\n`);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].stands.length, 28);
  assert.equal(rows[0].stands[0], "601");
  assert.equal(rows[0].stands.at(-1), "634");
});

test("parseAipText 회귀: 실제 aip-text.txt 전체를 파싱하면 phr 이 잔여 주기장 번호로 오염되지 않는다", () => {
  const textPath = path.join(__dirname, "..", "aip-text.txt");
  if (!fs.existsSync(textPath)) return; // 생성물이 없으면(아직 PDF 미실행) 건너뜀
  const rows = parseAipText(fs.readFileSync(textPath, "utf8"));
  // 오염 신호 1: phr 끝에 쉼표로 시작하는 주기장 번호(목록 잔재)가 남아있다.
  //   정상 phraseology 는 쉼표를 쓰지 않으므로, ", 341R/L" 나 ", 125," 처럼 쉼표 뒤에
  //   숫자(+L/R/A/B, 슬래시 쌍 포함)가 남아있으면 이전 헤더가 잘못 흡수된 것이다.
  const TAIL_LIST = /,\s*\d{1,3}[LRAB]?(?:\/[LRAB])?,?\s*$/;
  // 오염 신호 2: phr 이 "point/stand/spot N" 이나 taxilane 참조(R4, D9 처럼 글자 바로 뒤 숫자)가
  //   아닌데 끝이 순수 주기장 코드(숫자[+L/R])로 끝난다 — 예: "Pushback approved to face west 332".
  const bareTail = phr => {
    const m = phr.match(/(\d{1,3}[LRAB]?)\s*$/);
    if (!m) return false;
    const before = phr.slice(0, m.index);
    if (/(?:point|stand|spot)\s*$/i.test(before)) return false; // "point 58" 류는 정상
    if (/[A-Za-z]$/.test(before)) return false; // "on R4", "onto D9" 처럼 글자 바로 뒤 숫자(taxilane) 는 정상
    return true;
  };
  const bad = rows.filter(r => TAIL_LIST.test(r.phr) || bareTail(r.phr));
  assert.deepEqual(bad.map(r => ({ stands: r.stands, phr: r.phr })), []);
});

test("parseAipText 회귀: 실제 aip-text.txt 에서 지정된 주기장 코드가 모두 최소 1행씩 나온다", () => {
  const textPath = path.join(__dirname, "..", "aip-text.txt");
  if (!fs.existsSync(textPath)) return;
  const rows = parseAipText(fs.readFileSync(textPath, "utf8"));
  const allStands = new Set(rows.flatMap(r => r.stands));
  const required = ["332", "341R", "353L", "208R", "290R", "105", "125", "224L", "275R", "309A", "345R", "266L", "501L", "511R", "558"];
  const missing = required.filter(s => !allStands.has(s));
  assert.deepEqual(missing, []);
});
