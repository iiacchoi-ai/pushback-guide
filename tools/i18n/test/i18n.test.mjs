import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);

// 브라우저 전역을 흉내 낸다. i18n.js 는 localStorage·UI_EN·HB_EN·HANDBOOK 을 전역에서 찾는다.
function fresh(lang, { UI_EN = {}, HB_EN = {}, HANDBOOK = {} } = {}) {
  const store = new Map(lang ? [["lang", lang]] : []);
  globalThis.localStorage = {
    getItem: k => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
  };
  globalThis.UI_EN = UI_EN; globalThis.HB_EN = HB_EN; globalThis.HANDBOOK = HANDBOOK;
  delete require.cache[require.resolve("../../../i18n/i18n.js")];
  return require("../../../i18n/i18n.js");
}

test("getLang 기본값은 ko, setLang 은 저장", () => {
  const i = fresh(null);
  assert.equal(i.getLang(), "ko");
  i.setLang("en");
  assert.equal(i.getLang(), "en");
});

test("t: ko 모드는 원문, en 모드는 사전, 미등록은 원문", () => {
  const ko = fresh("ko", { UI_EN: { "주의사항": "Cautions" } });
  assert.equal(ko.t("주의사항"), "주의사항");
  const en = fresh("en", { UI_EN: { "주의사항": "Cautions" } });
  assert.equal(en.t("주의사항"), "Cautions");
  assert.equal(en.t("없는 문구"), "없는 문구");
});

test("tf: {key} 치환, 같은 키 여러 번", () => {
  const en = fresh("en", { UI_EN: { "다운로드 {done}/{total}": "Downloading {done}/{total}" } });
  assert.equal(en.tf("다운로드 {done}/{total}", { done: 3, total: 10 }), "Downloading 3/10");
  const ko = fresh("ko");
  assert.equal(ko.tf("{n}번 {n}", { n: 7 }), "7번 7");
});

test("hbHash: 6자리 hex, 결정적, 원문 변경 시 달라짐", () => {
  const i = fresh("ko");
  assert.match(i.hbHash("가나다"), /^[0-9a-f]{6}$/);
  assert.equal(i.hbHash("가나다"), i.hbHash("가나다"));
  assert.notEqual(i.hbHash("가나다"), i.hbHash("가나다."));
});

test("hb: ko 모드는 원문, en 모드는 해시 일치 시 영문", () => {
  const HANDBOOK = { "7": [["Pushback Approved to Face North", "항공기 기수방향이 북쪽"]] };
  const ko = fresh("ko", { HANDBOOK });
  assert.deepEqual(ko.hb("7", 0), { title: "Pushback Approved to Face North", body: "항공기 기수방향이 북쪽", ko: false });
  const h = ko.hbHash("항공기 기수방향이 북쪽");
  const en = fresh("en", { HANDBOOK, HB_EN: { "7:0": { en: "The aircraft shall be pushed back onto taxilane R1 to face north.", src: "aip", hash: h } } });
  assert.deepEqual(en.hb("7", 0), { title: "Pushback Approved to Face North", body: "The aircraft shall be pushed back onto taxilane R1 to face north.", ko: false });
});

test("hb: en 모드에서 사전 없음·해시 불일치·title 재정의", () => {
  const HANDBOOK = { "9": [["MRO 이동절차", "본문"], ["T", "본문2"]] };
  const en = fresh("en", { HANDBOOK, HB_EN: {
    "9:0": { en: "MRO towing procedure body", title: "MRO towing procedure", src: "tr", hash: fresh("ko").hbHash("본문") },
    "9:1": { en: "stale", src: "tr", hash: "000000" },
  } });
  assert.deepEqual(en.hb("9", 0), { title: "MRO towing procedure", body: "MRO towing procedure body", ko: false });
  assert.deepEqual(en.hb("9", 1), { title: "T", body: "본문2", ko: true });
  assert.deepEqual(en.hb("9", 5), { title: "", body: "", ko: true });
});

test("kwRegex ko 모드: 대소문자 구분, 긴 키 우선, 단어 경계", () => {
  const i = fresh("ko");
  const re = i.kwRegex(["North", "North on R6"]);
  assert.equal(re.flags, "g");
  assert.deepEqual("Face North on R6 now".match(re).map(s => s.trim()), ["North on R6"]);
  assert.equal("Northern".match(re), null);
});

test("kwRegex en 모드: 대소문자 무시, Point N 은 spot N 도 매칭", () => {
  const i = fresh("en");
  const re = i.kwRegex(["Point 1", "R1"]);
  assert.equal(re.flags, "gi");
  const hits = [...("until its nosewheel is at spot 1 on taxilane r1").matchAll(re)].map(m => m[2]);
  assert.deepEqual(hits, ["spot 1", "r1"]);
});

test("kwCanon: 매칭 문자열을 원래 키로", () => {
  const i = fresh("en");
  const keys = ["Point 1", "R1", "Face South"];
  assert.equal(i.kwCanon(keys, "spot 1"), "Point 1");
  assert.equal(i.kwCanon(keys, "r1"), "R1");
  assert.equal(i.kwCanon(keys, "Face South"), "Face South");
  assert.equal(i.kwCanon(keys, "nothing"), null);
});
