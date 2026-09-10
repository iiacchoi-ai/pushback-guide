# 증거 수집 — critique-B (결정론적 검출기 결과 정리)

역할: 증거 수집만 수행. 최종 판정(수정 여부)은 하지 않음. "오탐 후보"는 판단 근거만 제시.

---

## 1) 검출기 결과 집계 (antipattern별)

### 1-1. 파일 스캔 (audit-detect.json) — 총 2건

| antipattern | 건수 | 파일 | 행 | 스니펫 |
|---|---|---|---|---|
| low-contrast | 2 (동일 항목 중복) | index.html | 0→CSS 17,30행(`--ink-mut` 정의), 실사용 다수(§3 표 참조) | `2.6:1 (need 4.5:1) — text #9aa1ab on #ffffff` |

- line 이 0 이라 Grep 으로 실제 값을 찾음: `--ink-mut:#9aa1ab`(라이트, 17행) / `#ffffff`는 `--card`(16행). 이 조합을 쓰는 선택자는 §3 표에 정리.

### 1-2. URL 스캔 (audit-detect-url.json) — 총 36건 (홈 10 / 상세(gate=250) 26)

| antipattern | 홈 | 상세(gate=250) | 대표 스니펫 |
|---|---|---|---|
| low-contrast | 2 | 2 | `3.5:1 (need 4.5:1) — text #6b7480 on #1b1e23` (다크 `--ink-mut`/`--card`) |
| ai-color-palette | 6 | 23 | "Cyan neon text on dark background" 21회, "Purple/violet neon text on dark background" 2회(상세만) |
| layout-transition | 1 | 1 | `transition: height` |
| text-occlusion | 0 | 1 | `div.animHint "항공기를 탭하면 그 절차가 재생됩니다 ▶" is 100% covered by overlapping text (path)` |

- low-contrast(URL, 다크): CSS 30행 `--ink-mut:#6b7480`(다크), 28행 `html[data-theme="dark"]` 블록 시작. `--card`(다크)=29행 아님, 실제 29행은 `--line` 등 — `--card:#1b1e23` 는 29행. 사용 선택자는 §3 표.
- ai-color-palette: 색상값 직접 지정 없이 "인상(perceptual)" 판정이라 CSS/JS 상 단일 지점을 특정하기 어려움. 홈·상세 공통으로 반복되는 건 `--accent`(다크 `#5dcaa5`, 15행 목록 기준 CSS 전역 15곳에서 `var(--accent)` 사용, index.html 31행 정의)로 추정 — 버튼·배지·안내문 등 앱 전역 브랜드 색이 화면 전반에 걸쳐 청록(민트~시안 계열)으로 반복 노출되는 구조. "Purple/violet" 2건은 상세 화면(gate=250)에서만 나와 도면 SVG 항공기 팔레트(예: `#6a2a96`,`#a010a0`, 654~660행 `KWCOLOR` 매핑, 967~979행 등 개별 주기장 paths)일 가능성이 높음.
- layout-transition: index.html 341행 `.animWrap.wvAnim{transition:height .45s ease;}` — 작업자 시점 전환 시 카드 높이 변경 애니메이션. 홈·상세 모두에서 잡힌 것은 CSS 규칙 자체가 스캔되었기 때문으로 보임(실제 애니메이션은 상세 화면에서만 발생).
- text-occlusion: index.html 324~329행 `.animHint` CSS(`position:absolute;left:10px;bottom:10px;background:rgba(15,20,28,.78);...`), HTML 출력은 771행(`"항공기를 탭하면 그 절차가 재생됩니다 ▶"`, gate 250은 애니메이션형 절차 카드). `.animHint` 자체는 반투명 배경 박스를 갖고 있어 정상 상태라면 가려지지 않아야 함 — SVG `path`(견인 경로선 등)가 그 위에 겹쳐 그려진 것으로 추정되나 원인(SVG z-index/좌표) 미확인.

### 오탐 후보 판단 근거 (판정 아님, 표시만)

