# 영문판 (KO/ENG 전환) 설계

- 작성일: 2026-09-12
- 상태: 사용자 승인 대기
- 기획 캔버스: https://claude.ai/code/artifact/7ae92943-e5ad-4b38-b154-1226893b0c93
- 영문 원문 근거: AIP 대한민국 RKSI AD 2 (AIRAC AMDT 7/26, 2026-06-26) PUSHBACK PROCEDURES 표. 로컬 `C:\Users\kk980\Desktop\WORK\AIP\RKSI\20260626_RKSI-TEXT.pdf`

## 1. 목적·대상

□ 인천공항 계류장 외국인 지상조업 작업자의 현장 실사용과 해외 공항·기관 소개용을 함께 충족
□ 기존 밀어요 PWA 안에서 KO/ENG 전환. 도면·애니메이션·GPS·경로이탈 로직은 공유하고 문구만 사전 파일로 분리
□ 절차 본문 영문은 AIP RKSI AD 2 표의 공식 문장을 우선 사용. AIP에 없는 핸드북 고유 문장만 번역
□ 검수는 팀 내부(작성자·동료). 안전 문구는 삭제·완화 없이 사실 고지 형태 유지
□ 범위 밖: 도면제작TOOL(내부용, 한글 유지), 로고 변경(별도 건), 단말 언어 자동 감지

## 2. 현황 (2026-09-12 측정)

| 구분 | 위치 | 규모 | 비고 |
|---|---|---|---|
| UI 문구 | `index.html` | 한글 포함 410행 | i18n 장치 없음, `lang="ko"` 고정 |
| 절차 본문 | `gates.js` HANDBOOK | 649건, 고유 184문장 (한글 약 24,000자) | 반복 템플릿 많음 |
| 절차 제목 | `gates.js` HANDBOOK | 고유 80건 | 79건 이미 영문. 한글 1건 "MRO 이동절차" |
| AIP 영문 원문 | RKSI AD 2 표 | 약 328행, 157문장, 66 phraseology | 주기장별 procedure + phraseology |
| 주의사항 | `gates.js` CAUTIONS | 1건 (주기장 130) | |
| 애니메이션 단계 | `주기장별절차/*.json` steps.txt | 3건 | |
| 도면 SVG 라벨 | `img/*.svg` | 표본 확인 시 한글 없음 | Phase 1 스크립트로 전수 확인 |

□ 실제 번역 부담은 AIP에 없는 잔여 문장(예상 30~50문장)과 UI 문구에 한정

## 3. 방식 결정

□ 채택: AIP 우선 매칭 + 잔여 번역
  - (주기장, phraseology) 기준으로 AIP 문장을 그대로 사용. 출처 `aip`
  - AIP에 없는 핸드북 고유 문장(예: "A4 유도로 이동 항공기에 영향 없도록 푸쉬백")은 용어집 기준 번역. 출처 `tr`
  - 핸드북 문장이 AIP보다 상세한 경우 AIP 문장 + 번역 보충문으로 구성, 출처 `aip+tr`
□ 기각
  - 전체 자체 번역: AIP 문구와 표현이 갈라지고, 안전 문구를 자체 작성하는 셈이라 감사 시 근거 설명 필요
  - EN 모드 = AIP 표 그대로 표시: 키워드 색칠·애니메이션 연결이 핸드북 항목 기준이라 데이터 모델 이중화, 핸드북 고유 주의 문구 누락

## 4. 화면·동작

□ 언어 버튼
  - 위치: 헤더, 테마 버튼(`#themeBtn`) 바로 왼쪽
  - 형식: 테마 버튼과 같은 알약형·같은 크기 (`#themeBtn` 스타일 공유)
  - 표시: 현재 언어. 한글 모드 "KO", 영문 모드 "ENG". 누를 때마다 전환
  - 360px 화면에서 제목·언어 버튼·테마 버튼이 한 줄에 들어가는지 스크린샷으로 확인. 넘치면 테마 버튼을 아이콘만 남기는 방향으로 조정
□ 언어 상태
  - `localStorage "lang"` 에 `"ko"` | `"en"` 저장. 기본 `"ko"`
  - 전환 시 `document.documentElement.lang` 동기화, 현재 화면(홈 또는 열린 주기장) 즉시 재렌더
  - `<title>`, `apple-mobile-web-app-title` 은 그대로 둠 (설치 이름은 한글 유지)
