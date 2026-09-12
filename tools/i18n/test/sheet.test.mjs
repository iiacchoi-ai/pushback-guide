import { test } from "node:test";
import assert from "node:assert/strict";
import { toCsv, fromCsv, applySheet, serializeWithHeader } from "../sheet-import.mjs";

test("toCsv/fromCsv 왕복: 쉼표·따옴표·줄바꿈·한글", () => {
  const rows = [{ key: "7:0", ko: "a, \"b\"\n* 주의", en: "x" }, { key: "9:1", ko: "가", en: "" }];
  const csv = toCsv(rows, ["key", "ko", "en"]);
  assert.ok(csv.startsWith("﻿key,ko,en\r\n"));
  assert.deepEqual(fromCsv(csv), rows);
});

test("applySheet: en·title_en·status·src 를 반영하고 hash 는 원문에서 다시 계산, 빈 en 은 건너뜀", () => {
  const HB = { "7": [["T0", "본문0"], ["T1", "본문1"]] };
  const prev = { "7:0": { en: "old", src: "aip", aip: "AMDT 7/26", hash: "x", status: "review" } };
  const sheet = [
    { key: "7:0", en: "new", title_en: "", src: "aip", aip: "AMDT 7/26", status: "ok", note: "" },
    { key: "7:1", en: "translated", title_en: "Title EN", src: "tr", aip: "", status: "review", note: "" },
    { key: "7:9", en: "orphan", src: "tr", status: "ok" },
  ];
  const { dict, skipped } = applySheet(HB, prev, sheet);
  assert.equal(dict["7:0"].en, "new"); assert.equal(dict["7:0"].status, "ok"); assert.match(dict["7:0"].hash, /^[0-9a-f]{6}$/);
  assert.equal(dict["7:1"].title, "Title EN"); assert.equal(dict["7:1"].src, "tr"); assert.equal(dict["7:1"].aip, undefined);
  assert.equal(dict["7:9"], undefined);
  assert.deepEqual(skipped, ["7:9"]);
});

test("serializeWithHeader: `const NAME` 이전 상단 주석(파일 헤더)을 보존하고 CRLF 를 유지 (--ui 반영 시 헤더 유실 회귀 방지)", () => {
  const existing = "// 헤더 주석 1줄\r\n// 헤더 주석 2줄\r\nconst UI_EN = {\r\n  \"old\": \"old en\",\r\n};\r\n";
  const dict = { "old": "new en", "added": "added en" };
  const out = serializeWithHeader("UI_EN", existing, dict);
  assert.match(out, /^\/\/ 헤더 주석 1줄\r\n\/\/ 헤더 주석 2줄\r\n/);
  assert.ok(out.includes("const UI_EN = {\r\n"));
  assert.ok(out.includes('"old": "new en"'));
  assert.ok(out.includes('"added": "added en"'));
  assert.ok(!out.includes("\n\n") || out.split("\r\n").length > 1); // CRLF 유지 확인용 보조 체크
  assert.ok(out.includes("\r\n"));
  assert.ok(!/[^\r]\n/.test(out)); // LF 단독 개행이 섞이지 않았는지 (CRLF 로만 구성)
});
