# 영문판 (KO/ENG 전환) 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 밀어요 PWA 에 헤더 KO/ENG 버튼을 추가하고, UI 문구와 주기장별 절차 본문을 영문으로 표시한다. 절차 영문은 AIP RKSI AD 2 표의 공식 문장을 우선 사용한다.

**Architecture:** 언어 상태·사전 조회·키워드 정규식은 새 파일 `i18n/i18n.js` 에 두고(node 로 단위 테스트 가능), `index.html` 은 한글 리터럴을 `t()`/`tf()` 로 감싸고 절차 본문을 `hb()` 로 조회하도록 최소 수정한다. 사전은 `i18n/ui.en.js`(한글 원문이 키), `i18n/handbook.en.js`(`"주기장:순번"` 키, 출처·해시·검수 상태)로 분리한다. `tools/i18n/` 의 node 스크립트가 AIP 추출 → 핸드북 매칭 → 검수 시트 내보내기·반영 → 커버리지 검사를 담당한다.

**Tech Stack:** 순수 HTML/JS PWA (빌드 없음), Node 24 (`node --test`), Python 3.13 + pypdf (AIP PDF 텍스트 추출만), PowerShell 5.1 + 헤드리스 Edge (런타임 확인).

**Spec:** `docs/superpowers/specs/2026-09-12-english-version-design.md`

## Global Constraints

- main 에 직접 커밋하지 않는다. 브랜치 `feature/english` 를 main 에서 분기해 작업하고, Phase 3 검수 완료 전에는 병합하지 않는다 (spec 8절).
- UI 문구·커밋 메시지·문서·코드 주석은 한국어. 영문은 사전 파일과 사용자에게 보이는 렌더 결과에만 존재한다.
- 커밋 메시지는 한국어 한 줄 요약. 브랜치 안 중간 커밋에는 `(vNNN)` 을 붙이지 않는다.
- 안전 고지 문구("작업자 단말 위치이며 항공기 위치가 아닙니다", "(시범)")는 삭제·완화 없이 영문에서도 같은 의미로 유지한다.
- 영문 라벨에 instruction / control 표현을 쓰지 않는다. AIP 직접 인용은 예외. "관제 지시별 후방견인 절차" 는 "Pushback procedures by phraseology" (spec 6절).
- `gates.js`, `주기장별절차/`, `img/` 는 이 작업에서 변경하지 않는다. `git diff --stat` 으로 확인한다.
- 배포 시 `index.html` 의 `C_VER` 과 `sw.js` 의 `C`(`pushback-vNNN`) 를 같은 번호로 함께 올린다. 번호는 병합 직전 main 에서 읽는다 (`grep -n "C_VER=\|const C=" index.html sw.js`). 이 계획 작성 시점의 main 은 v199.
- 이용집계(`#stats`, 관리자 전용)와 기준점 측정 모드(관리자 전용) 문구는 번역 대상에서 제외한다. 코드에 `/* i18n-skip-start */` … `/* i18n-skip-end */` 표식을 두어 커버리지 검사에서 뺀다.
- 한글이 든 데이터 블록(ZONE_GATES, FILLED, PATH_ANIM 등)은 `/* i18n-data-start */` … `/* i18n-data-end */` 로 감싼다. 안의 한글 문자열은 렌더 시점에 `t()` 로 감싸고, 커버리지 검사는 그 문자열이 모두 `UI_EN` 키인지 확인한다.
- 헤드리스 Edge 경로: `C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe`. 로컬 서버는 `serve.ps1 -NoBrowser` (포트 8765). Edge 는 반드시 `--user-data-dir` 를 지정한다 (`tools/review/check.ps1` 참고).
- 새 셸에서 node 가 PATH 에 없으면 `$env:Path=[Environment]::GetEnvironmentVariable('Path','Machine')+';'+[Environment]::GetEnvironmentVariable('Path','User')` 를 먼저 실행한다.

---

## 파일 구조

| 파일 | 역할 | 작업 |
|---|---|---|
| `i18n/i18n.js` | 언어 상태(`getLang/setLang`), `t/tf`, `hb/hbHash`, `kwRegex/kwCanon`. 브라우저 전역 + CommonJS export | 신규 (Task 1) |
| `i18n/ui.en.js` | `const UI_EN = {한글 원문: 영문}` | 신규 (Task 2, 3에서 완성) |
| `i18n/handbook.en.js` | `const HB_EN = {"주기장:순번": {en, title?, src, aip?, hash, status}}` | 신규 (Task 6 초안, Task 8 반영) |
| `i18n/glossary.md` | 용어집 (spec 6절 표 + 잔여 번역 규칙) | 신규 (Task 8) |
| `index.html` | 언어 버튼, `applyLang`, `t()` 감싸기, `hb()` 사용, KO 배지, `colorize` 수정, 스크립트 로드 | 수정 (Task 2, 3, 4) |
| `sw.js` | SHELL 프리캐시에 i18n 3파일 추가 | 수정 (Task 2) |
| `tools/i18n/lib.mjs` | 전역 스크립트 로더, 사전 직렬화, 공용 유틸 | 신규 (Task 5) |
| `tools/i18n/aip-pdf2txt.py` | AIP PDF → 텍스트 덤프 (pypdf) | 신규 (Task 5) |
| `tools/i18n/aip-extract.mjs` | 텍스트 덤프 → `aip-rows.json` | 신규 (Task 5) |
| `tools/i18n/match.mjs` | HANDBOOK × AIP 매칭 → `handbook.en.js` 초안, `unmatched.json`, 매칭률 | 신규 (Task 6) |
| `tools/i18n/sheet-export.mjs` / `sheet-import.mjs` | 검수 시트 CSV 내보내기·반영 | 신규 (Task 7) |
| `tools/i18n/coverage.mjs` | 미등록 UI 문구, 해시 불일치, 미검수, SVG 한글 라벨 보고 | 신규 (Task 3) |
| `tools/i18n/test/*.test.mjs` | `node --test` 단위 테스트 | 신규 (Task 1, 5, 6, 7) |
| `tools/review/shot.html` | `lang` 쿼리 추가 | 수정 (Task 2) |

테스트 실행: `node --test tools/i18n/test/` (프로젝트 루트에서).

---

### Task 1: i18n 런타임 `i18n/i18n.js`

**Files:**
- Create: `i18n/i18n.js`
- Test: `tools/i18n/test/i18n.test.mjs`

**Interfaces:**
- Produces (브라우저 전역, CommonJS export 동일):
  - `getLang(): "ko"|"en"` — `localStorage "lang"` 읽기, 기본 `"ko"`
  - `setLang(l: "ko"|"en"): void` — 저장만 함 (화면 갱신은 Task 2 의 `applyLang`)
  - `t(s: string): string` — `UI_EN[s]` 또는 원문
  - `tf(s: string, vars: object): string` — `t(s)` 후 `{key}` 치환
  - `hbHash(s: string): string` — djb2 → 6자리 hex
  - `hb(gid: string, i: number): {title: string, body: string, ko: boolean}` — 영문 모드에서 `HB_EN` 조회, 없거나 해시 불일치면 `ko: true` 와 한글 원문
  - `kwRegex(keys: string[]): RegExp` — 긴 키 우선, 영문 모드에서 `gi` + `Point N ↔ spot N` 별칭
  - `kwCanon(keys: string[], matched: string): string` — 매칭된 문자열을 원래 키로 되돌림

- [ ] **Step 1: 브랜치 생성**

```bash
git checkout main && git pull --ff-only && git checkout -b feature/english
```

- [ ] **Step 2: 실패하는 테스트 작성** — `tools/i18n/test/i18n.test.mjs`

```js
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
```

- [ ] **Step 3: 테스트 실행, 실패 확인**

Run: `node --test tools/i18n/test/`
Expected: FAIL — `Cannot find module '.../i18n/i18n.js'`

- [ ] **Step 4: 구현** — `i18n/i18n.js`

```js
// i18n/i18n.js — 언어 상태·사전 조회·키워드 정규식. 브라우저 전역 + node(CommonJS) 겸용
// 사전: UI_EN (i18n/ui.en.js), HB_EN (i18n/handbook.en.js). 원문: HANDBOOK (gates.js)
(function (root) {
  const LANGS = ["ko", "en"];

  function getLang() {
    try { const v = root.localStorage.getItem("lang"); if (LANGS.includes(v)) return v; } catch (e) {}
    return "ko";
  }
  function setLang(l) {
    if (!LANGS.includes(l)) return;
    try { root.localStorage.setItem("lang", l); } catch (e) {}
  }

  // UI 사전: 한글 원문이 곧 키. 미등록이면 원문 그대로 (화면이 깨지지 않게)
  function t(s) {
    if (getLang() !== "en") return s;
    const d = (typeof root.UI_EN !== "undefined") ? root.UI_EN : {};
    return Object.prototype.hasOwnProperty.call(d, s) ? d[s] : s;
  }
  function tf(s, vars) {
    let r = t(s);
    for (const k in vars) r = r.split("{" + k + "}").join(String(vars[k]));
    return r;
  }

  // 한글 원문 해시 (djb2). 원문이 바뀌면 사전 항목이 무효가 되도록 한다
  function hbHash(s) {
    let h = 5381;
    for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
    return h.toString(16).padStart(6, "0").slice(-6);
  }

  // 절차 본문 조회. 영문 모드에서 사전에 없거나 원문이 바뀌었으면 한글 + ko:true
  function hb(gid, i) {
    const HB = (typeof root.HANDBOOK !== "undefined") ? root.HANDBOOK : {};
    const p = (HB[gid] || [])[i] || ["", ""];
    const title = String(p[0] || ""), body = String(p[1] || "");
    if (getLang() !== "en") return { title, body, ko: false };
    const D = (typeof root.HB_EN !== "undefined") ? root.HB_EN : {};
    const e = D[gid + ":" + i];
    if (!e || !e.en || e.hash !== hbHash(body)) return { title, body, ko: true };
    return { title: e.title || title, body: e.en, ko: false };
  }

  // 키워드 정규식. 긴 키를 앞에 두어 한 번만 훑는다 (index.html colorize 의 기존 규칙)
  // 영문 모드: 대소문자 무시, "Point N" 키는 AIP 표기 "spot N" 도 매칭
  const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const POINT = /^point (\d+[a-z]?)$/i;
  function kwRegex(keys) {
    const en = getLang() === "en";
    const sorted = keys.slice().sort((a, b) => b.length - a.length);
    const alts = sorted.map(k => {
      const m = en && k.match(POINT);
      return m ? "(?:point|spot) " + esc(m[1]) : esc(k);
    });
    return new RegExp("(^|[^A-Za-z0-9])(" + alts.join("|") + ")(?![A-Za-z0-9])", en ? "gi" : "g");
  }
  function kwCanon(keys, matched) {
    const norm = s => String(s).toLowerCase().replace(/^spot /, "point ");
    const m = norm(matched);
    for (const k of keys) if (norm(k) === m) return k;
    return null;
  }

  const api = { getLang, setLang, t, tf, hbHash, hb, kwRegex, kwCanon };
  Object.assign(root, api);
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
```