□ UI 문구
  - 렌더 템플릿·동적 문구의 한글 리터럴을 `t("한글 원문")` 로 감쌈. 한글 원문이 곧 키 (새 키 명명 없음)
  - 사전 미등록 시 한글 원문 그대로 반환 (화면 깨짐 없음, 커버리지 스크립트가 목록 보고)
  - 대상: 헤더·홈·주기장 상세·라이트박스·경로이탈 경보·GPS 상태·오프라인 안내·측정 모드 문구. 이용집계(관리자) 화면은 제외
  - 코드 주석, 콘솔 로그, 커밋 메시지는 한글 유지
□ 절차 본문
  - `hb(gid, i)` 가 HANDBOOK[gid][i] 의 영문을 사전에서 찾아 반환. 없거나 해시 불일치면 한글 원문 + "KO" 배지
  - 배지: 제목 옆 소형 amber 칩 (`--amber-t`/`--amber-bg`/`--amber-bd`), 텍스트 "KO"
  - 제목(phraseology)은 이미 영문이므로 그대로. "MRO 이동절차" 1건만 사전 처리
□ 키워드 색칠 `colorize()`
  - 영문 모드에서 정규식에 `i` 플래그 추가 (AIP 소문자 "blue line", "taxilane R1" 대응)
  - "Point N" 키워드는 영문 모드에서 "spot N" 도 매칭 (AIP 표기 차이 흡수). 별칭 표는 `colorize()` 안에 상수로 둠
  - 색칠 결과가 `kw-go`(도면 절차 재생 연결)로 이어지는 동작은 언어와 무관하게 동일
□ 애니메이션 단계 텍스트(`steps[].txt`)와 CAUTIONS 는 UI 사전과 같은 `t()` 경로로 처리
□ 다크모드·경보·진동 등 기존 동작은 변경 없음

## 5. 데이터·파일 구조

□ `i18n/ui.en.js` — UI 사전
  - `const UI_EN = { "주의사항": "Cautions", "홈화면": "Home", ... }`
  - 매개변수 있는 문구는 템플릿 문자열을 키로 두지 않고, 조각 단위로 분리해 등록 (예: `"번 주기장 도면"` → 조합은 코드에서)
□ `i18n/handbook.en.js` — 절차 사전
  - `const HB_EN = { "7:1": { en: "...", src: "aip", aip: "AMDT 7/26", hash: "c41e9a" }, "7:3": { en: "...", src: "tr", hash: "8b02d7", status: "review" } }`
  - 키 `"주기장ID:순번"`. `hash` 는 한글 원문(HANDBOOK[gid][i][1])의 짧은 해시. 원문이 바뀌면 불일치 → KO 배지로 복귀
  - `status`: `"review"` | `"ok"`. 검수 완료 전 항목도 앱에는 표시하되, 배포는 전건 `"ok"` 가 조건
□ `i18n/glossary.md` — 용어집 (6절)
□ `tools/i18n/` — node 스크립트 (Node 24)
  - `aip-extract.mjs`: AIP PDF 텍스트에서 stand · procedure · phraseology 행 추출 → `tools/i18n/aip-rows.json`. AMDT 번호 기록
  - `match.mjs`: HANDBOOK 649건을 (주기장, 제목 정규화) 기준으로 AIP 행과 대조 → `handbook.en.js` 초안 + 잔여 목록 + 매칭률 보고
  - `sheet-export.mjs`: 검수 시트 CSV (주기장, 순번, 제목, 한글, 영문, 출처, 상태) 내보내기
  - `sheet-import.mjs`: 검수된 CSV → `handbook.en.js` / `ui.en.js` 반영
  - `coverage.mjs`: 렌더 템플릿의 한글 리터럴 추출 → 미등록 목록, 해시 불일치 목록, `status !== "ok"` 목록, SVG 한글 라벨 전수 확인
□ `index.html`: `<script src="i18n/ui.en.js">`, `<script src="i18n/handbook.en.js">` 를 `gates.js` 다음에 로드
□ `sw.js`: 프리캐시 목록에 두 사전 파일 추가. 캐시명 `C` 와 `C_VER` 동시 상향 (현재 v195)

## 6. 용어 규칙 (AIP RKSI 표기 기준)

