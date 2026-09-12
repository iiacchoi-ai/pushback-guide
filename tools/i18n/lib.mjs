// tools/i18n/lib.mjs — 도구 공용 유틸
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

// `const NAME = {...};` 형태의 전역 스크립트(gates.js, i18n/*.en.js)에서 NAME 값을 꺼낸다
export function loadGlobal(file, name) {
  const src = fs.readFileSync(file, "utf8");
  const ctx = {};
  vm.runInNewContext(src + `\n;globalThis.__out = ${name};`, ctx, { filename: file });
  return ctx.__out;
}

// 사전 객체를 사람이 diff 하기 좋은 형태로 직렬화 (키 정렬, 항목당 한 줄)
export function serializeDict(name, header, obj, keyOrder) {
  const keys = keyOrder || Object.keys(obj);
  const lines = keys.map(k => `  ${JSON.stringify(k)}: ${JSON.stringify(obj[k])},`);
  return `${header}\nconst ${name} = {\n${lines.join("\n")}\n};\n`;
}