- [ ] **Step 5: 테스트 실행, 통과 확인**

Run: `node --test tools/i18n/test/`
Expected: 9 tests pass

- [ ] **Step 6: 커밋**

```bash
git add i18n/i18n.js tools/i18n/test/i18n.test.mjs
git commit -m "영문판: i18n 런타임(언어 상태·사전 조회·키워드 정규식) 추가"
```

---

### Task 2: 헤더 KO/ENG 버튼, 언어 상태 적용, 프리캐시

**Files:**
- Modify: `index.html` — `<html lang>` (2행), `#themeBtn` CSS (63–66행), 히트영역 CSS (437–438행), 헤더 마크업 (467–473행), 홈 정적 문구 (480–520행), `THEME_LABEL` 사용 (668행), 스크립트 로드 (522행), 부팅 (4077–4079행)
- Modify: `sw.js` — 4행 `SHELL`
- Create: `i18n/ui.en.js` (헤더·홈·푸터 항목만. 나머지는 Task 3)
- Create: `i18n/handbook.en.js` (빈 사전. Task 6 에서 채움)
- Modify: `tools/review/shot.html` — 10–11행 (`lang` 쿼리)

**Interfaces:**
- Consumes: Task 1 의 `getLang/setLang/t`
- Produces: `applyLang()` (현재 화면 재렌더), `toggleLang()` (버튼 핸들러), 정적 문구 규약 `data-t="한글 원문"`

- [ ] **Step 1: 사전 파일 생성**

`i18n/ui.en.js`:

```js
// i18n/ui.en.js — UI 문구 사전. 키는 한글 원문 그대로 (index.html 의 t()/tf() 호출과 1:1)
// 매개변수는 {이름} 자리표시자. 검수 완료 항목만 main 에 올린다
const UI_EN = {
  "항공기 PUSHBACK 절차 안내": "Aircraft Pushback Guide",
  "자동": "Auto",
  "라이트": "Light",
  "다크": "Dark",
  "밀어요 로고": "App logo",
  "전체 도면 다운로드": "Download all drawings",
  "내 위치에서 가까운 주기장 찾기": "Find the nearest stand from my location",
  "게이트 번호 입력": "Enter stand number",
  "지우기": "Delete",
  "구역별 전체 보기 ▾": "Browse by area ▾",
  "구역별 목록 접기 ▴": "Collapse area list ▴",
  "인천국제공항공사": "Incheon International Airport Corp.",
  "운항관리처": "Flight Operations Division",
  "개정": "Rev.",
};
```

`i18n/handbook.en.js`:

```js
// i18n/handbook.en.js — 절차 사전. tools/i18n/match.mjs 와 sheet-import.mjs 가 생성·갱신한다. 손으로 고치지 않는다
// 키 "주기장:순번" (HANDBOOK[주기장][순번]). en: 영문 본문, title: 제목 재정의(선택), src: "aip"|"tr"|"aip+tr",
// aip: AIP AMDT 번호, hash: 한글 원문 해시(i18n.js hbHash), status: "review"|"ok"
const HB_EN = {};
```

- [ ] **Step 2: `index.html` 수정 — 스크립트 로드와 `<html lang>`**

522행 `<script src="gates.js"></script>` 바로 뒤에 추가:

```html
<script src="i18n/i18n.js"></script>
<script src="i18n/ui.en.js"></script>
<script src="i18n/handbook.en.js"></script>
```

2행은 그대로 `<html lang="ko">` 로 두고 `applyLang()` 이 런타임에 바꾼다.

- [ ] **Step 3: `index.html` 수정 — CSS**

63행 `#themeBtn{` 규칙을 다음으로 교체 (값은 기존 그대로, 선택자만 확장):

```css
  #langBtn,#themeBtn{
    background:var(--bg);border:1px solid var(--line);border-radius:18px;
    color:var(--ink-sub);padding:8px 14px;font-size:12px;font-weight:600;font-family:inherit;cursor:pointer;
  }
  #langBtn{margin-left:auto;}
  #themeBtn{margin-left:-4px;}   /* header gap 10px → 두 버튼 사이 6px */
```

437행 `#themeBtn,#preBtn,.zoneBtn,...{position:relative;}` 에 `#langBtn,` 을 앞에 추가. 438행 `#themeBtn::before,#preBtn::before{...}` 에 `#langBtn::before,` 을 앞에 추가 (탭 히트영역 확장 규칙 공유).

- [ ] **Step 4: `index.html` 수정 — 헤더·홈·푸터 마크업**

정적 문구는 `data-t="한글 원문"` 을 붙인다. `applyLang()` 이 `textContent = t(dataset.t)` 로 채운다.

```html
<header>
  <div class="logoChip">…(기존 svg 그대로)…</div>
  <div class="brand"><span data-t="항공기 PUSHBACK 절차 안내">항공기 PUSHBACK 절차 안내</span><small>INCHEON AIRPORT</small></div>
  <button id="langBtn" onclick="toggleLang()">KO</button>
  <button id="themeBtn" onclick="cycleTheme()">자동</button>
</header>
```

480행: `<img src="icon-192.png" alt="밀어요 로고" data-t-alt="밀어요 로고">`
484행: `<span id="preLbl" data-t="전체 도면 다운로드">전체 도면 다운로드</span>`
491행: `<span id="gpsBtnTxt" data-t="내 위치에서 가까운 주기장 찾기">내 위치에서 가까운 주기장 찾기</span>`
497행: `<div id="numDisp" class="numDisp empty" data-t="게이트 번호 입력">게이트 번호 입력</div>`
510행: `<button class="key del" onclick="kpDel()" aria-label="지우기" data-t-aria="지우기">⌫</button>`
513행: `<button class="zoneBtn" id="zoneBtn" onclick="toggleZones()" data-t="구역별 전체 보기 ▾">구역별 전체 보기 ▾</button>`
520행 푸터:

```html
<footer><span><b id="brandTap" data-t="인천국제공항공사">인천국제공항공사</b> <span data-t="운항관리처">운항관리처</span></span><span id="verTap"><span data-t="개정">개정</span> 2026.07.31 · v8.1</span></footer>
```

- [ ] **Step 5: `index.html` 수정 — `applyLang`/`toggleLang` 과 부팅**

668행 `document.getElementById("themeBtn").textContent = THEME_LABEL[themePref];` → `… = t(THEME_LABEL[themePref]);`

`cycleTheme` 함수 바로 뒤(677행 부근)에 추가:

```js
// ───────── 언어: KO / ENG ─────────
// 정적 문구는 data-t(텍스트)·data-t-alt·data-t-aria 로, 동적 문구는 t()/tf() 로, 절차 본문은 hb() 로 바꾼다
function applyLang(){
  const en = getLang()==="en";
  document.documentElement.lang = en ? "en" : "ko";
  document.getElementById("langBtn").textContent = en ? "ENG" : "KO";
  document.querySelectorAll("[data-t]").forEach(el=>{ el.textContent = t(el.dataset.t); });
  document.querySelectorAll("[data-t-alt]").forEach(el=>{ el.alt = t(el.dataset.tAlt); });
  document.querySelectorAll("[data-t-aria]").forEach(el=>{ el.setAttribute("aria-label", t(el.dataset.tAria)); });
  applyTheme();                                     // 테마 버튼 라벨(자동/라이트/다크)
  // 열려 있는 화면을 현재 언어로 다시 그린다
  const detailOpen = document.getElementById("detail").style.display==="block";
  const m = location.hash.match(/gate=([\w]+)/);
  if(detailOpen && m) openGate(decodeURIComponent(m[1]));
  else { renderKp(); if(zonesOpen) renderZones(); }
}
function toggleLang(){
  setLang(getLang()==="en" ? "ko" : "en");
  applyLang();
}
```

주의: `openGate` 는 `stGate` 집계를 늘리고 `WVST` 를 초기화한다. 언어 전환으로 인한 재진입은 집계에 1회 더 잡힌다. 허용 (spec 4절 "즉시 재렌더" 우선). `renderKp`·`zonesOpen` 은 이 시점에 이미 정의돼 있다 (682행, 710행). `toggleZones` 의 문구(714행)와 `renderZones` 는 Task 3 에서 `t()` 로 바꾼다.

4077행 부팅 줄을 다음으로 교체:

```js
window.addEventListener("load", ()=>{ applyLang(); renderSurveyBar(); openFromHash(); });
```

4080행 `applyTheme();` (즉시 실행) 은 그대로 둔다 (첫 페인트 전 테마 적용). `applyLang` 은 DOM 이 있어야 하므로 `load` 에서만 부른다. `openGate` 안에서 `location.hash` 갱신은 894행에서 하므로, `openFromHash` 가 뒤에 와도 같은 주기장을 한 번 더 열 뿐이다.

- [ ] **Step 6: `sw.js` 프리캐시**

4행을 다음으로 교체:

```js
const SHELL=["./","./index.html","./gates.js","./i18n/i18n.js","./i18n/ui.en.js","./i18n/handbook.en.js","./manifest.json","./icon-192.png"];
```

- [ ] **Step 7: `tools/review/shot.html` 에 `lang` 쿼리**

10–11행을 다음으로 교체:

```js
const theme=q.get("theme")||"light", view=q.get("view")||"home", gate=q.get("gate")||"250", lang=q.get("lang")||"ko";
try{ localStorage.setItem("theme",theme); localStorage.setItem("lang",lang); localStorage.removeItem("pbView"); }catch(e){}
```

8행 주석에 `&lang=en` 을 추가한다.

- [ ] **Step 8: 문법·런타임 확인**

```powershell
node -e "const fs=require('fs'),vm=require('vm');const h=fs.readFileSync('index.html','utf8');[...h.matchAll(/<script>([\s\S]*?)<\/script>/g)].forEach((x,i)=>new vm.Script(x[1],{filename:'inline'+i}));['sw.js','i18n/i18n.js','i18n/ui.en.js','i18n/handbook.en.js'].forEach(f=>new vm.Script(fs.readFileSync(f,'utf8'),{filename:f}));console.log('OK')"
```

