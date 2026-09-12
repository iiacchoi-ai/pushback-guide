import { test } from "node:test";
import assert from "node:assert/strict";
import { normPhr, matchHandbook } from "../match.mjs";

test("normPhr: 대소문자·구두점·(number)·gate No N 제거, Romeo→R", () => {
  assert.equal(normPhr("Pushback Approved to Point 1"), "to point 1");
  assert.equal(normPhr("Pushback approved to face south abeam gate(number)"), "to face south abeam gate");
  assert.equal(normPhr("Pushback Approved to Face South abeam Gate No 7, 8"), "to face south abeam gate");
  assert.equal(normPhr("Pushback approved to spot 53Romeo"), "to spot 53r");
  assert.equal(normPhr("Pushback approved to spot 53 Romeo"), "to spot 53r");
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
