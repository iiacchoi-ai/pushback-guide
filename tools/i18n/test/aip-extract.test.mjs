import { test } from "node:test";
import assert from "node:assert/strict";
import { parseAipText, expandStands } from "../aip-extract.mjs";

test("expandStands: 단일·and·쉼표·to 범위", () => {
  assert.deepEqual(expandStands("3"), ["3"]);
  assert.deepEqual(expandStands("1 and 2"), ["1", "2"]);
  assert.deepEqual(expandStands("10, 11 and 12"), ["10", "11", "12"]);
  assert.deepEqual(expandStands("615 to 616"), ["615", "616"]);
  assert.deepEqual(expandStands("682, 683"), ["682", "683"]);
  assert.deepEqual(expandStands("224L"), ["224L"]);
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