Expected: `OK`

로컬 서버를 띄운 뒤(별도 창: `powershell -File serve.ps1 -NoBrowser`) 영문 모드 DOM 을 덤프한다:

```powershell
$edge="C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"; $udd="$env:TEMP\pushback-i18n-profile"
$out="$env:TEMP\pb-lang-dom.txt"; $err="$env:TEMP\pb-lang-err.txt"
$p=Start-Process -FilePath $edge -ArgumentList @("--headless=new","--disable-gpu","--enable-logging=stderr","--v=0","--user-data-dir=$udd","--virtual-time-budget=8000","--dump-dom","http://localhost:8765/tools/review/shot.html?lang=en&view=home") -PassThru -RedirectStandardOutput $out -RedirectStandardError $err
$null=$p.WaitForExit(30000); if(-not $p.HasExited){$p.Kill()}
Select-String -Path $err -Pattern "CONSOLE.*(error|Uncaught|TypeError|ReferenceError)"
```

Expected: 콘솔 오류 0줄. `shot.html` 은 iframe 이라 `--dump-dom` 에는 iframe 내부가 안 나온다. 대신 `index.html` 을 직접 열어 확인한다: 위 URL 을 `http://localhost:8765/index.html` 로 바꾸고 그 전에 같은 `$udd` 프로필로 `shot.html?lang=en` 을 한 번 열어 두면 localStorage 가 남는다. 덤프 결과에서 확인:

```powershell
Select-String -Path $out -Pattern 'id="langBtn">ENG<|Aircraft Pushback Guide|lang="en"' | Measure-Object | Select-Object -Expand Count
```

Expected: `3`

- [ ] **Step 9: 커밋**

```bash
git add index.html sw.js i18n/ui.en.js i18n/handbook.en.js tools/review/shot.html
git commit -m "영문판: 헤더 KO/ENG 버튼·언어 상태 적용·사전 프리캐시"
```

---

### Task 3: 동적 UI 문구 `t()/tf()` 감싸기, 사전 완성, 커버리지 스크립트

**Files:**
- Modify: `index.html` — 아래 표의 각 행
- Modify: `i18n/ui.en.js` — 전체 항목
- Create: `tools/i18n/coverage.mjs`

**Interfaces:**
- Consumes: Task 1 `t/tf`, Task 2 `data-t` 규약
- Produces: `node tools/i18n/coverage.mjs` → 종료코드 0 이면 통과. 출력 4개 절: 미등록 UI 문구, 해시 불일치, 미검수(`status!=="ok"`), SVG 한글 라벨

- [ ] **Step 1: 커버리지 스크립트 작성** — `tools/i18n/coverage.mjs`

