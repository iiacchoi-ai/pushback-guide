import { test } from "node:test";
import assert from "node:assert/strict";
import { normPhr, matchHandbook } from "../match.mjs";

test("normPhr: 대소문자·구두점·(number)·gate No N 제거, Romeo→R", () => {
  assert.equal(normPhr("Pushback Approved to Point 1"), "to point 1");
  assert.equal(normPhr("Pushback approved to face south abeam gate(number)"), "to face south abeam gate");
  assert.equal(normPhr("Pushback Approved to Face South abeam Gate No 7, 8"), "to face south abeam gate");
  assert.equal(normPhr("Pushback approved to spot 53Romeo"), "to spot 53r");
  assert.equal(normPhr("Pushback approved to spot 53 Romeo"), "to spot 53r");
  assert.equal(normPhr("Pushback Approved to Face South abeam Gate No"), "to face south abeam gate");
  // AIP 쪽 phraseology 는 "(number)" 자리를 대괄호로 감싸기도 한다([abeam gate (number)]) — 소괄호와
  // 동일하게 제거해야 "Gate No." 로 적힌 핸드북 제목과 일치한다
  assert.equal(normPhr("Pushback approved to face south on R2 [abeam gate (number)]"), "to face south on r2 abeam gate");
});

const HB = {
  "7": [["Pushback Approved to Face North", "북쪽"], ["Pushback Approved to Face South abeam Gate No 6", "남쪽"], ["Pushback Approved to Stand 825", "825"]],
  "9": [["MRO 이동절차", "엠알오"]],
};
const ROWS = [
  { stands: ["7"], proc: "The aircraft shall be pushed back onto taxilane R1 to face north.", phr: "Pushback approved to face north", page: 30 },
  { stands: ["7"], proc: "The aircraft shall be pushed back to face south along taxilane R1 until the specific gate position.", phr: "Pushback approved to face south abeam gate(number)", page: 30 },
];

test("matchHandbook: (주기장, 정규화 phraseology) 일치 → aip 항목, 불일치 → unmatched", () => {
  const { dict, unmatched, stats } = matchHandbook(HB, ROWS, "AMDT 7/26", {});
  assert.equal(dict["7:0"].en, ROWS[0].proc);
  assert.equal(dict["7:0"].src, "aip");
  assert.equal(dict["7:0"].aip, "AMDT 7/26");
  assert.equal(dict["7:0"].status, "review");
  assert.match(dict["7:0"].hash, /^[0-9a-f]{6}$/);
  assert.equal(dict["7:1"].en, ROWS[1].proc);
  assert.equal(dict["7:2"], undefined);
  assert.deepEqual(unmatched.map(u => u.key), ["7:2", "9:0"]);
  assert.equal(unmatched[0].candidates.length, 2);        // 같은 주기장의 AIP 문장을 후보로 보여 준다
  assert.deepEqual(stats, { total: 4, matched: 2 });
});

test("matchHandbook: 검수 완료(ok)이고 해시가 같은 기존 항목은 유지", () => {
  const first = matchHandbook(HB, ROWS, "AMDT 7/26", {}).dict;
  const prev = { "7:0": { ...first["7:0"], en: "edited by reviewer", status: "ok" } };
  const { dict } = matchHandbook(HB, ROWS, "AMDT 7/26", prev);
  assert.equal(dict["7:0"].en, "edited by reviewer");
  assert.equal(dict["7:0"].status, "ok");
});

// 501/511/224 같은 qualifier 블록: 접미사(224L) 주기장은 자기 몫의 행이 있어도 그 phraseology 가
// 안 맞으면 bare(224) 주기장의 행으로 한 번 더 시도한다. 역방향(bare → 접미사)은 없다.
const HB_QUAL = {
  "224L": [["Pushback Approved to Point 5", "ko1"]],
  "224": [["Pushback Approved to Point 9", "ko2"]],
};
const ROWS_QUAL = [
  { stands: ["224L"], proc: "PROC_224L_OWN (point 1)", phr: "Pushback approved to point 1", page: 1 },
  { stands: ["224"], proc: "PROC_224_BARE (point 5)", phr: "Pushback approved to point 5", page: 1 },
  { stands: ["224L"], proc: "PROC_224L_FOR_9 (point 9)", phr: "Pushback approved to point 9", page: 1 },
];

test("matchHandbook: 접미사 주기장은 자기 후보에 없으면 bare 주기장 후보로 fallback (역방향은 없음)", () => {
  const { dict, unmatched } = matchHandbook(HB_QUAL, ROWS_QUAL, "AMDT 7/26", {});
  // 224L:0 은 자기 몫 후보("point 1","point 9")에는 없고, bare 224 의 "point 5" 로만 일치한다
  assert.equal(dict["224L:0"].en, "PROC_224_BARE (point 5)");
  // 224:0 은 bare 자신의 후보("point 5")에는 없고, 224L 의 "point 9" 는 (역방향 fallback 이 없으므로) 시도되지 않아 미매칭
  assert.equal(dict["224:0"], undefined);
  assert.ok(unmatched.some(u => u.key === "224:0"));
});