| 항목 | 오탐 후보 사유 |
|---|---|
| ai-color-palette "Cyan neon" (21건) | `--accent`(다크 `#5dcaa5`)는 앱 전역 디자인 토큰이며 라이트/다크 대비 모두 AA 이상 통과(§2 참조). 랜덤 네온 효과가 아니라 일관된 브랜드 색으로 의도적 설계 가능성. |
| ai-color-palette "Purple/violet" (2건, 상세만) | CLAUDE.md 지시대로 도면 SVG 항공기 팔레트(KWCOLOR, 654~660행)는 데이터이며 디자인 토큰 대상이 아님. 상세 화면에만 나타나는 점이 도면 렌더링 기원임을 뒷받침. |
| layout-transition (height, 341행) | 작업자 시점 전환 시 카드 높이를 의도적으로 애니메이션하는 기능(경보 배너류 아님). 성능 이슈 소지는 남지만 "의도치 않은 버그"는 아닐 수 있음. |
| text-occlusion (animHint) | `.animHint` 는 자체 반투명 배경 박스가 있어 통상적으로는 가려지지 않아야 함 — 오탐이 아니라 실제 겹침(SVG path 레이어 순서 문제)일 가능성도 있어 오탐 여부 불확실. 스크린샷 재확인 필요. |
| low-contrast (ink-mut, 4건) | CSS 변수로 앱 전역에 쓰이는 회색조 텍스트(§3). 데이터/장식색이 아니라 실사용 UI 텍스트 색이라 오탐 후보로 보기 어려움. |

수집 실패·생략: 없음(2개 JSON 모두 정상 파싱, 전건 반영).

---

## 2) 대비(WCAG) 미달 조합 — 총 24건 중 AA 미달 4건 / AAA 미달(AA 통과) 15건 / 둘 다 통과 5건

### AA(4.5:1) 미달 — 총 4건