```js
// tools/i18n/coverage.mjs — 영문판 커버리지 검사. 종료코드 0 = 통과
// 1) index.html 의 한글 리터럴 중 t()/tf()/data-t 로 감싸지 않은 것
// 2) handbook.en.js 항목 중 한글 원문 해시가 맞지 않는 것, HANDBOOK 에 있는데 사전에 없는 것
// 3) status !== "ok" 인 항목
// 4) img/*.svg 안의 한글 <text>
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { loadGlobal } from "./lib.mjs";
const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "..", "..");
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
const dataBlocks = [...rawScript.matchAll(DATA_RE)].map(x => x[1]).join("\n");
const script = stripComments(rawScript);
const unwrapped = [];
// 마크업: 한글이 있는 줄은 data-t 계열 속성이 있어야 한다
markup.split("\n").forEach((l, i) => {
  if (KO.test(l) && !/data-t(-alt|-aria)?="/.test(l)) unwrapped.push(`markup:${i + 1}: ${l.trim().slice(0, 100)}`);
});
// 스크립트: 한글이 든 문자열 리터럴은 바로 앞이 t( 또는 tf( 이어야 한다
const LIT = /(["'`])((?:(?!\1)[^\\]|\\.)*?)\1/g;
let m;
while ((m = LIT.exec(script))) {
  if (!KO.test(m[2])) continue;
  const before = script.slice(Math.max(0, m.index - 4), m.index);
  if (/\btf?\($/.test(before)) continue;
  const line = script.slice(0, m.index).split("\n").length;
  unwrapped.push(`script:${line}: ${m[2].slice(0, 80)}`);
}
// 사전 미등록: t("…")/tf("…") 의 키가 UI_EN 에 없는 것
const UI_EN = loadGlobal(path.join(ROOT, "i18n/ui.en.js"), "UI_EN");
const missing = [];
const CALL = /\btf?\(\s*(["'`])((?:(?!\1)[^\\]|\\.)*?)\1/g;
while ((m = CALL.exec(script))) if (KO.test(m[2]) && !(m[2] in UI_EN)) missing.push(m[2]);
const DT = /data-t(?:-alt|-aria)?="([^"]+)"/g;
while ((m = DT.exec(markup))) if (!(m[1] in UI_EN)) missing.push(m[1]);
// 데이터 구간의 한글 문자열 리터럴(구역명, 예시 절차, 애니메이션 단계 txt 등)도 사전에 있어야 한다
while ((m = LIT.exec(dataBlocks))) if (KO.test(m[2]) && !(m[2] in UI_EN)) missing.push(m[2]);

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
```

`tools/i18n/lib.mjs` 의 `loadGlobal` 은 Task 5 에서 만들지만 이 Task 가 먼저 필요로 하므로 여기서 최소 버전을 만든다:

```js
// tools/i18n/lib.mjs — 도구 공용 유틸
import fs from "node:fs";
import vm from "node:vm";

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
```

- [ ] **Step 2: 커버리지 실행, 실패 확인**

Run: `node tools/i18n/coverage.mjs --no-status`
Expected: 종료코드 1, "감싸지 않은 한글 문구" 약 100건, "절차 사전 없음" 649건. (`--no-status` 는 미검수를 무시)

- [ ] **Step 3: `index.html` 의 동적 문구를 `t()/tf()` 로 감싸기**

아래 표대로 바꾼다. 행 번호는 Task 2 적용 후 기준이 아니라 원본 기준이므로 문자열로 찾는다. 매개변수 문구는 `tf()` 와 `{이름}` 자리표시자를 쓴다.

| 원본 | 변경 |
|---|---|
| 526–537행 `ZONE_GATES` | 데이터. 앞뒤에 `/* i18n-data-start */` `/* i18n-data-end */`. 구역명은 표시 시점에 `t(z)` |
| 541–548행 FILLED `steps:[...]`, `cautions:[...]` | 데이터. 같은 표식으로 감싼다. 렌더 시점에 감싼다: `stepsHtml` 의 `g.steps.map((s,i)=>…${s}…)` → `${t(s)}`; 주의사항 렌더 `g.cautions.map(c=>`<li>${c}</li>`)` → `${t(c)}` |
| 563행 `steps:["절차 내용 입력 예정 (핸드북 미수록)"]` | 그 줄 앞뒤에 `/* i18n-data-start */` `/* i18n-data-end */` (위 `t(s)` 로 감싸짐) |
| 571행 `makeGate(id, "원격·기타")` | 그 줄 앞뒤에 같은 표식. 구역명은 표시 시점에 `t(z)` |
| 1079행 `const PATH_ANIM = {` 부터 객체 끝 `};` 까지 | 데이터. 같은 표식으로 감싼다 (558 체크리스트 `txt:"…"` 5건 포함) |
| 3475행 `txt:stepsSrc.map(s=>String(s.txt\|\|""))` | `txt:stepsSrc.map(s=>t(String(s.txt\|\|"")))` (hbNotes 유래 문구는 이미 영문이므로 `t()` 가 원문 반환) |
| 621행 `aria-label="${sel.id}번 주기장 위치도"` | `aria-label="${tf("{n}번 주기장 위치도",{n:sel.id})}"` |
| 641행 `'…현재 위치가 지도 범위(T2 구역) 밖입니다</div>'` | `'<div class="subT">'+t("현재 위치가 지도 범위(T2 구역) 밖입니다")+'</div>'` |
| 644행 `위치 확인 실패 — 위치 권한을 허용해 주세요` | `'<div class="failBox" style="margin-top:8px">'+t("위치 확인 실패 — 위치 권한을 허용해 주세요")+'</div>'` |
| 691행 `d.textContent = "게이트 번호 입력"` | `d.textContent = t("게이트 번호 입력")` |
| 701행 `일치하는 게이트가 없습니다` | `'<div class="subT">'+t("일치하는 게이트가 없습니다")+'</div>'` |
| 702행 `'일치 게이트 · ' + matches.length + '개'` | `tf("일치 게이트 · {n}개",{n:matches.length})` |
| 704행 `…계속 입력하세요` | `t("…계속 입력하세요")` |
| 714행 `zonesOpen ? "구역별 목록 접기 ▴" : "구역별 전체 보기 ▾"` | `zonesOpen ? t("구역별 목록 접기 ▴") : t("구역별 전체 보기 ▾")` |
| 719행 탭 `${z}` | `${t(z)}` |
| 722행 `<span class="zt">${curZone}</span>` / `${gs.length}개소` | `${t(curZone)}` / `${tf("{n}개소",{n:gs.length})}` |
| 903행 `${ico.back} 홈화면` | `${ico.back} ${t("홈화면")}` |
| 912행 `${g.zone} 주기장` / `후방견인절차` | `${tf("{z} 주기장",{z:t(g.zone)})}` / `${t("후방견인절차")}` |
| 914행 `row("견인 방향", g.dir)` 등 4개 | `row(t("견인 방향"), g.dir)`, `row(t("정대 기준"), g.line)`, `row(t("분리 지점"), g.limit)`, `row(t("통신"), g.freq, "freq")` |
| 917행 `"관제 지시별 후방견인 절차" : "표준 절차"` | `t("관제 지시별 후방견인 절차") : t("표준 절차")` |
| 923행 `주의사항` | `${t("주의사항")}` |
| 928행 `후방견인 도면`, `기본 시점`, `작업자 시점` | `${t("후방견인 도면")}`, `${t("기본 시점")}`, `${t("작업자 시점")}` |
| 934행 `alt="${g.id}번 주기장 도면"` / 935행 `탭하여 확대` | `alt="${tf("{n}번 주기장 도면",{n:g.id})}"` / `${t("탭하여 확대")}` |
| 945행, 967행 `alt="${g.id}번 주기장 도해"` | `alt="${tf("{n}번 주기장 도해",{n:g.id})}"` |
| 956행 `견인 진행방향 ↑` | `${t("견인 진행방향 ↑")}` |
| 957행 `항공기를 탭하면 그 절차가 재생됩니다 ▶` | `${t("항공기를 탭하면 그 절차가 재생됩니다 ▶")}` |
| 961행, 987행, 3927행 `경로이탈 감지 시작 (시범)` | `t("경로이탈 감지 시작 (시범)")` (템플릿 안은 `${…}`) |
| 981행 `탭하여 견인경로 재생 ▶` | `${t("탭하여 견인경로 재생 ▶")}` |
| 984행, 3733행 `내 위치 표시 (작업자 참고용)` | `t("내 위치 표시 (작업자 참고용)")` |
| 993–995행 기준점 측정 카드 | 감싸지 않음. 카드 템플릿 앞뒤를 `/* i18n-skip-start */` `/* i18n-skip-end */` 로 감싼다 (템플릿 리터럴 밖, JS 주석 위치) |
| 1017행, 1047행 `내 위치에서 가까운 주기장 찾기` | `t("내 위치에서 가까운 주기장 찾기")` |
| 1023행, 1053행, 3946행 `이 기기는 위치 서비스를 지원하지 않습니다.` | `t("이 기기는 위치 서비스를 지원하지 않습니다.")` |
| 1024행 `위치 추적 중 — 누르면 끄기` | `t("위치 추적 중 — 누르면 끄기")` |
| 1025행, 1054행 `위치 확인 중…` | `t("위치 확인 중…")` |
| 1029행, 1060행 `좌표가 입력된 게이트가 없습니다.` | `t("좌표가 입력된 게이트가 없습니다.")` |
| 1034행, 1065행 `약 ${Math.round(c.d)}m` | `${tf("약 {d}m",{d:Math.round(c.d)})}` |
| 1068행 `GPS 정확도 ±…m — 실제 작업 주기장 번호와…` | `tf("GPS 정확도 ±{a}m — 실제 작업 주기장 번호와 일치하는지 확인 후 선택하세요",{a:Math.round(accuracy)})` |
| 1046행, 1069행 `위치 확인 실패: 위치 권한을 허용해 주세요.` | `t("위치 확인 실패: 위치 권한을 허용해 주세요.")` |
| 3318행 `("절차 "+((idx\|\|0)+1))` | `tf("절차 {n}",{n:(idx\|\|0)+1})` |
| 3491행 `확인 ✓` | `'…>'+t("확인 ✓")+'</button>'` |
| 3640행 `aria-label` `후방견인 도면 확대 보기` | `lb.setAttribute("aria-label",t("후방견인 도면 확대 보기"))` |
| 3641행 `alt="후방견인 도면 확대"` / 3642행 `닫기 ✕` / 3645행 `맞춤` / 3647행 `두 손가락으로…` | `${t("후방견인 도면 확대")}`, `${t("닫기 ✕")}`, `${t("맞춤")}`, `${t("두 손가락으로 확대 · 끌어서 이동 · 두 번 탭하면 확대")}` |
| 3741행 `위치 표시 중지` / 3742행, 3940행, 3950행 `위치 수신 중…` | `t("위치 표시 중지")`, `t("위치 수신 중…")` |
| 3756행 `파란 점=내 위치 (정확도 ±…m) — 작업자 위치 참고용이며 항공기 위치가 아닙니다` | `tf("파란 점=내 위치 (정확도 ±{a}m) — 작업자 위치 참고용이며 항공기 위치가 아닙니다",{a:Math.round(p.coords.accuracy)})` |
| 3757행 `현재 위치가 이 도면 범위 밖입니다` / 3758행 `위치 오류 — 권한을 확인하세요` | `t(…)` |
| 3893행 `"소리·진동 켜기" : "소리·진동 끄기"` | `t("소리·진동 켜기") : t("소리·진동 끄기")` |
| 3895행 `도면에서 현재 위치와 기준경로를 확인하세요` | `${t("도면에서 현재 위치와 기준경로를 확인하세요")}` |
| 3936행, 3949행 `경로이탈 감지 중지` | `t("경로이탈 감지 중지")` |
| 3954행 `위치를 받지 못했습니다<small>위치 권한과 GPS 상태를 확인하세요</small>` | `t("위치를 받지 못했습니다")+"<small>"+t("위치 권한과 GPS 상태를 확인하세요")+"</small>"` |
| 3971행 `현재 위치가 이 주기장 도면 범위 밖입니다<small>"+gid+"번 주기장 부근에서 사용하세요</small>` | `t("현재 위치가 이 주기장 도면 범위 밖입니다")+"<small>"+tf("{n}번 주기장 부근에서 사용하세요",{n:gid})+"</small>"` |
| 3992행 `\u26A0 경로이탈 ${…} m — 기준 ${DEV_TH} m 초과${… " (심각)" : ""}` | `"\u26A0 "+tf("경로이탈 {d} m — 기준 {th} m 초과",{d:Math.round(dev),th:DEV_TH})+(L.lv===3 ? t(" (심각)") : "")` |
| 3993행 `기준경로 이내 · 이탈 ${…} m` | `tf("기준경로 이내 · 이탈 {d} m",{d:Math.round(dev)})` |
| 3994행 `<small>절차 ${pr.label\|\|"1"} 기준 · 위치정확도 ±… m · 최대 … m` | `"<small>"+tf("절차 {p} 기준 · 위치정확도 ±{a} m · 최대 {m} m",{p:pr.label\|\|"1",a:Math.round(acc),m:Math.round(devMax)})` |
| 3995행 ` — 작업자 단말 위치이며 항공기 위치가 아닙니다` | `t(" — 작업자 단말 위치이며 항공기 위치가 아닙니다")` |
| 4013–4059행 측정 모드 (`toggleSurvey`~`measureStart` 끝) | 감싸지 않음. `/* i18n-skip-start */` … `/* i18n-skip-end */` |
| 4090행 `도면을 불러오지 못했습니다 — …` / 4091행 `오프라인 상태 — …` | `t("도면을 불러오지 못했습니다 — 통신 상태 확인 후 다시 열어 주세요")` / `t("오프라인 상태 — 이 주기장 도면이 아직 저장되지 않았습니다.<br>통신 가능 지역에서 홈의 <b>[전체 도면 저장]</b>을 한 번 실행하면<br>모든 주기장을 오프라인에서 볼 수 있습니다.")` (HTML 태그 포함 원문이 키) |
| 4102, 4105, 4113, 4114, 4121, 4123, 4124, 4140행 문자열 | 각각 `t("…")`. 4124행 `confirm` 의 `\n` 은 키에 그대로 포함 |
| 4134행 `` `다운로드 ${done}/${done+list.length}` `` | `tf("다운로드 {done}/{total}",{done,total:done+list.length})` |
| 4138행 `` `${fail}개 실패 — 다시 받기` `` | `tf("{n}개 실패 — 다시 받기",{n:fail})` |
| 4148–4149행 `개정됨 · 도면 다시 받기` / `다운로드됨 · 다시 받기` | `t(…)` |
| 4192행 `새 버전이 준비되었습니다` / `지금 적용` | `'<span>'+t("새 버전이 준비되었습니다")+'</span><button>'+t("지금 적용")+'</button>'` |
| 4245–4281행 이용집계 (`stCsv`~`stClear`) | 감싸지 않음. `/* i18n-skip-start */` … `/* i18n-skip-end */` |

`t` 는 `i18n/i18n.js` 가 전역에 정의하므로 `index.html` 어디서나 쓸 수 있다. `stepsHtml` 은 Task 4 에서 다시 고치므로 여기서는 `${s}`→`${t(s)}` 만 바꾼다.

- [ ] **Step 4: `i18n/ui.en.js` 완성**

Task 2 의 항목 뒤에 다음을 추가한다 (키는 Step 3 의 원문과 글자 하나까지 같아야 한다):

```js
  // 구역
  "탑승동": "Concourse",
  "화물계류장1": "Cargo apron 1",
  "화물계류장2": "Cargo apron 2",
  "원격·기타": "Remote / other",
  "{n}개소": "{n} stands",
  "{z} 주기장": "{z} · Stand",
  // 홈
  "{n}번 주기장 위치도": "Stand {n} location map",
  "현재 위치가 지도 범위(T2 구역) 밖입니다": "Current location is outside the map area (T2)",
  "위치 확인 실패 — 위치 권한을 허용해 주세요": "Location unavailable. Please allow location access",
  "일치하는 게이트가 없습니다": "No matching stand",
  "일치 게이트 · {n}개": "Matching stands · {n}",
  "…계속 입력하세요": "…keep typing",
  "이 기기는 위치 서비스를 지원하지 않습니다.": "This device does not support location services.",
  "위치 추적 중 — 누르면 끄기": "Tracking location. Tap to stop",
  "위치 확인 중…": "Locating…",
  "좌표가 입력된 게이트가 없습니다.": "No stands with coordinates.",
  "약 {d}m": "approx. {d} m",
  "GPS 정확도 ±{a}m — 실제 작업 주기장 번호와 일치하는지 확인 후 선택하세요": "GPS accuracy ±{a} m. Confirm the stand number matches your actual work stand before selecting",
  "위치 확인 실패: 위치 권한을 허용해 주세요.": "Location unavailable: please allow location access.",
  // 예시 데이터(역MARS)·플레이스홀더
  "역MARS 운영 주기장 — 푸시백 승인 요청": "Reverse-MARS stand. Request pushback approval",
  "E/F급 장거리 토바 사용 확인": "Confirm long towbar for code E/F",
  "윙워커 2명 + 후방감시 1명 배치": "Position 2 wing walkers and 1 rear observer",
  "R17 기준선까지 견인 (표준보다 견인거리 김)": "Push back to the R17 reference line (longer than standard)",
  "R17 정대 후 정지·토바 분리": "Stop aligned on R17 and disconnect the towbar",
  "R17 기준선까지 견인 후 정대·분리": "Push back to the R17 reference line, align and disconnect",
  "E/F급 전용 — 견인거리 증가로 소요시간 여유 확보": "Code E/F only. Allow extra time for the longer tow distance",
  "E/F급 전용": "Code E/F only",
  "절차 내용 입력 예정 (핸드북 미수록)": "Procedure to be added (not in handbook)",
  // 도면 애니메이션 단계 (PATH_ANIM, 558 체크리스트). 관제탑은 ATC 이므로 instructed, 계류장관제는 advised (spec 6절)
  "558 출발 전 슬라이딩게이트 개방 확인": "Confirm the sliding gate is open before departing 558",
  "슬라이딩게이트 진입 전 LTE 계류장관제3 교신": "Contact Incheon Apron 3 via LTE before entering the sliding gate",
  "계류장관제 지시에 따라 이동": "Proceed as advised by Incheon Apron",
  "LTE 관제탑 교신": "Contact the tower via LTE",
  "관제탑 지시에 따라 이동": "Proceed as instructed by the tower",
  // 주기장 상세
  "홈화면": "Home",
  "후방견인절차": "Pushback procedures",
  "견인 방향": "Pushback direction",
  "정대 기준": "Alignment reference",
  "분리 지점": "Disconnect point",
  "통신": "Frequency",
  "관제 지시별 후방견인 절차": "Pushback procedures by phraseology",
  "표준 절차": "Standard procedure",
  "주의사항": "Cautions",
  "후방견인 도면": "Pushback drawing",
  "기본 시점": "Standard view",
  "작업자 시점": "Crew view",
  "{n}번 주기장 도면": "Stand {n} drawing",
  "{n}번 주기장 도해": "Stand {n} diagram",
  "탭하여 확대": "Tap to zoom",
  "견인 진행방향 ↑": "Pushback direction ↑",
  "항공기를 탭하면 그 절차가 재생됩니다 ▶": "Tap an aircraft to play its procedure ▶",
  "탭하여 견인경로 재생 ▶": "Tap to play the pushback path ▶",
  "경로이탈 감지 시작 (시범)": "Start route deviation alert (trial)",
  "경로이탈 감지 중지": "Stop route deviation alert",
  "내 위치 표시 (작업자 참고용)": "Show my location (crew reference only)",
  "위치 표시 중지": "Hide my location",
  "위치 수신 중…": "Acquiring location…",
  "파란 점=내 위치 (정확도 ±{a}m) — 작업자 위치 참고용이며 항공기 위치가 아닙니다": "Blue dot = my location (accuracy ±{a} m). Worker's device position, not the aircraft",
  "현재 위치가 이 도면 범위 밖입니다": "Current location is outside this drawing",
  "위치 오류 — 권한을 확인하세요": "Location error. Check location permission",
  "절차 {n}": "Procedure {n}",
  "확인 ✓": "OK ✓",
  // 라이트박스
  "후방견인 도면 확대 보기": "Pushback drawing, zoom view",
  "후방견인 도면 확대": "Pushback drawing, zoomed",
  "닫기 ✕": "Close ✕",
  "맞춤": "Fit",
  "두 손가락으로 확대 · 끌어서 이동 · 두 번 탭하면 확대": "Pinch to zoom · drag to pan · double-tap to zoom",
  // 경로이탈 감지 (시범)
  "소리·진동 켜기": "Sound and vibration on",
  "소리·진동 끄기": "Sound and vibration off",
  "도면에서 현재 위치와 기준경로를 확인하세요": "Check your position against the reference path on the drawing",
  "위치를 받지 못했습니다": "No location received",
  "위치 권한과 GPS 상태를 확인하세요": "Check location permission and GPS status",
  "현재 위치가 이 주기장 도면 범위 밖입니다": "Current location is outside this stand's drawing",
  "{n}번 주기장 부근에서 사용하세요": "Use near stand {n}",
  "경로이탈 {d} m — 기준 {th} m 초과": "Route deviation {d} m. Exceeds the {th} m threshold",
  " (심각)": " (severe)",
  "기준경로 이내 · 이탈 {d} m": "Within reference path · deviation {d} m",
  "절차 {p} 기준 · 위치정확도 ±{a} m · 최대 {m} m": "Based on procedure {p} · accuracy ±{a} m · max {m} m",
  " — 작업자 단말 위치이며 항공기 위치가 아닙니다": ". Worker's device position, not the aircraft",
  // 오프라인·다운로드·업데이트
  "도면을 불러오지 못했습니다 — 통신 상태 확인 후 다시 열어 주세요": "Could not load the drawing. Check your connection and reopen",
  "오프라인 상태 — 이 주기장 도면이 아직 저장되지 않았습니다.<br>통신 가능 지역에서 홈의 <b>[전체 도면 저장]</b>을 한 번 실행하면<br>모든 주기장을 오프라인에서 볼 수 있습니다.": "Offline. This stand's drawing is not saved yet.<br>Run <b>[Download all drawings]</b> on the home screen once while connected<br>to view every stand offline.",
  "이 브라우저에서는 오프라인 저장을 지원하지 않습니다.": "This browser does not support offline storage.",
  "저장 엔진 준비 중…": "Preparing storage…",
  "저장 기능 준비에 실패했습니다. 잠시 후 다시 눌러 주세요.": "Storage setup failed. Please try again shortly.",
  "통신 가능한 곳에서 실행해 주세요.": "Please run this where you have a connection.",
  "전 주기장 도면(약 100MB)을 내려받아 저장합니다.\nWi-Fi 환경을 권장합니다. 계속할까요?": "Download and store all stand drawings (about 100 MB).\nWi-Fi recommended. Continue?",
  "다운로드 {done}/{total}": "Downloading {done}/{total}",
  "{n}개 실패 — 다시 받기": "{n} failed. Retry",
  "다운로드 완료 ✓ 오프라인 가능": "Download complete ✓ available offline",
  "개정됨 · 도면 다시 받기": "Updated · re-download drawings",
  "다운로드됨 · 다시 받기": "Downloaded · download again",
  "새 버전이 준비되었습니다": "A new version is ready",
  "지금 적용": "Apply now",
```

- [ ] **Step 5: 커버리지 재실행**

Run: `node tools/i18n/coverage.mjs --no-status`
Expected: "감싸지 않은 한글 문구: 0건", "사전 미등록 키: 0건", "SVG 한글 라벨: 0건". "절차 사전 없음" 649건은 아직 남는다 (Task 6 에서 해소). 종료코드는 1.

SVG 한글 라벨이 0건이 아니면 해당 파일명을 spec 2절 표에 기록하고, 이 계획에 없는 작업이므로 사용자에게 보고한 뒤 멈춘다.

- [ ] **Step 6: 문법·런타임 확인** — Task 2 Step 8 과 같은 명령. 콘솔 오류 0. 영문 DOM 에 `Pushback procedures by phraseology`, `Cautions` 가 있는지 `#gate=7` 로 열어 확인:

```powershell
Select-String -Path $out -Pattern 'Pushback procedures by phraseology|Download all drawings' | Measure-Object | Select-Object -Expand Count
```

Expected: `2` 이상

- [ ] **Step 7: 커밋**

```bash
git add index.html i18n/ui.en.js tools/i18n/coverage.mjs tools/i18n/lib.mjs
git commit -m "영문판: UI 문구 t()/tf() 적용·사전 완성·커버리지 스크립트"
```

---

### Task 4: 절차 본문 `hb()` 연결, KO 배지, `colorize` 영문 대응

**Files:**
- Modify: `index.html` — `colorize` (768–784행), `procSegItems` 797행, `hbNotes` (857–870행), `stepsHtml` (879–883행), 3318행 `stProc`, CSS `.stepT` 뒤

**Interfaces:**
- Consumes: Task 1 `hb/kwRegex/kwCanon`
- Produces: `koBadge(): string` (KO 배지 HTML)

- [ ] **Step 1: CSS 추가** — `.procNote{…}` (222행) 바로 뒤

```css
  /* 영문 모드에서 아직 영문이 없는 절차 표시. amber 계열 토큰 재사용 */
  .koBadge{display:inline-block;vertical-align:2px;margin-left:6px;font-size:10.5px;font-weight:700;letter-spacing:.04em;
    color:var(--amber-t);background:var(--amber-bg);border:1px solid var(--amber-bd);border-radius:8px;padding:1px 7px;}
```

- [ ] **Step 2: `colorize` 를 `kwRegex/kwCanon` 으로**

768–784행 함수 본문을 다음으로 교체:

```js
function colorize(text, gid){
  const map = KWC[gid]; if(!map || !text) return text;
  // 키를 하나씩 반복해 칠하면, 이미 칠한 구문 안에 짧은 키가 다시 걸린다
  //  예) "North on R6"(초록)을 칠한 뒤 "North"(하늘)가 그 안에서 또 매칭
  // → 긴 키를 앞에 둔 하나의 정규식으로 '한 번만' 훑는다 (겹칠 수 없음). 정규식은 i18n.js kwRegex
  //   (영문 모드: 대소문자 무시, Point N ↔ spot N 별칭). 매칭 문자열은 kwCanon 으로 원래 키로 되돌린다
  const keys = Object.keys(map);
  if(!keys.length) return text;
  const re = kwRegex(keys);
  return text.replace(re, (m,pre,hit)=>{
    const kw = kwCanon(keys, hit); if(!kw) return m;
    const pi = kwPathIdx(gid, map[kw]);
    const att = (pi >= 0) ? ` kw-go" data-g="${gid}" data-p="i${pi}"` : `"`;
    const c = kwHex(map[kw]);
    return pre+`<span class="kw${att} style="--kwc:${c};--kw-d:${kwDark(c)}">${hit}</span>`;
  });
}
```

- [ ] **Step 3: `stepsHtml`, `hbNotes`, `procSegItems`, `stProc` 를 `hb()` 경유로**

`stepsHtml` (879행):

```js
function koBadge(){ return `<span class="koBadge">KO</span>`; }
function stepsHtml(g){
  if(g.procs) return g.procs.map((p,i)=>{
    const e = hb(g.id, i);
    return `<li><span class="stepN">${i+1}</span><span class="stepT"><b>${colorize(e.title,g.id)}</b>${e.ko ? koBadge() : ""}<br>${procDesc(e.body)}</span></li>`;
  }).join("");
  return g.steps.map((s,i)=>`<li><span class="stepN">${i+1}</span><span class="stepT">${t(s)}</span></li>`).join("");
}
```

`hbNotes` (857행 `const procs=HB[gid]||[]` 이하): 제목 매칭은 원문 제목(키워드 사전 기준)으로 하고 주의 문구만 `hb()` 본문에서 뽑는다.

```js
  procs.forEach((p,i)=>{
    const title=String(p[0]||"");
    const keys=Object.keys(kw).filter(k=>new RegExp("(^|[^A-Za-z0-9])"+esc(k)+"(?![A-Za-z0-9])").test(title))
                              .sort((a,b)=>b.length-a.length);
    if(keys.length && kwPathIdx(gid, kw[keys[0]])===idx) hit.push(...procNotes(hb(gid,i).body));
  });
  if(!hit.length && nPaths===1 && procs.length===1) hit=procNotes(hb(gid,0).body);