| 한글 | 영문 | 근거·주의 |
|---|---|---|
| 주기장 | stand (탑승교 주기장은 gate) | AIP "Aircraft Stands". 화면 라벨은 Stand 통일 |
| 유도선 (R1 등) | taxilane R1 | AIP "onto taxilane R1" |
| Blue Line 따라 정대 | along blue line until its nosewheel is at spot N | AIP 원문. 앱 키워드 Point N 은 별칭 처리 |
| 기수방향 북쪽 | to face north | AIP phraseology "Pushback approved to face north" |
| 후류 | jet blast | AIP "to minimize jet blast effect" |
| 견인(토잉) | towed forward | AIP "pushed back … and then towed forward" |
| 관제 지시별 후방견인 절차 | Pushback procedures by phraseology | AIP 표 제목 "Phraseology". instruction / control 표현은 AIP 직접 인용 외 사용 안 함 |
| 계류장관제(호출부호) | Incheon Apron | AIP 호출부호 |
| 경로이탈 감지 (시범) | Route deviation alert (trial) | 단말 위치 기준 고지 문구 동일 유지 |
| 작업자 단말 위치이며 항공기 위치가 아닙니다 | This is the position of the worker's device, not the aircraft | 안전 고지, 완화 불가 |
| 주의사항 | Cautions | |
| 홈화면 | Home | |
| 기본 시점 / 작업자 시점 | Standard view / Crew view | 도면 세그먼트 |
| 운항관리처 | Flight Operations Division | 푸터 |

□ 앱 이름 "밀어요"는 번역하지 않음. 헤더 제목 "항공기 PUSHBACK 절차 안내"는 "Aircraft Pushback Guide"

## 7. 검증

□ `tools/i18n/coverage.mjs`: 미등록 UI 문구 0건, 해시 불일치 0건, `status !== "ok"` 0건, SVG 한글 라벨 0건이 배포 조건
□ 런타임: `serve.ps1 -NoBrowser` + 헤드리스 Edge. KO/ENG 각각 홈·주기장 상세(`#gate=7`)·라이트박스에서 콘솔 오류 0건
□ 시각: 360px KO/ENG 전후 비교 스크린샷을 먼저 공유한 뒤 병합 승인 요청 (헤더 한 줄 수용, 영문 장문에 따른 카드 높이·키워드 줄바꿈 확인)
□ 데이터: `git diff --stat` 으로 `gates.js`·`주기장별절차/`·`img/` 는 변경 없음 확인 (사전 파일만 추가)

## 8. 단계

| 단계 | 산출물 | 완료 기준 |
|---|---|---|
| Phase 1 · i18n 기반 | `t()`, `lang` 상태, 헤더 KO/ENG 버튼, `html lang` 동기화, `ui.en.js`, sw 프리캐시, `coverage.mjs` | ENG 모드에서 한글 UI 문구 0건, 콘솔 오류 0건 |
| Phase 2 · 절차 데이터 | `aip-extract.mjs`, `match.mjs`, `handbook.en.js` 초안(출처 표시), 잔여 번역 초안, 검수 시트 CSV, `hb()`·KO 배지·`colorize()` 영문 대응 | 649건 전부 ENG 또는 KO 배지로 표시. 매칭률 보고 |
| Phase 3 · 검수·배포 | 팀 검수 반영(`sheet-import.mjs`), 360px 스크린샷, 배포 체크리스트, main 병합 (vNNN) | 검수 시트 전건 `ok`. 배포 체크리스트 4항목 완료 |

□ 브랜치: `feature/english` 를 main 에서 분기. Phase 1·2 결과는 브랜치에만 두고 Phase 3 검수 완료 후 병합 (검수 전 영문을 현장에 노출하지 않음)

## 9. 리스크

□ AIP 개정(AIRAC) 시 영문 문장 변경 가능 → `aip` 필드에 AMDT 번호 기록, 개정 시 `aip-extract.mjs` 재실행 후 차이 보고
□ 영문이 한글보다 길어 카드 높이·키워드 줄바꿈 변화 → 360px 스크린샷으로 확인
□ AIP PDF 텍스트 추출이 행 경계를 흐리는 경우(phraseology 줄바꿈) → `aip-extract.mjs` 결과를 검수 시트에 포함해 사람이 확인
□ `t()` 감싸기 누락 → `coverage.mjs` 가 렌더 템플릿의 한글 리터럴을 직접 훑어 보고