| 테마 | fg | bg | 값 | 비율 | 사용 선택자(Grep, index.html) |
|---|---|---|---|---|---|
| light | --ink-mut(#9aa1ab) | --card(#ffffff) | 2.61 | — | 59,71,88,110,119,120,142,151,188,192,224,234,279,317,382행 `color:var(--ink-mut)` (카드 배경 위) + 523,531,532행 SVG 텍스트 `fill="var(--ink-mut)"`, 3830행 |
| light | --ink-mut(#9aa1ab) | --bg(#eef0f3) | 2.28 | — | 위와 동일 선택자 중 `--bg`(회색 배경) 위에서 쓰이는 곳(예: 151행 `.noresult`가 리스트 화면 배경 위) |
| dark | --ink-mut(#6b7480) | --card(#1b1e23) | 3.53 | — | 위와 동일 선택자 목록(다크 변수만 6b7480으로 치환, 30행) |
| dark | --ink-mut(#6b7480) | --bg(#101214) | 3.96 | — | 동일 |

`--ink-mut` 을 `color`(또는 `fill`)로 쓰는 선택자 전체(라이트/다크 공통 CSS 변수라 동일 목록): `.brand small`(59), `.helloLogoTxt small`(71), `#gpsStatus`(88), `.numDisp.empty`(110), `.key.del`(119), `.subT`(120), `.zone .zc`(142), `.noresult`(151), `.gateHead .zn`(188), `.row .k`(192), `.kwNote`(224), `.meta`(234), `.typePick .lb`(279), `.stT td.dim`(317), 382행(줌힌트류 소계), SVG 텍스트(523,531,532), 3830행(안내 placeholder).

### AAA(7:1) 미달, AA 통과 — 총 15건

| 테마 | fg | bg | 비율 | 비고 |
|---|---|---|---|---|
| light | --ink-sub / --card | 5.98 | | 
| light | --ink-sub / --bg | 5.24 | |
| light | --accent / --card | 6.2 | |
| light | --accent / --accent-soft | 5.46 | |
| light | --amber-t / --amber-bg | 5.37 | |
| light | --amber-t / --card | 5.93 | |
| light | --red-t / --red-bg | 5.91 | |
| light | --red-t / --card | 6.57 | |
| dark | --accent / --accent-soft | 6.8 | |
| dark | --red-t / --red-bg | 6.82 | |
| dark | --red-t / --card | 6.89 | |
| fixed | gpsBtn.on (fff/#0a7d4f) | 5.17 | 85행 `.gpsBtn.on` |
| fixed | candBtn.first (fff/var(--accent)) | 6.2 | 103행 `.candBtn.first` |
| (light amber-t/card 중복 방지용 — 위와 동일) | | | |
| (light red-t/card 중복 방지용 — 위와 동일) | | | |

주: light `--red-body`/`--red-bg`(8.89), dark 동일 조합(8.18), light/dark `--ink`/`--card`·`--ink`/`--bg`, `--btn-text`/`--btn-bg`, `--badge-text`/`--badge`, dark `--ink-sub`/*, dark `--amber-t`/* 는 AAA 까지 통과(총 5건 완전 통과 중 대표)하여 표에서 제외.

수집 실패·생략: 없음. `fixed` 배열 10건 중 AA/AAA 모두 통과한 8건(zoomHint, lbTip, lbZoom .pct, animMsg, msgChk, wvSeg, wvSeg.on, wvBadge)은 미달 표에서 제외.

---

## 3) 터치 타깃 48px 미만 — 총 9종(요소 유형) × 2테마(라이트/다크 값 동일, 텍스트만 테마별 상이) — 44px 미만도 전항목 동일하게 해당

라이트/다크 모두 크기(w×h)는 동일(테마 버튼 텍스트 길이 차이로 width만 다름). 화면별 표 분리.

### 홈 화면 — 48px 미만 4종

| 선택자/클래스·id | 텍스트 | w×h (라이트/다크) | 44px 미만 |
|---|---|---|---|
| `#themeBtn` | "라이트"/"다크" | 61×32 / 51×32 | 예 |
| `.dlBtn#preBtn` | "전체 도면 다운로드" | 133×32 | 예 |
| `.zoneBtn#zoneBtn` | "구역별 전체 보기 ▾" | 358×38 | 예 |

(`.gpsBtn`(358×48), 숫자 키패드 `.key`×12(113×59)는 48px 이상 — 위반 아님, 표 제외)

### 상세 화면 — 48px 미만 6종(버튼류) + 텍스트/마커 인라인 2종

| 선택자/클래스·id | 텍스트 | w×h | 44px 미만 | 비고 |
|---|---|---|---|---|
| `#themeBtn` | "라이트"/"다크" | 61×32 / 51×32 | 예 | 홈과 동일 요소 |
| `.back` | "홈화면" | 103×43 | 예 | |
| `.navBtn` (2개, 이전/다음) | "‹ 249", "251 ›" | 77×43, 74×43 | 예 | 2개를 1행으로 묶음 |
| `.wvSeg button#wvBase` | "기본 시점" | 64×26 | 예 | 작업자 시점 전환 세그먼트 |
| `.wvSeg button#wvWork` | "작업자 시점" | 74×26 | 예 | 위와 동일 그룹 |
| `.mapLocBtn#devBtn` | "경로이탈 감지 시작 (시범)" | 322×40 | 예 | |

`.animWrap svg#animSvg`(322×239)는 48px 이상(컨테이너) — 표 제외.

### 버튼이 아닌 요소 (텍스트 인라인 / SVG 마커) — 별도 구분

| 선택자 | 유형 | 텍스트/역할 | w×h | 개수 | 44px 미만 |
|---|---|---|---|---|---|
| `.kw-go` (span, 키워드 클릭형) | 텍스트 인라인 | "East","West","Point 34","Point 35","Point 39" | 30×19~57×19 | 5 | 예 |
| `.hitG` (svg g, 절차 지점 히트영역) | SVG 마커 | (텍스트 없음) | 31×31 | 5 | 예(31<44) |

수집 실패·생략: 없음. 라이트·다크 JSON 은 home 16건/detail 18건으로 요소 수·좌표 구조 동일, 값 차이는 테마 텍스트 길이(themeBtn) 뿐이라 두 테마를 표 하나로 병합.

---

## 4) 색 하드코딩 — CSS 27건 / JS 인라인 스타일 77건(대표만 표기) / JS 색 리터럴 344건(대부분 도면 데이터)

### 4-1. cssHardcoded — 총 27건, 다크모드 대응 여부

전체 27건 중 **다크 전용 대응 토큰이 있는 것은 1건(160/161행 쌍)뿐** — 나머지 26건은 `html[data-theme="dark"]` 블록에 대응 규칙이 없어 다크에서도 동일 값 고정. (파일 전체에서 다크 전용 블록은 28행 `:root` 대응부와 161행 단 2곳뿐.)

| 행 | 값 | 소스(요약) | 다크에서 바뀜? |
|---|---|---|---|
| 7 | #eef0f3 | `<meta name="theme-color">` 기본값 | 예(단, CSS 아님 — 590행 JS가 다크시 `#101214`로 교체) |
| 85 | #0a7d4f, #fff, rgba(10,125,79,.18) | `.gpsBtn.on` | 아니오 |
| 103 | #fff | `.candBtn.first` (색은 var(--accent), 텍스트만 고정 흰색) | 아니오 |
| 160 | rgba(20,24,32,.06) | `.navBar.stuck` box-shadow(라이트) | **예**(161행에 다크 전용 값 있음) |
| 161 | rgba(0,0,0,.35) | `html[data-theme="dark"] .navBar.stuck` | (161행 자체가 다크 대응값) |
| 227 | rgba(180,35,24,.1) | `.caution .secT .icChip` 배경 | 아니오 |
| 237 | #161a21 | 도면 썸네일 박스 배경 | 아니오 |
| 242 | rgba(15,20,28,.72), #e8eef7 | 확대 힌트 배지 | 아니오 |
| 246 | rgba(8,10,14,.95) | 라이트박스 오버레이 배경 | 아니오 |
| 257 | rgba(255,255,255,.14) | 라이트박스 줌 컨트롤 배경 | 아니오 |
| 261 | #fff | 라이트박스 닫기 버튼 텍스트색 | 아니오 |
| 264 | rgba(255,255,255,.18) | 줌 버튼 active | 아니오 |
| 265 | #cfd8e3 | `.lbZoom .pct` | 아니오 |
| 268 | rgba(255,255,255,.14), #fff | 줌 배지류 | 아니오 |
| 273 | #9aa8bb | `lbTip` | 아니오 |
| 300 | rgba(9,14,22,.9), rgba(93,202,165,.55) | `.animMsg` 배경/테두리 | 아니오 |
| 301 | #dff7ec | `.animMsg` 텍스트 | 아니오 |
| 304 | #5dcaa5 | `.animMsg b` | 아니오 |
| 306 | rgba(93,202,165,.8) | `.animMsg.flw` 테두리 | 아니오 |
| 309 | #5dcaa5, #06231a | `.animMsg .msgChk` | 아니오 |
| 322 | #fff | `.stAct button.pri` 텍스트 | 아니오 |
| 325 | rgba(15,20,28,.78), #e8fff4 | `.animHint` | 아니오 |
| 332 | rgba(15,20,28,.82) | `.wvSeg` 배경 | 아니오 |
| 335 | #9fb3c8 | `.wvSeg button`(비선택) | 아니오 |
| 336 | #7FC4FF, #0B2E59 | `.wvSeg button.on` | 아니오 |
| 338 | rgba(0,224,138,.16), #00e08a | `.wvBadge` | 아니오 |
| 372 | #fff | 경보 배너류 버튼 텍스트 | 아니오 |

오탐 후보 근거: 237,246,257,264,265,268,273,300,301,304,306,309,325,332,335,336,338행 다수는 "도면/라이트박스/작업자시점 오버레이"용 고정 다크 UI(항상 어두운 배경 위에 뜨는 오버레이·배지류)로, 애초에 라이트·다크 테마와 무관하게 고정 다크로 설계됐을 가능성(§2 `fixed` 배열과 대응) — 즉 "다크모드 미대응"이 아니라 "테마 비의존 고정 다크 컴포넌트"일 수 있음. 최종 판정은 보류.

### 4-2. jsInlineStyle — 총 77건

대부분(약 65건)은 색상이 아닌 `display:none/block`, `transform`, `width/height/margin`(카메라 추적·확대축소 좌표 계산용) 토글/레이아웃 코드. 색상값이 포함된 항목은: 3930~3933행(`var(--btn-bg)`,`var(--btn-text)` — 토큰 사용, 하드코딩 아님), 2982행(`wrap.style.background="#0a0e1a"`, 도면 배경색 고정), 3935행(`background:var(--accent);color:#fff`). 나머지는 색상 무관 — 표 생략.

### 4-3. jsColorLiteral — 총 344건, UI 색만 추려 표시(제외 331건: 도면/데이터)

- 제외 331건 = KWCOLOR 팔레트 정의(654~660행, 7건: PPT 색코드→렌더색 매핑) + 개별 주기장 `paths:[...]` 데이터(893~3084행 부근, 324건: 주기장별 항공기/지시선 색 배열). 모두 도면 원본색이며 디자인 토큰 대상 아님(CLAUDE.md 명시).

| 행 | 값 | 소스 | 구분 |
|---|---|---|---|
| 590 | #101214, #eef0f3 | `mc.setAttribute("content", dark? "#101214":"#eef0f3")` | UI(테마색 메타 태그 갱신, `--bg` 값과 동일 — 토큰 미사용 이중관리) |
| 2896 | #e01b0f | `const LONG_TOW={"558":"#e01b0f"}` | 경계— 특정 항공기 번호(558)의 장거리 견인 경로 표시색. 데이터에 가까우나 KWCOLOR 매핑을 거치지 않은 직접 리터럴 |
| 2982 | #0a0e1a | `wrap.style.background="#0a0e1a"` | UI(카메라 추적 시 기울어진 프레임 바깥 여백 배경, 도면 배경색과 통일 목적 — 주석 명시) |
| 3075 | #ffffff | `feFlood flood-color="#ffffff"`(SVG 실루엣 테두리 필터) | UI(항공기 아웃라인 효과, 테마 무관 흰 테두리) |
| 3933 | rgba(0,0,0,.25) | 업데이트 알림 바 box-shadow | UI |
| 3935 | #fff | 업데이트 알림 바 버튼 텍스트색(배경은 `var(--accent)`) | UI |

수집 실패·생략: jsColorLiteral 331건은 개별 행 나열 생략(도면 데이터, 표 대상 아님) — 근거는 위 "제외" 설명.

---

## 수집 실패·생략 항목

- jsColorLiteral 344건 중 331건(KWCOLOR 매핑 7건 + 주기장별 paths 데이터 324건)은 표에서 개별 나열 생략 — 도면 SVG 데이터 색이라 UI 색 표 대상이 아님(지시사항 4항).
- jsInlineStyle 77건 중 색상 무관 약 65건(표시/좌표/transform 토글)은 표에서 생략 — 지시사항이 "색" 표를 요구했기 때문.
- ai-color-palette·layout-transition·text-occlusion 은 검출기가 CSS 선택자/행을 직접 주지 않는 "인상 기반" 판정이라, 해당 지점을 Grep 으로 역추적한 것은 추정이며 스크린샷 재확인 전까지 확정 아님.
- 스크린샷 6개(shot-*.png)는 이번 수집에서 열람하지 않음(작업 지시상 스크린샷·디자인 의견은 입력 대상 아님).