```

`procSegItems` 797행 `const procs=(HB[gid]||[]).map(p=>String(p[0]||""));` → `const procs=(HB[gid]||[]).map((p,i)=>hb(gid,i).title);`

3318행: `(HB[gid] && HB[gid][idx||0] && HB[gid][idx||0][0]) || ("절차 "+((idx||0)+1))` → `(HB[gid] && HB[gid][idx||0] && HB[gid][idx||0][0]) || tf("절차 {n}",{n:(idx||0)+1})` (집계 키는 언어와 무관하게 원문 제목 유지)

영문 본문의 `* 주의 문구` 규약: `procDesc`/`procNotes` 는 `*` 로 구분된 뒤쪽 조각을 빨간 주의 문구로 렌더한다. 영문 사전의 `en` 도 같은 규약을 따른다 (Task 8 번역 규칙).

- [ ] **Step 4: 문법·런타임 확인**

Task 2 Step 8 의 명령으로 `index.html#gate=7` 을 영문 모드로 덤프. 아직 `HB_EN` 이 비어 있으므로:

```powershell
Select-String -Path $out -Pattern 'class="koBadge">KO<' -AllMatches | ForEach-Object { $_.Matches.Count }
```

Expected: 주기장 7 의 절차 수와 같은 값 (HANDBOOK["7"].length, 3). 콘솔 오류 0. 한글 모드(`shot.html?lang=ko` 를 먼저 열어 프로필 갱신)로 다시 덤프하면 `koBadge` 0건이고 키워드 `<span class="kw` 개수가 변경 전과 같아야 한다 (변경 전 개수는 `git stash` 로 잠시 원복해 재어 두거나, main 워크트리 `.claude/worktrees/` 중 하나를 8766 포트로 띄워 비교).

- [ ] **Step 5: 단위 테스트 전체 통과 확인**

Run: `node --test tools/i18n/test/`
Expected: 모두 pass

- [ ] **Step 6: 커밋**

```bash
git add index.html
git commit -m "영문판: 절차 본문 hb() 연결·KO 배지·키워드 색칠 영문 대응"
```

---

### Task 5: AIP 추출 (`aip-pdf2txt.py`, `aip-extract.mjs`)

**Files:**
- Create: `tools/i18n/aip-pdf2txt.py`
- Create: `tools/i18n/aip-extract.mjs`
- Create: `tools/i18n/aip-text.txt` (생성물, 커밋), `tools/i18n/aip-rows.json` (생성물, 커밋)
- Test: `tools/i18n/test/aip-extract.test.mjs`

**Interfaces:**
- Produces: `aip-rows.json` = `{ amdt: "AMDT 7/26", rows: [{ stands: string[], proc: string, phr: string, page: number }] }`
- Produces (export): `parseAipText(text: string): {stands, proc, phr, page}[]`, `expandStands(spec: string): string[]`

- [ ] **Step 1: 실패하는 테스트** — `tools/i18n/test/aip-extract.test.mjs`

```js
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
```

- [ ] **Step 2: 테스트 실행, 실패 확인**

Run: `node --test tools/i18n/test/aip-extract.test.mjs`
Expected: FAIL — 모듈 없음

- [ ] **Step 3: PDF → 텍스트** — `tools/i18n/aip-pdf2txt.py`

```python
# tools/i18n/aip-pdf2txt.py — AIP RKSI 텍스트 PDF 에서 페이지별 텍스트를 덤프한다 (pypdf).
# 사용: python tools/i18n/aip-pdf2txt.py "<PDF 경로>" tools/i18n/aip-text.txt
# 페이지 구분자 "===== PAGE n =====" 를 넣어 aip-extract.mjs 가 페이지 번호를 알 수 있게 한다.
import sys
from pypdf import PdfReader

src, dst = sys.argv[1], sys.argv[2]
r = PdfReader(src)
with open(dst, "w", encoding="utf-8", newline="\n") as f:
    for i, p in enumerate(r.pages, 1):
        f.write(f"===== PAGE {i} =====\n")
        f.write((p.extract_text() or "") + "\n")
print("pages", len(r.pages))
```

- [ ] **Step 4: 텍스트 → 행** — `tools/i18n/aip-extract.mjs`

```js
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
    const parts = joined.split(/(?=\(\d{1,3}[LR]\/[LR]\)\s*The aircraft shall|(?<!\S)The aircraft shall)/).map(s => s.trim()).filter(Boolean);
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
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `node --test tools/i18n/test/aip-extract.test.mjs`
Expected: 3 tests pass. 두 번째 테스트가 `abeam gate(number)` 를 phraseology 에 붙이지 못하면 `flush` 의 split 정규식이 "The aircraft shall" 앞에서만 자르는지 확인한다 (phraseology 두 번째 줄은 그 앞에 "The aircraft shall" 이 없으므로 같은 조각에 남아야 한다).

- [ ] **Step 6: 실제 AIP 로 실행**

```powershell
python tools/i18n/aip-pdf2txt.py "C:\Users\kk980\Desktop\WORK\AIP\RKSI\20260626_RKSI-TEXT.pdf" tools/i18n/aip-text.txt
node tools/i18n/aip-extract.mjs tools/i18n/aip-text.txt tools/i18n/aip-rows.json "AMDT 7/26"
```

Expected: `rows` 300~340, `unique proc` 150~170. `aip-rows.json` 을 열어 페이지 30 의 첫 행이 stands `["1","2"]`, phr `Pushback approved to point 1` 인지, 마지막 행이 화물계류장(6xx) 인지 눈으로 확인한다. 30행 이상 어긋나면 `NOISE` 에 빠진 머리글 줄을 `aip-text.txt` 에서 찾아 추가한다.

- [ ] **Step 7: 커밋**

```bash
git add tools/i18n/aip-pdf2txt.py tools/i18n/aip-extract.mjs tools/i18n/aip-text.txt tools/i18n/aip-rows.json tools/i18n/test/aip-extract.test.mjs
git commit -m "영문판: AIP RKSI pushback 표 추출 스크립트·추출 결과"
```

---

### Task 6: 핸드북 매칭 (`match.mjs`) → `handbook.en.js` 초안

**Files:**
- Create: `tools/i18n/match.mjs`
- Modify: `i18n/handbook.en.js` (생성)
- Create: `tools/i18n/unmatched.json` (생성물, 커밋)
- Test: `tools/i18n/test/match.test.mjs`

**Interfaces:**
- Consumes: `aip-rows.json` (Task 5), `HANDBOOK` (gates.js), `hbHash` (Task 1), `loadGlobal/serializeDict` (Task 3)
- Produces (export): `normPhr(s: string): string`, `matchHandbook(handbook, rows, amdt, prev): { dict, unmatched, stats }`
  - `dict[gid:i] = { en, src:"aip", aip, hash, status:"review" }` (기존 `prev[gid:i]` 가 `status:"ok"` 이고 해시가 같으면 그대로 유지)
  - `unmatched = [{ key, gid, title, ko, candidates: string[] }]`

- [ ] **Step 1: 실패하는 테스트** — `tools/i18n/test/match.test.mjs`

```js
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
```

- [ ] **Step 2: 실패 확인** — `node --test tools/i18n/test/match.test.mjs` → FAIL (모듈 없음)

- [ ] **Step 3: 구현** — `tools/i18n/match.mjs`

```js
// tools/i18n/match.mjs — HANDBOOK(gates.js) 절차를 AIP 행과 (주기장, phraseology) 기준으로 맞춰
// i18n/handbook.en.js 초안을 만든다. 검수 완료(status ok) 항목은 원문 해시가 같으면 보존한다.
// 사용: node tools/i18n/match.mjs   (입력: gates.js, tools/i18n/aip-rows.json, i18n/handbook.en.js)
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { loadGlobal, serializeDict } from "./lib.mjs";
const require = createRequire(import.meta.url);
const { hbHash } = require("../../i18n/i18n.js");

export function normPhr(s) {
  return String(s).toLowerCase()
    .replace(/^pushback approved\s*/, "")
    .replace(/\(number\)/g, "")
    .replace(/\bgate\s+no\.?\s*\d+(\s*,\s*\d+)*/g, "gate")
    .replace(/(\d)\s*romeo\b/g, "$1r")
    .replace(/[.,()]/g, " ")
    .replace(/\s+/g, " ").trim();
}

export function matchHandbook(handbook, rows, amdt, prev) {
  const byStand = new Map();                 // stand → [{norm, proc}]
  for (const r of rows) for (const st of r.stands) {
    if (!byStand.has(st)) byStand.set(st, []);
    byStand.get(st).push({ norm: normPhr(r.phr), proc: r.proc });
  }
  const dict = {}, unmatched = [];
  let total = 0, matched = 0;
  for (const gid of Object.keys(handbook)) handbook[gid].forEach((p, i) => {
    total++;
    const key = gid + ":" + i, title = String(p[0] || ""), ko = String(p[1] || ""), hash = hbHash(ko);
    const old = prev[key];
    if (old && old.status === "ok" && old.hash === hash) { dict[key] = old; matched++; return; }
    const cands = byStand.get(gid) || byStand.get(gid.replace(/[LR]$/, "")) || [];
    const hit = cands.find(c => c.norm === normPhr(title));
    if (hit) { dict[key] = { en: hit.proc, src: "aip", aip: amdt, hash, status: "review" }; matched++; return; }
    unmatched.push({ key, gid, title, ko, candidates: cands.map(c => c.proc) });
  });
  return { dict, unmatched, stats: { total, matched } };
}

if (process.argv[1] && /match\.mjs$/.test(process.argv[1])) {
  const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "..", "..");
  const HANDBOOK = loadGlobal(path.join(ROOT, "gates.js"), "HANDBOOK");
  const { amdt, rows } = JSON.parse(fs.readFileSync(path.join(ROOT, "tools/i18n/aip-rows.json"), "utf8"));
  const prev = loadGlobal(path.join(ROOT, "i18n/handbook.en.js"), "HB_EN");
  const { dict, unmatched, stats } = matchHandbook(HANDBOOK, rows, amdt, prev);
  // 검수 중인 tr 항목도 보존한다 (match 는 aip 매칭만 갱신)
  for (const [k, v] of Object.entries(prev)) if (!dict[k] && v.src !== "aip") dict[k] = v;
  const header = `// i18n/handbook.en.js — 절차 사전. tools/i18n/match.mjs 와 sheet-import.mjs 가 생성·갱신한다. 손으로 고치지 않는다
// 키 "주기장:순번" (HANDBOOK[주기장][순번]). en: 영문 본문, title: 제목 재정의(선택), src: "aip"|"tr"|"aip+tr",
// aip: AIP AMDT 번호, hash: 한글 원문 해시(i18n.js hbHash), status: "review"|"ok"`;
  const order = Object.keys(dict).sort((a, b) => (parseInt(a) - parseInt(b)) || a.localeCompare(b));
  fs.writeFileSync(path.join(ROOT, "i18n/handbook.en.js"), serializeDict("HB_EN", header, dict, order), "utf8");
  fs.writeFileSync(path.join(ROOT, "tools/i18n/unmatched.json"), JSON.stringify(unmatched, null, 1), "utf8");
  console.log(`매칭 ${stats.matched}/${stats.total} (${(100 * stats.matched / stats.total).toFixed(1)}%) · 잔여 ${unmatched.length}건 → tools/i18n/unmatched.json`);
}
```

- [ ] **Step 4: 테스트 통과 확인** — `node --test tools/i18n/test/match.test.mjs` → 3 pass

- [ ] **Step 5: 실제 데이터로 실행**

Run: `node tools/i18n/match.mjs`
Expected: 매칭률 출력. 70% 미만이면 `unmatched.json` 의 `title` 과 `candidates` 를 20건 훑어 정규화 규칙(`normPhr`)에 빠진 패턴을 찾아 추가하고 재실행한다. 규칙을 추가할 때마다 `match.test.mjs` 의 `normPhr` 테스트에 그 예를 한 줄 더한다. 매칭률과 잔여 건수를 사용자에게 보고한다.

- [ ] **Step 6: 커버리지·런타임 확인**

`node tools/i18n/coverage.mjs --no-status` → "절차 사전 없음" 은 잔여 건수와 같아야 한다 (aip 항목은 모두 등록). Task 4 Step 4 방법으로 `#gate=7` 영문 DOM 을 덤프해 `The aircraft shall be pushed back` 문장이 보이고 `koBadge` 가 잔여 절차에만 붙는지 확인.

- [ ] **Step 7: 커밋**

```bash
git add tools/i18n/match.mjs tools/i18n/test/match.test.mjs i18n/handbook.en.js tools/i18n/unmatched.json
git commit -m "영문판: AIP 매칭 스크립트·절차 사전 초안(출처 aip)"
```

---

### Task 7: 검수 시트 내보내기·반영 (`sheet-export.mjs`, `sheet-import.mjs`)

**Files:**
- Create: `tools/i18n/sheet-export.mjs`, `tools/i18n/sheet-import.mjs`
- Test: `tools/i18n/test/sheet.test.mjs`

**Interfaces:**
- Produces (export): `toCsv(rows: object[], cols: string[]): string`, `fromCsv(text: string): object[]` (RFC 4180, BOM 포함 UTF-8, CRLF)
- 시트 열 (절차): `key, gid, title, ko, en, title_en, src, aip, status, note`
- 시트 열 (UI): `key, en, status` — UI 는 `ui.en.js` 에 status 가 없으므로 내보낼 때 `ok` 로 채우고, 반영 시 `en` 만 갱신
- CLI: `node tools/i18n/sheet-export.mjs <out.csv> [--ui]`, `node tools/i18n/sheet-import.mjs <in.csv> [--ui]`

- [ ] **Step 1: 실패하는 테스트** — `tools/i18n/test/sheet.test.mjs`

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { toCsv, fromCsv, applySheet } from "../sheet-import.mjs";

test("toCsv/fromCsv 왕복: 쉼표·따옴표·줄바꿈·한글", () => {
  const rows = [{ key: "7:0", ko: "a, \"b\"\n* 주의", en: "x" }, { key: "9:1", ko: "가", en: "" }];
  const csv = toCsv(rows, ["key", "ko", "en"]);
  assert.ok(csv.startsWith("\uFEFFkey,ko,en\r\n"));
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
```

- [ ] **Step 2: 실패 확인** — `node --test tools/i18n/test/sheet.test.mjs` → FAIL

- [ ] **Step 3: 구현** — `tools/i18n/sheet-import.mjs` (CSV 유틸과 반영 로직을 여기 두고 export 는 이 파일을 import)

```js
// tools/i18n/sheet-import.mjs — 검수 시트(CSV) → i18n/handbook.en.js / i18n/ui.en.js 반영
// 사용: node tools/i18n/sheet-import.mjs <in.csv>        (절차 사전)
//       node tools/i18n/sheet-import.mjs <in.csv> --ui   (UI 사전: en 만 갱신)
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { loadGlobal, serializeDict } from "./lib.mjs";
const require = createRequire(import.meta.url);
const { hbHash } = require("../../i18n/i18n.js");

const q = s => { s = String(s ?? ""); return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
export function toCsv(rows, cols) {
  return "\uFEFF" + [cols.join(","), ...rows.map(r => cols.map(c => q(r[c])).join(","))].join("\r\n") + "\r\n";
}
export function fromCsv(text) {
  text = text.replace(/^\uFEFF/, "");
  const out = [], row = [], push = () => { row.push(cell); cell = ""; };
  let cell = "", inQ = false, i = 0;
  const rows = [];
  while (i < text.length) {
    const ch = text[i];
    if (inQ) { if (ch === '"') { if (text[i + 1] === '"') { cell += '"'; i += 2; continue; } inQ = false; i++; continue; } cell += ch; i++; continue; }
    if (ch === '"') { inQ = true; i++; continue; }
    if (ch === ",") { push(); i++; continue; }
    if (ch === "\r" || ch === "\n") { push(); rows.push(row.splice(0)); if (ch === "\r" && text[i + 1] === "\n") i++; i++; continue; }
    cell += ch; i++;
  }
  if (cell || row.length) { push(); rows.push(row.splice(0)); }
  const [head, ...body] = rows.filter(r => r.length > 1 || r[0] !== "");
  return body.map(r => Object.fromEntries(head.map((h, k) => [h, r[k] ?? ""])));
}

export function applySheet(handbook, prev, sheet) {
  const dict = { ...prev }, skipped = [];
  for (const r of sheet) {
    const [gid, i] = r.key.split(":");
    const p = (handbook[gid] || [])[+i];
    if (!p) { skipped.push(r.key); continue; }
    if (!String(r.en || "").trim()) continue;
    const e = { en: r.en, src: r.src || "tr", hash: hbHash(String(p[1] || "")), status: r.status === "ok" ? "ok" : "review" };
    if (r.title_en) e.title = r.title_en;
    if (r.aip) e.aip = r.aip;
    dict[r.key] = e;
  }
  return { dict, skipped };
}

if (process.argv[1] && /sheet-import\.mjs$/.test(process.argv[1])) {
  const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "..", "..");
  const [file, flag] = process.argv.slice(2);
  const sheet = fromCsv(fs.readFileSync(file, "utf8"));
  if (flag === "--ui") {
    const UI = loadGlobal(path.join(ROOT, "i18n/ui.en.js"), "UI_EN");
    let n = 0; for (const r of sheet) if (r.key in UI && String(r.en || "").trim()) { UI[r.key] = r.en; n++; }
    const header = `// i18n/ui.en.js — UI 문구 사전. 키는 한글 원문 그대로 (index.html 의 t()/tf() 호출과 1:1)
// 매개변수는 {이름} 자리표시자. 검수 완료 항목만 main 에 올린다`;
    fs.writeFileSync(path.join(ROOT, "i18n/ui.en.js"), serializeDict("UI_EN", header, UI), "utf8");
    console.log(`UI 사전 ${n}건 반영`);
  } else {
    const HANDBOOK = loadGlobal(path.join(ROOT, "gates.js"), "HANDBOOK");
    const prev = loadGlobal(path.join(ROOT, "i18n/handbook.en.js"), "HB_EN");
    const { dict, skipped } = applySheet(HANDBOOK, prev, sheet);
    const header = fs.readFileSync(path.join(ROOT, "i18n/handbook.en.js"), "utf8").split("\nconst HB_EN")[0];
    const order = Object.keys(dict).sort((a, b) => (parseInt(a) - parseInt(b)) || a.localeCompare(b));
    fs.writeFileSync(path.join(ROOT, "i18n/handbook.en.js"), serializeDict("HB_EN", header, dict, order), "utf8");
    console.log(`절차 사전 ${Object.keys(dict).length}건, 건너뜀 ${skipped.length}건 ${skipped.join(" ")}`);
  }
}
```

`tools/i18n/sheet-export.mjs`:

```js
// tools/i18n/sheet-export.mjs — 검수 시트 내보내기. 절차: 사전 항목 + 잔여(unmatched) 를 한 시트에
// 사용: node tools/i18n/sheet-export.mjs <out.csv> [--ui]
import fs from "node:fs";
import path from "node:path";
import { loadGlobal } from "./lib.mjs";
import { toCsv } from "./sheet-import.mjs";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "..", "..");
const [out, flag] = process.argv.slice(2);
if (flag === "--ui") {
  const UI = loadGlobal(path.join(ROOT, "i18n/ui.en.js"), "UI_EN");
  const rows = Object.entries(UI).map(([key, en]) => ({ key, en, status: "ok" }));
  fs.writeFileSync(out, toCsv(rows, ["key", "en", "status"]), "utf8");
  console.log(`UI ${rows.length}건 → ${out}`);
} else {
  const HANDBOOK = loadGlobal(path.join(ROOT, "gates.js"), "HANDBOOK");
  const HB_EN = loadGlobal(path.join(ROOT, "i18n/handbook.en.js"), "HB_EN");
  const rows = [];
  for (const gid of Object.keys(HANDBOOK).sort((a, b) => (parseInt(a) - parseInt(b)) || a.localeCompare(b))) HANDBOOK[gid].forEach((p, i) => {
    const key = gid + ":" + i, e = HB_EN[key] || {};
    rows.push({ key, gid, title: p[0], ko: p[1], en: e.en || "", title_en: e.title || "", src: e.src || "", aip: e.aip || "", status: e.status || "", note: "" });
  });
  fs.writeFileSync(out, toCsv(rows, ["key", "gid", "title", "ko", "en", "title_en", "src", "aip", "status", "note"]), "utf8");
  console.log(`절차 ${rows.length}건 (영문 있음 ${rows.filter(r => r.en).length}) → ${out}`);
}
```

- [ ] **Step 4: 테스트 통과 확인** — `node --test tools/i18n/test/` → 전체 pass

- [ ] **Step 5: 왕복 확인**

```powershell
node tools/i18n/sheet-export.mjs "$env:TEMP\hb.csv"; node tools/i18n/sheet-import.mjs "$env:TEMP\hb.csv"; git diff --stat i18n/handbook.en.js
```

Expected: `handbook.en.js` 변경 0줄 (내보낸 것을 그대로 반영하면 같아야 한다).

- [ ] **Step 6: 커밋**

```bash
git add tools/i18n/sheet-export.mjs tools/i18n/sheet-import.mjs tools/i18n/test/sheet.test.mjs
git commit -m "영문판: 검수 시트 내보내기·반영 스크립트"
```

---

### Task 8: 용어집, 잔여 문장 번역 초안, 검수 시트 전달

**Files:**
- Create: `i18n/glossary.md`
- Modify: `i18n/handbook.en.js` (sheet-import 로), `i18n/ui.en.js`
- Create: `docs/superpowers/reviews/20260912_영문판_검수시트.csv` (팀 검수용 산출물)

**Interfaces:**
- Consumes: `unmatched.json` (Task 6), `sheet-export/import` (Task 7)

- [ ] **Step 1: 용어집 작성** — `i18n/glossary.md`

spec 6절 표를 그대로 옮기고 아래 번역 규칙을 덧붙인다.

```markdown
# 영문판 용어집 (AIP RKSI 표기 기준)

(spec 6절 표 전체)

## 잔여 문장 번역 규칙 (src: tr)
- 문장 구조는 AIP 를 따른다: "The aircraft shall be pushed back … to face <방향>." 방향은 north/south/east/west 소문자.
- 정대 = "until its nosewheel is at spot N" / "with its nosewheel and fuselage on taxilane R1".
- 유도로 이동 항공기 = "aircraft taxiing on taxiway A4". 후류 = "jet blast". 견인 = "towed forward".
- 핸드북의 "* 주의 문구" 는 영문에서도 " * " 로 구분해 같은 순서로 둔다 (앱이 빨간 주의 문구로 렌더). 예:
  "…푸쉬백한다 * 후류 주의" → "… to face south. * Beware of jet blast."
- 핸드북이 AIP 보다 상세하면 AIP 문장 뒤에 보충문을 붙이고 src 를 aip+tr 로 둔다.
- 지시·통제 뉘앙스 금지: "instruct", "control", "must comply" 를 쓰지 않는다. 절차는 "shall be pushed back" (AIP 원문) 또는 "Push back …" 명령형.
```

- [ ] **Step 2: 잔여 문장 번역 초안**

`node tools/i18n/sheet-export.mjs "$env:TEMP\hb.csv"` 로 시트를 뽑고, `en` 이 빈 행(`unmatched.json` 과 같은 key)의 `en` 을 용어집 규칙으로 채운다. `src` 는 `tr`, `status` 는 `review`. `candidates` 에 같은 주기장의 AIP 문장이 있으면 그 문장을 바탕으로 보충하고 `src` 를 `aip+tr` 로 둔다. 제목이 한글인 항목(예: "MRO 이동절차")은 `title_en` 을 채운다 ("MRO towing procedure").

같은 한글 원문이 여러 주기장에 반복되므로(고유 184문장) 먼저 `ko` 열 기준으로 고유 문장을 뽑아 번역한 뒤 채운다:

```powershell
node --input-type=module -e "import fs from 'node:fs';import {fromCsv} from './tools/i18n/sheet-import.mjs';const r=fromCsv(fs.readFileSync(process.env.TEMP+'/hb.csv','utf8')).filter(x=>!x.en);const u=[...new Set(r.map(x=>x.ko))];console.log(u.length);u.forEach(x=>console.log('-',x))"
```

번역을 시트에 채운 뒤 반영: `node tools/i18n/sheet-import.mjs "$env:TEMP\hb.csv"`

- [ ] **Step 3: 커버리지 확인**

Run: `node tools/i18n/coverage.mjs --no-status`
Expected: "절차 사전 없음: 0건", "해시 불일치: 0건". "절차 미검수" 는 전건(검수 전).

- [ ] **Step 4: 검수 시트 생성·전달**

```powershell
node tools/i18n/sheet-export.mjs docs/superpowers/reviews/20260912_영문판_검수시트.csv
node tools/i18n/sheet-export.mjs docs/superpowers/reviews/20260912_영문판_UI검수시트.csv --ui
```

사용자에게 두 파일 경로와 함께 보고한다: 절차 건수, 그중 `aip` / `tr` / `aip+tr` 건수, UI 문구 건수. 검수자는 `en`·`title_en` 을 고치고 `status` 를 `ok` 로 바꾼다.

- [ ] **Step 5: 커밋**

```bash
git add i18n/glossary.md i18n/handbook.en.js i18n/ui.en.js docs/superpowers/reviews/20260912_영문판_검수시트.csv docs/superpowers/reviews/20260912_영문판_UI검수시트.csv
git commit -m "영문판: 용어집·잔여 문장 번역 초안·검수 시트"
```

---

### Task 9: 스크린샷·회귀 점검 (검수 전 시각 확인)

**Files:**
- Modify: `tools/review/shots.ps1` — `Lang` 매개변수
- Create: `docs/superpowers/reviews/raw/shot-*-en.png` (생성물)

- [ ] **Step 1: `shots.ps1` 에 언어 매개변수**

1행 `param(...)` 에 `,[string]$Lang="ko"` 추가. `$url` 에 `&lang=$Lang` 추가. `$png` 이름을 `"shot-$view-$theme-$Lang.png"` 로 바꾼다 (기존 한글 산출물 이름이 바뀌므로 `docs/superpowers/reviews/` 의 참조가 있으면 함께 고친다: `grep -rn "shot-home-light.png" docs/`).

- [ ] **Step 2: 360px 스크린샷 KO/ENG**

```powershell
powershell -File tools/review/shots.ps1 -W 360 -H 780 -Gate 7 -Lang ko
powershell -File tools/review/shots.ps1 -W 360 -H 780 -Gate 7 -Lang en
```

Expected: 12장 OK. `shot-home-light-en.png` 에서 헤더 제목·ENG 버튼·테마 버튼이 한 줄이고 잘림이 없어야 한다. 넘치면 `.brand{font-size:16px}` 를 유지한 채 `#langBtn,#themeBtn` 의 `padding` 을 `8px 11px` 로 줄이고 다시 찍는다. 그래도 넘치면 spec 4절대로 테마 버튼을 아이콘만 남기는 안을 사용자에게 제시한다.

- [ ] **Step 3: 회귀 점검**

```powershell
powershell -File tools/review/check.ps1 -SkipShots
node --test tools/i18n/test/
node tools/i18n/coverage.mjs --no-status
git diff --stat main -- gates.js 주기장별절차 img
```

Expected: 문법 OK, 콘솔 오류 없음, 테스트 전체 pass, 커버리지 미검수 외 0건, 마지막 diff 는 빈 출력.

- [ ] **Step 4: 사용자 보고 후 커밋**

KO/ENG 전후 비교 이미지(홈·상세·라이트박스, 라이트·다크)를 먼저 보여 준다. 커밋:

```bash
git add tools/review/shots.ps1 docs/superpowers/reviews/raw/
git commit -m "영문판: 360px KO/ENG 스크린샷·회귀 점검 결과"
```

여기까지가 Phase 1·2. 검수는 사람이 한다. 검수 시트가 돌아오면 Task 10.

---

### Task 10: 검수 반영·배포 (Phase 3)

**Files:**
- Modify: `i18n/handbook.en.js`, `i18n/ui.en.js` (sheet-import)
- Modify: `index.html` 4100행 `C_VER`, `sw.js` 1행 `C`
- Modify: `CLAUDE.md` 프로젝트 개요 (i18n 파일 한 줄 추가)

- [ ] **Step 1: 검수 시트 반영**

```powershell
node tools/i18n/sheet-import.mjs "<검수된 절차 시트.csv>"
node tools/i18n/sheet-import.mjs "<검수된 UI 시트.csv>" --ui
node tools/i18n/coverage.mjs
```

Expected: 종료코드 0 (미검수 0건 포함). 미검수가 남으면 목록을 사용자에게 보내고 멈춘다.

- [ ] **Step 2: 버전 상향**

main 의 현재 값을 읽어 +1 한다 (`git show main:index.html | grep -n "C_VER="`). `index.html` `var C_VER="vNNN";` 과 `sw.js` `const C="pushback-vNNN";` 을 같은 번호로. 병합 커밋 메시지의 `(vNNN)` 도 이 번호.

- [ ] **Step 3: CLAUDE.md 갱신** — "프로젝트 개요" 에 한 줄 추가:

```
- 영문판: 언어 상태·사전 조회는 `i18n/i18n.js`, 문구 사전은 `i18n/ui.en.js`(한글 원문이 키)·`i18n/handbook.en.js`(주기장:순번 키, 출처·해시·검수 상태). 사전은 `tools/i18n/` 스크립트로만 갱신한다. 새 한글 문구는 `t()`/`tf()`/`data-t` 로 감싸고 `node tools/i18n/coverage.mjs` 로 확인한다.
```

- [ ] **Step 4: 배포 체크리스트 (CLAUDE.md)**

1. `C_VER` 와 `C` 동일 번호 확인: `grep -n "C_VER=\|const C=" index.html sw.js`
2. `powershell -File tools/review/check.ps1 -SkipShots` → 콘솔 오류 없음
3. `git diff --stat main -- gates.js 주기장별절차 img` → 빈 출력
4. Task 9 Step 2 스크린샷을 KO/ENG 최종본으로 다시 찍어 사용자에게 보고하고 승인을 받는다.

- [ ] **Step 5: 커밋·병합**

```bash
git add i18n/ index.html sw.js CLAUDE.md docs/superpowers/reviews/raw/
git commit -m "영문판: 검수 반영·버전 상향"
git checkout main && git merge --no-ff feature/english -m "영문판: 헤더 KO/ENG 전환·AIP 기반 절차 영문·UI 사전 (vNNN)"
git push origin main
```

병합 커밋 번호 `(vNNN)` 은 Step 2 의 번호와 같아야 한다.
