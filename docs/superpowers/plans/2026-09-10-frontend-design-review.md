# 프론트엔드 디자인 점검·다듬기 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 밀어요 앱 UI 3화면을 impeccable + frontend-design 기준으로 채점·점검한 보고서를 남기고, 사용자가 고른 항목을 정체성 유지 원칙으로 두 차수에 나눠 수정·배포한다.

**Architecture:** 점검은 (1) 코드 수준 audit 스크립트, (2) 하위 에이전트 2개의 독립 critique(디자인 리뷰 / 검출기·브라우저 증거), (3) 종합 보고서의 3단계. 수정은 보고서의 P0~P2 중 사용자 선택분을 `feature/frontend-polish` 브랜치에서 1차(시각 변화 없음)·2차(시각 변화 있음)로 나눠 각각 배포 체크리스트 후 main 병합.

**Tech Stack:** 단일 파일 PWA(index.html 인라인 CSS/JS), Node 24 점검 스크립트, PowerShell serve.ps1(8765), 헤드리스 Edge 스크린샷, impeccable 엔진 0.1.5 검출기.

**Spec:** `docs/superpowers/specs/2026-09-10-frontend-design-review-design.md`

## Global Constraints

- main 직접 커밋 금지. 모든 코드 변경은 `feature/frontend-polish` 브랜치. 문서만 바꾸는 커밋은 main 허용.
- main 병합 = 배포. 병합 전 체크리스트: `index.html` 의 `C_VER` 과 `sw.js` 의 `const C="pushback-vNNN"` 동시 증가, 헤드리스 Edge 콘솔 오류 없음, `git diff --stat` 으로 `주기장별절차/`·`img/` 변경 없음 확인, 사용자 보고 후 `git merge --no-ff`, 병합 메시지 끝 `(vNNN)`. 현재 버전 v193.
- 정체성 유지: 팔레트(`--accent:#0f6e56` 계열)·서체(Pretendard Variable)·`--radius:18px`·흰 카드 구조 변경 금지.
- 안전 문구 보호: "작업자 단말 위치이며 항공기 위치가 아닙니다", "(시범)" 등 사실 고지 문구 삭제·완화 금지. 사실 문구 변경은 사용자 확인 후.
- 용어 금지: `오진입`, `지시 위반`. 관리·감독·통제 함의 표현 회피.
- UI 문구·커밋 메시지·문서는 한국어. 문서는 개조식.
- 점검 대상 3화면: 홈 `#list`, 상세 `#detail`(`#gate=250` 으로 진입, 경로이탈 감지 대상 주기장), 라이트박스 `.lightbox`. 이용집계 화면 제외.
- 뷰포트 390×844 주, 360×780 보조. 테마 라이트·다크 모두.
- 현장 가중치: 터치 목표 48×48px 이상, 본문 대비 7:1 목표, 다크모드 경보 가독성.
- impeccable 런처: `%USERPROFILE%\.claude\plugins\marketplaces\impeccable\plugin\skills\impeccable\scripts\impeccable.cmd` (엔진 0.1.5 다운로드 완료, `engine-probe` 정상 확인). 플러그인을 `/plugin install impeccable@impeccable` 로 설치하면 `%USERPROFILE%\.claude\plugins\cache\impeccable\impeccable\4.3.1\skills\impeccable\scripts\impeccable.cmd` 도 같은 내용. 둘 중 존재하는 쪽 사용.
- URL 스캔은 `$env:IMPECCABLE_BROWSER="C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"` 설정 필요.
- 로컬 서버는 PowerShell 로 `.\serve.ps1 -NoBrowser` 를 백그라운드 실행. 작업 끝에 종료.
- 새 셸에서 node 가 없으면 `$env:Path=[Environment]::GetEnvironmentVariable('Path','Machine')+';'+[Environment]::GetEnvironmentVariable('Path','User')`.

---

## 파일 구조

| 경로 | 역할 |
|---|---|
| `PRODUCT.md` (신규, 저장소 루트) | impeccable 제품 맥락. Task 1 |
| `tools/review/shot.html` (신규) | 촬영 하니스. 쿼리로 테마·화면 지정, iframe 으로 앱 로드 |
| `tools/review/shots.ps1` (신규) | 헤드리스 Edge 로 6장 촬영 |
| `tools/review/contrast.js` (신규) | CSS 변수 조합별 대비 계산 |
| `tools/review/measure.html` (신규) | 터치 목표 측정 하니스. 결과를 DOM 에 출력해 `--dump-dom` 으로 수집 |
| `tools/review/colors.js` (신규) | 하드코딩 색·인라인 스타일 목록 |
| `tools/review/check.ps1` (신규) | 수정 후 회귀 점검 일괄 실행 |
| `docs/superpowers/reviews/raw/` (신규) | 스크린샷, 측정 JSON, 검출기 JSON, 하위 에이전트 원문 |
| `docs/superpowers/reviews/20260910_프론트엔드점검.md` (신규) | 최종 보고서 |
| `index.html` (수정) | Task 6·7 |
| `sw.js` (수정) | 캐시명. Task 6·7 |

---

### Task 1: 브랜치·제품 맥락·촬영 하니스

**Files:**
- Create: `PRODUCT.md`
- Create: `tools/review/shot.html`
- Create: `tools/review/shots.ps1`
- Create: `docs/superpowers/reviews/raw/.gitkeep`

**Interfaces:**
- Produces: `docs/superpowers/reviews/raw/shot-{home,detail,lightbox}-{light,dark}.png` 6장. Task 3 의 하위 에이전트 A 가 읽음.
- Produces: `PRODUCT.md`. impeccable `context` 가 읽음.

- [ ] **Step 1: 브랜치 생성**

```powershell
git checkout -b feature/frontend-polish
git branch --show-current
```
Expected: `feature/frontend-polish`

- [ ] **Step 2: PRODUCT.md 작성**

impeccable init 은 사용자 인터뷰를 요구하나 spec 3·4절에 답이 있으므로 아래 내용으로 작성하고 Step 6 에서 사용자 확인을 받는다.

```markdown
# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

□ 인천공항 계류장 후방견인(pushback) 작업자. 항공기 옆 야외에서 휴대폰으로 사용
□ 상황: 주간 직사광·야간, 장갑 착용, 한 손 조작, 소음, 오프라인 가능성
□ 하는 일: 주기장 번호를 입력해 그 주기장의 후방견인 절차·도면·주의사항을 확인하고, 필요 시 GPS 로 가까운 주기장을 찾음

## Product Purpose

□ 인천공항 PUSHBACK 절차 핸드북을 현장에서 즉시 찾아볼 수 있게 하는 오프라인 PWA
□ 성공: 번호 입력 후 3초 안에 절차 확인, 도면 확대 판독 가능, 야간에도 가독

## Positioning

□ 주기장별 절차 애니메이션과 GPS 근접 주기장 자동 전환은 핸드북 PDF 로는 불가능한 기능
□ 경로이탈 감지는 시범 기능이며 작업자 단말 위치 기준임을 항상 고지

## Constraints

□ 단일 파일 PWA, 빌드 도구 없음, GitHub Pages 배포. main 병합이 곧 현장 배포
□ 안전 문구는 사실 고지이므로 삭제·완화 불가
□ 팀은 항공교통업무증명이 취소된 상태. 앱은 안내 도구이며 지시·통제 표현을 쓰지 않음
□ 서체 Pretendard Variable(CDN, 오프라인 시 Malgun Gothic 대체), 녹색 강조색, 흰 카드 구성은 현장에 익숙해진 정체성

## Accessibility

□ 터치 목표 48px 이상 목표, 본문 대비 7:1 목표, 다크모드는 18:30~06:30 자동
□ 경보는 소리·진동·색·깜박임을 병행
```

- [ ] **Step 3: 촬영 하니스 작성**

`tools/review/shot.html`:

```html
<!DOCTYPE html>
<html lang="ko"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>html,body{margin:0;height:100%;overflow:hidden}iframe{border:0;width:100%;height:100%;display:block}</style>
</head><body>
<iframe id="f"></iframe>
<script>
// 사용: shot.html?theme=dark&view=home|detail|lightbox&gate=250
const q=new URLSearchParams(location.search);
const theme=q.get("theme")||"light", view=q.get("view")||"home", gate=q.get("gate")||"250";
try{ localStorage.setItem("theme",theme); localStorage.removeItem("pbView"); }catch(e){}
const f=document.getElementById("f");
f.src="/index.html"+(view==="home"?"":"#gate="+gate);
f.addEventListener("load",()=>{
  const w=f.contentWindow;
  if(view==="lightbox"){
    setTimeout(()=>{ const box=w.document.querySelector(".dwgBox img, .animWrap img");
      if(box) w.openDwg(box.getAttribute("src")); },1500);
  }
});
</script>
</body></html>
```

- [ ] **Step 4: 촬영 스크립트 작성**

`tools/review/shots.ps1`:

```powershell
param([string]$Out="docs/superpowers/reviews/raw",[int]$W=390,[int]$H=844,[string]$Gate="250")
$ErrorActionPreference="Stop"
$edge="C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
$root=Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $root
New-Item -ItemType Directory -Force $Out | Out-Null
foreach($theme in "light","dark"){
  foreach($view in "home","detail","lightbox"){
    $url="http://localhost:8765/tools/review/shot.html?theme=$theme&view=$view&gate=$Gate"
    $png=Join-Path (Resolve-Path $Out) "shot-$view-$theme.png"
    & $edge --headless=new --disable-gpu --hide-scrollbars --window-size=$W,$H --virtual-time-budget=12000 --screenshot="$png" $url 2>$null
    if(Test-Path $png){ Write-Host "OK  $png" } else { Write-Host "FAIL $url" }
  }
}
```

- [ ] **Step 5: 서버 기동 후 촬영**

```powershell
Start-Process powershell -ArgumentList "-NoProfile -File .\serve.ps1 -NoBrowser" -WindowStyle Hidden
Start-Sleep 2
.\tools\review\shots.ps1
```
Expected: `OK` 6줄. 각 PNG 를 Read 로 열어 홈은 키패드, 상세는 주기장 250 카드, 라이트박스는 어두운 배경 위 도면이 보이는지 확인. 다크 3장은 배경이 `#101214` 계열인지 확인. 라이트박스가 안 열리면 `--virtual-time-budget` 을 20000 으로 올려 재시도.

- [ ] **Step 6: 사용자 확인**

PRODUCT.md 내용과 스크린샷 6장 확인 결과를 사용자에게 보고. PRODUCT.md 의 사실 오류 지적이 있으면 반영.

- [ ] **Step 7: 커밋**

```powershell
git add PRODUCT.md tools/review/shot.html tools/review/shots.ps1 docs/superpowers/reviews/raw/
git commit -m "디자인 점검 준비: PRODUCT.md·촬영 하니스·기준 스크린샷 6장"
```

---

### Task 2: audit 코드 수준 점검 스크립트

**Files:**
- Create: `tools/review/contrast.js`
- Create: `tools/review/colors.js`
- Create: `tools/review/measure.html`
- Create: `docs/superpowers/reviews/raw/audit-contrast.json`, `audit-colors.json`, `audit-touch-{light,dark}.json`, `audit-detect.json`, `audit-detect-url.json`

**Interfaces:**
- Consumes: Task 1 의 서버·하니스 방식
- Produces: 위 JSON 6종. Task 3 의 에이전트 B 와 Task 4 보고서가 읽음.

- [ ] **Step 1: 대비 계산 스크립트**

`tools/review/contrast.js`:

```js
// index.html 의 :root / html[data-theme=dark] 변수 블록을 파싱해 전경·배경 조합별 대비를 계산
const fs=require("fs");
const html=fs.readFileSync("index.html","utf8");
function vars(block){ const o={}; for(const m of block.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{3,8})/g)) o[m[1]]=m[2]; return o; }
const light=vars(html.match(/:root\{([\s\S]*?)\}/)[1]);
const dark=vars(html.match(/html\[data-theme="dark"\]\{([\s\S]*?)\}/)[1]);
function lum(hex){ let h=hex.slice(1); if(h.length===3) h=h.split("").map(c=>c+c).join("");
  const [r,g,b]=[0,2,4].map(i=>parseInt(h.slice(i,i+2),16)/255).map(c=>c<=.03928?c/12.92:((c+.055)/1.055)**2.4);
  return .2126*r+.7152*g+.0722*b; }
function ratio(a,b){ const [x,y]=[lum(a),lum(b)].sort((p,q)=>q-p); return +((x+.05)/(y+.05)).toFixed(2); }
// 실제 사용 조합 (CSS 에서 확인된 것만)
const pairs=[
  ["ink","card"],["ink","bg"],["ink-sub","card"],["ink-sub","bg"],["ink-mut","card"],["ink-mut","bg"],
  ["accent","card"],["accent","accent-soft"],["btn-text","btn-bg"],["badge-text","badge"],
  ["amber-t","amber-bg"],["amber-t","card"],["red-t","red-bg"],["red-body","red-bg"],["red-t","card"],
];
const out={};
for(const [name,v] of [["light",light],["dark",dark]]){
  out[name]=pairs.map(([fg,bg])=>({fg:`--${fg}`,bg:`--${bg}`,fgHex:v[fg],bgHex:v[bg],
    ratio:ratio(v[fg],v[bg]), AA:ratio(v[fg],v[bg])>=4.5, AAA:ratio(v[fg],v[bg])>=7}));
}
// 고정색 조합 (다크 무관)
out.fixed=[["#fff","#0a7d4f","gpsBtn.on"],["#fff","#0f6e56","candBtn.first"],["#e8eef7","#161a21","zoomHint"],
  ["#9aa8bb","#080a0e","lbTip"],["#cfd8e3","#080a0e","lbZoom .pct"],["#dff7ec","#090e16","animMsg"],["#06231a","#5dcaa5","msgChk"],
  ["#9fb3c8","#0f141c","wvSeg"],["#0B2E59","#7FC4FF","wvSeg.on"],["#00e08a","#0a0e1a","wvBadge"]]
  .map(([fg,bg,where])=>({where,fg,bg,ratio:ratio(fg,bg),AA:ratio(fg,bg)>=4.5,AAA:ratio(fg,bg)>=7}));
fs.mkdirSync("docs/superpowers/reviews/raw",{recursive:true});
fs.writeFileSync("docs/superpowers/reviews/raw/audit-contrast.json",JSON.stringify(out,null,2));
const fails=[...out.light,...out.dark,...out.fixed].filter(p=>!p.AA);
console.log(`조합 ${out.light.length*2+out.fixed.length}개, AA 미달 ${fails.length}개`);
fails.forEach(p=>console.log(" ", p.where||`${p.fg}/${p.bg}`, p.ratio));
```

- [ ] **Step 2: 실행·검증**

```powershell
node tools/review/contrast.js
```
Expected: 검출기가 이미 잡은 `--ink-mut`(#9aa1ab)/#ffffff 2.6:1 이 미달 목록에 포함. JSON 파일 생성.

- [ ] **Step 3: 하드코딩 색·인라인 스타일 수집**

`tools/review/colors.js`:

```js
const fs=require("fs");
const html=fs.readFileSync("index.html","utf8");
const lines=html.split("\n");
const cssEnd=lines.findIndex(l=>l.includes("</style>"));
const out={cssHardcoded:[],jsInlineStyle:[],jsColorLiteral:[]};
lines.forEach((l,i)=>{
  const n=i+1;
  const hexes=l.match(/#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)/g)||[];
  if(n<=cssEnd){ if(hexes.length && !/^\s*--/.test(l)) out.cssHardcoded.push({line:n,values:hexes,src:l.trim().slice(0,120)}); }
  else {
    if(/style=["']|style\.cssText|\.style\.[a-zA-Z]+\s*=/.test(l)) out.jsInlineStyle.push({line:n,src:l.trim().slice(0,140)});
    if(hexes.length && !/KWCOLOR|AC_COLORS|fill=|stroke=/.test(l)) out.jsColorLiteral.push({line:n,values:hexes,src:l.trim().slice(0,120)});
  }
});
fs.writeFileSync("docs/superpowers/reviews/raw/audit-colors.json",JSON.stringify(out,null,2));
console.log("CSS 하드코딩",out.cssHardcoded.length,"| JS 인라인 스타일",out.jsInlineStyle.length,"| JS 색 리터럴",out.jsColorLiteral.length);
```

- [ ] **Step 4: 실행**

```powershell
node tools/review/colors.js
```
Expected: 세 숫자 출력, JSON 생성. 도면 SVG 색(항공기 팔레트·지시문 원본색)은 데이터이므로 보고서에서 제외 대상으로 표시.

- [ ] **Step 5: 터치 목표 측정 하니스**

`tools/review/measure.html`:

```html
<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8">
<style>html,body{margin:0;height:100%}iframe{border:0;width:390px;height:844px}#out{white-space:pre;font:11px monospace}</style>
</head><body><iframe id="f"></iframe><pre id="out"></pre>
<script>
// 사용: measure.html?theme=light&gate=250  → 홈과 상세 두 화면의 클릭 가능 요소 크기를 #out 에 JSON 으로 출력
const q=new URLSearchParams(location.search); const theme=q.get("theme")||"light", gate=q.get("gate")||"250";
try{ localStorage.setItem("theme",theme); }catch(e){}
const f=document.getElementById("f"); const res={theme,home:[],detail:[]};
function scan(doc,label){
  const sel="button,[onclick],a,.chip,.tab,.mchip,.candBtn,.key,.kw-go,.hitG";
  doc.querySelectorAll(sel).forEach(el=>{
    const r=el.getBoundingClientRect(); if(r.width===0||r.height===0) return;
    const cls=(el.className&&el.className.baseVal!==undefined)?el.className.baseVal:String(el.className||"");
    res[label].push({tag:el.tagName.toLowerCase(),cls,id:el.id||"",text:(el.textContent||"").trim().slice(0,20),
      w:Math.round(r.width),h:Math.round(r.height),ok48:r.width>=48&&r.height>=48,ok44:r.width>=44&&r.height>=44});
  });
}
f.src="/index.html";
f.addEventListener("load",()=>{ const w=f.contentWindow;
  setTimeout(()=>{ scan(w.document,"home"); w.openGate(gate);
    setTimeout(()=>{ scan(w.document,"detail"); document.getElementById("out").textContent="MEASURE_JSON="+JSON.stringify(res); },1500);
  },1200);
},{once:true});
</script></body></html>
```

- [ ] **Step 6: 측정 실행·수집**

```powershell
Add-Type -AssemblyName System.Web
$edge="C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
foreach($t in "light","dark"){
  $dom=& $edge --headless=new --disable-gpu --window-size=420,900 --virtual-time-budget=12000 --dump-dom "http://localhost:8765/tools/review/measure.html?theme=$t&gate=250" 2>$null
  $m=[regex]::Match(($dom -join "`n"),"MEASURE_JSON=(\{.*\})")
  if($m.Success){ [System.Web.HttpUtility]::HtmlDecode($m.Groups[1].Value) | Set-Content -Encoding utf8 "docs/superpowers/reviews/raw/audit-touch-$t.json"; Write-Host "OK $t" } else { Write-Host "FAIL $t" }
}
node -e "for(const t of ['light','dark']){const j=require('./docs/superpowers/reviews/raw/audit-touch-'+t+'.json');for(const k of ['home','detail']){const a=j[k];console.log(t,k,'요소',a.length,'48미만',a.filter(x=>!x.ok48).length,'44미만',a.filter(x=>!x.ok44).length)}}"
```
Expected: `OK light`, `OK dark`, 화면별 요소 수와 미달 수 출력.

- [ ] **Step 7: 검출기 파일 스캔·URL 스캔**

```powershell
$l="$env:USERPROFILE\.claude\plugins\marketplaces\impeccable\plugin\skills\impeccable\scripts\impeccable.cmd"
& $l detect --json index.html | Set-Content -Encoding utf8 docs/superpowers/reviews/raw/audit-detect.json
$env:IMPECCABLE_BROWSER="C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
& $l detect --json --viewport 390x844 "http://localhost:8765/index.html" "http://localhost:8765/index.html#gate=250" | Set-Content -Encoding utf8 docs/superpowers/reviews/raw/audit-detect-url.json
```
Expected: 두 JSON 생성. URL 스캔이 브라우저 오류로 실패하면 파일 스캔 결과만 쓰고 보고서에 "URL 스캔 생략" 표기.

- [ ] **Step 8: 커밋**

```powershell
git add tools/review/contrast.js tools/review/colors.js tools/review/measure.html docs/superpowers/reviews/raw/audit-*.json
git commit -m "디자인 점검: 대비·색·터치목표 측정 스크립트와 검출기 결과"
```

---

### Task 3: critique 하위 에이전트 2개 병렬 실행

**Files:**
- Create: `docs/superpowers/reviews/raw/critique-A.md` (디자인 리뷰 원문)
- Create: `docs/superpowers/reviews/raw/critique-B.md` (검출기·증거 원문)

**Interfaces:**
- Consumes: Task 1 스크린샷 6장, Task 2 의 JSON 6종
- Produces: 위 두 파일. Task 4 가 종합.

- [ ] **Step 1: 에이전트 A(디자인 리뷰) 실행**

Agent 도구, subagent_type `general-purpose`, 아래 프롬프트. B 와 같은 메시지에서 병렬로 띄운다. A 에는 검출기 결과를 주지 않는다.

```
역할: 디자인 디렉터. 인천공항 후방견인 절차 안내 PWA "밀어요"의 UI 를 리뷰한다.
읽을 것: PRODUCT.md, index.html 14~443행(CSS·정적 HTML), 698행부터 openGate 함수(상세 화면 생성), 3411행 openDwg(라이트박스),
스크린샷 docs/superpowers/reviews/raw/shot-{home,detail,lightbox}-{light,dark}.png 6장 (Read 로 열어 볼 것).
모드: Operate (작업자가 작업 중 쓰는 도구). 스캔 가능성·일관성·표준 관행이 표현보다 우선.
현장 조건 가중치: 장갑·한 손 조작(터치 48px, 엄지 도달), 야간(다크모드·경보 가독성), 주간 직사광(대비 7:1 목표, 작은 회색 글자 최소화).
보호 문구: "작업자 단말 위치이며 항공기 위치가 아닙니다", "(시범)" 같은 사실 고지는 삭제·완화 제안 금지.
금지 용어: 오진입, 지시 위반, 관리·감독·통제.
평가 항목:
1) 디자인 특이성: 이 제품이 아니어도 그대로 쓸 수 있는 구성인가. 다음 AI 기본값 패턴 여부를 각각 판정: 동일 radius 카드 나열, 동일 회색 그림자, ALL-CAPS 눈썹 라벨, 중점(·)으로 이은 메타 문자열, 장식용 모션, 헤드라인 한 단어만 강조.
2) Nielsen 휴리스틱 10개 각 0~4점과 근거 (해당 없음은 n/a).
3) 인지 부하: 한 화면에 선택지 5개 이상인 지점, 한 번에 두 가지 이상 결정을 요구하는 지점.
4) 감정 여정: 경보 발생·GPS 실패·도면 로드 실패 같은 고위험 순간에 안심시키는 장치가 있는가.
5) 문구: 능동태, 버튼 이름과 결과 토스트의 일관성, 오류·빈 화면이 다음 행동을 제시하는가.
6) 페르소나 적신호: 장갑 낀 야간 작업자 / 처음 쓰는 신입 / 직사광 아래 베테랑.
출력(한국어, 개조식, 본문 800~1200자 + 표): 특이성 판정, 휴리스틱 점수표, 강점 2~3, 우선 이슈 3~5(각각 화면·선택자·영향·권고), 경미 관찰, 도발적 질문 2개.
결과를 docs/superpowers/reviews/raw/critique-A.md 에 저장하고 요약을 보고.
```

- [ ] **Step 2: 에이전트 B(검출기·증거) 실행**

같은 메시지에서 병렬 실행. B 에는 스크린샷과 A 의 기준을 주지 않는다.

```
역할: 결정론적 검출 증거 수집자. 판단하지 말고 증거만 정리한다.
읽을 것: docs/superpowers/reviews/raw/audit-detect.json, audit-detect-url.json(있으면), audit-contrast.json, audit-colors.json, audit-touch-light.json, audit-touch-dark.json.
할 일:
1) 검출기 결과를 규칙(antipattern)별로 집계. 각 항목에 파일·행·스니펫. line 이 0 이면 index.html CSS 에서 해당 값을 grep 해 실제 행을 찾아 적는다.
2) 각 검출 항목이 오탐인지 판단 근거를 적는다. 예: 도면 SVG 데이터 색은 디자인 토큰 대상이 아님.
3) 대비 JSON 에서 AA 미달·AAA 미달 조합을 표로. 어느 선택자가 그 조합을 쓰는지 index.html CSS 에서 찾아 적는다.
4) 터치 JSON 에서 48px 미만 요소를 화면별로 표로 (선택자·텍스트·w×h). 44px 미만은 별도 표시.
5) 색 JSON 에서 CSS 하드코딩 색과 JS 인라인 스타일을 표로. 다크모드에서 바뀌지 않는 값을 표시.
출력(한국어, 개조식, 표 위주): 위 5개 절 + "수집 실패·생략 항목"과 사유.
결과를 docs/superpowers/reviews/raw/critique-B.md 에 저장하고 요약을 보고.
```

- [ ] **Step 3: 결과 확인**

두 파일이 존재하고 각각 필수 절(A: 특이성·휴리스틱표·우선 이슈 / B: 5개 절)이 있는지 확인. 빠진 절은 해당 에이전트에 SendMessage 로 보완 요청.

- [ ] **Step 4: 커밋**

```powershell
git add docs/superpowers/reviews/raw/critique-A.md docs/superpowers/reviews/raw/critique-B.md
git commit -m "디자인 점검: 디자인 리뷰·검출 증거 원문"
```

---

### Task 4: 종합 보고서 작성과 사용자 선택

**Files:**
- Create: `docs/superpowers/reviews/20260910_프론트엔드점검.md`

**Interfaces:**
- Consumes: Task 2 JSON, Task 3 두 원문
- Produces: 보고서. 이슈마다 `ID`(예: P1-03), 심각도, 수정 차수(1차/2차), 채택 여부 필드. Task 6·7 이 ID 로 참조.

- [ ] **Step 1: audit 5항목 채점**

`critique-B.md` 와 JSON 을 근거로 impeccable audit 기준(각 0~4) 채점. 근거 없이 점수 매기지 않음.

| 항목 | 근거 자료 |
|---|---|
| 접근성 | 대비 미달 수, aria 부재(라이트박스 role/aria-modal/focus 없음), 포커스 표시, `prefers-reduced-motion` 부재 |
| 성능 | `will-change` 사용처, 무한 애니메이션(gpsPulse·hitPulse·devPulse), 이미지 lazy 여부 |
| 테마 | 하드코딩 색 수, 다크 미대응 값 |
| 반응형 | 터치 48/44 미달 수, 가로 스크롤 여부, 360px 확인 |
| 구현 일관성 | 검출기 확정 항목 수, 같은 역할 버튼의 스타일 변형 수(`.back`/`.navBtn`/`.stAct button`/`.surveyBar button` 등) |

- [ ] **Step 2: 보고서 작성**

구성(개조식):

```markdown
# 프론트엔드 디자인 점검 보고서 (밀어요 v193)

□ 점검일: 2026-09-10 · 기준: impeccable audit/critique + frontend-design · 대상: 홈·상세(250)·라이트박스, 라이트·다크
□ 실행 방식: critique 하위 에이전트 2개 독립 실행 (degraded 아님) / URL 스캔 [실행|생략: 사유]

## 1. 요약
- audit NN/20 (등급) · critique 휴리스틱 NN/40 · 디자인 특이성 [판정]
- 이슈 P0 n · P1 n · P2 n · P3 n
- 핵심 3~5건

## 2. audit 점수표
| # | 항목 | 점수 | 핵심 근거 |

## 3. 휴리스틱 점수표
| # | 휴리스틱 | 점수 | 근거 |

## 4. 디자인 특이성 판정 (frontend-design)
- AI 기본값 패턴 6종 각각 해당/비해당과 근거
- 이 앱만의 요소 (키패드 우선 진입, 절차 애니메이션, 경보 배너)

## 5. 이슈 목록
| ID | 심각도 | 화면 | 위치(선택자·행) | 영향 | 현장 조건 | 권고 | 차수 | 채택 |
(1차 = 시각 변화 없음, 2차 = 시각 변화 있음. 채택 열은 Step 5 에서 채움)

## 6. 긍정 사항

## 7. 검출기 오탐과 제외 사유

## 8. 부록: 범위 밖 발견 사항
- gcFlush 괄호 누락(3955행 부근), bindZoom 죽은 코드(3435행 부근), 안드로이드 뒤로가기, 이용집계 화면

## 9. 권장 수정 순서
1. [P?] ID … (impeccable 명령: polish/adapt/clarify/…)
```

- [ ] **Step 3: 자체 검토**

각 이슈에 위치·영향·권고가 모두 있는지, 안전 문구 완화 제안이 섞이지 않았는지, 금지 용어가 없는지 확인.

```powershell
Select-String -Path "docs/superpowers/reviews/20260910_프론트엔드점검.md" -Pattern "오진입|지시 위반|통제|감독"
```
Expected: 출력 없음.

- [ ] **Step 4: 커밋**

```powershell
git add "docs/superpowers/reviews/20260910_프론트엔드점검.md"
git commit -m "프론트엔드 디자인 점검 보고서 (v193 기준)"
```

- [ ] **Step 5: 사용자 선택 (게이트)**

AskUserQuestion 으로 "수정할 항목" 을 P0~P2 목록에서 복수 선택받는다. 옵션이 4개를 넘으면 심각도별로 질문을 나눈다. 선택 결과를 보고서 5절 `채택` 열에 기록하고 커밋. 선택 전에는 Task 5 로 넘어가지 않는다.

---

### Task 5: 수정 후 회귀 점검 도구

**Files:**
- Create: `tools/review/check.ps1`

**Interfaces:**
- Produces: `.\tools\review\check.ps1` — 문법 검사, 헤드리스 콘솔 오류, 검출기, 대비·색·터치 재측정, 데이터 폴더 diff 를 한 번에 실행. Task 6·7 의 검증 단계가 호출.

- [ ] **Step 1: 통합 점검 스크립트**

```powershell
# tools/review/check.ps1 — 수정 후 회귀 점검. 서버(8765)가 떠 있어야 함.
param([switch]$SkipShots)
$ErrorActionPreference="Continue"
$root=Resolve-Path (Join-Path $PSScriptRoot "..\..") ; Set-Location $root
$edge="C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
Write-Host "== 1. 문법"
node -e "const fs=require('fs'),vm=require('vm');const h=fs.readFileSync('index.html','utf8');const m=[...h.matchAll(/<script>([\s\S]*?)<\/script>/g)];m.forEach((x,i)=>{new vm.Script(x[1],{filename:'inline'+i})});new vm.Script(fs.readFileSync('sw.js','utf8'),{filename:'sw.js'});console.log('OK 인라인 스크립트',m.length,'개 + sw.js')"
Write-Host "== 2. 콘솔 오류"
$log=& $edge --headless=new --disable-gpu --enable-logging=stderr --v=0 --virtual-time-budget=8000 --dump-dom "http://localhost:8765/index.html#gate=250" 2>&1 | Out-String
$err=($log -split "`n" | Where-Object { $_ -match "CONSOLE.*(error|Uncaught|TypeError|ReferenceError)" })
if($err){ Write-Host "콘솔 오류:"; $err } else { Write-Host "OK 콘솔 오류 없음" }
Write-Host "== 3. 검출기"
$l="$env:USERPROFILE\.claude\plugins\marketplaces\impeccable\plugin\skills\impeccable\scripts\impeccable.cmd"
& $l detect index.html 2>&1 | Select-Object -Last 3
Write-Host "== 4. 대비·색·터치"
node tools/review/contrast.js; node tools/review/colors.js
Add-Type -AssemblyName System.Web
foreach($t in "light","dark"){
  $dom=& $edge --headless=new --disable-gpu --window-size=420,900 --virtual-time-budget=12000 --dump-dom "http://localhost:8765/tools/review/measure.html?theme=$t&gate=250" 2>$null
  $m=[regex]::Match(($dom -join "`n"),"MEASURE_JSON=(\{.*\})")
  if($m.Success){ [System.Web.HttpUtility]::HtmlDecode($m.Groups[1].Value) | Set-Content -Encoding utf8 "docs/superpowers/reviews/raw/audit-touch-$t.json" }
}
node -e "for(const t of ['light','dark']){const j=require('./docs/superpowers/reviews/raw/audit-touch-'+t+'.json');for(const k of ['home','detail']){const a=j[k];console.log(t,k,'48미만',a.filter(x=>!x.ok48).length,'44미만',a.filter(x=>!x.ok44).length)}}"
Write-Host "== 5. 데이터 폴더 변경 여부"
git diff --stat -- 주기장별절차 img
if(-not $SkipShots){ Write-Host "== 6. 스크린샷"; .\tools\review\shots.ps1 -Out "docs/superpowers/reviews/raw/after" }
```

- [ ] **Step 2: 실행 확인**

```powershell
.\tools\review\check.ps1 -SkipShots
```
Expected: `OK 인라인 스크립트`, `OK 콘솔 오류 없음`, 검출기 요약, 대비·터치 숫자, 데이터 폴더 diff 없음.

- [ ] **Step 3: 커밋**

```powershell
git add tools/review/check.ps1
git commit -m "디자인 점검: 수정 후 회귀 점검 스크립트"
```

---

### Task 6: 1차 수정 — 시각 변화 없는 항목 (배포 v194)

**Files:**
- Modify: `index.html` (CSS 14~385행, 상세 생성 698행~, 라이트박스 3411행~)
- Modify: `sw.js:1`
- Modify: `docs/superpowers/reviews/20260910_프론트엔드점검.md` (전/후 수치)

**Interfaces:**
- Consumes: 보고서 5절에서 `채택=예, 차수=1차` 인 이슈 ID
- Produces: v194 배포

1차 범주와 표준 처리법. 보고서에 채택된 항목만 적용한다.

| 범주 | 표준 처리 |
|---|---|
| 접근성 속성 | 동적 생성 버튼에 `aria-label`, 라이트박스에 `role="dialog" aria-modal="true"`, 열 때 닫기 버튼 `focus()`, 닫을 때 원래 요소로 포커스 복귀, `Escape` 키로 닫기 |
| 포커스 표시 | `:focus-visible{outline:2px solid var(--accent);outline-offset:2px}` 를 버튼·칩 공통에 추가. 마우스 클릭 시엔 보이지 않음 |
| 모션 | `@media (prefers-reduced-motion:reduce)` 에서 `gpsPulse`·`hitPulse`·`slidein` 은 정지, `devPulse`(경보)는 유지하되 주기만 늘림. 경보 신호 자체를 없애지 않음 |
| 다크모드 누락 | 다크에서 안 바뀌는 하드코딩 값을 기존 토큰으로 교체하거나 다크 블록에 짝 토큰 추가 |
| 터치 목표 | 시각 크기는 유지하고 `padding` 또는 `::before{content:"";position:absolute;inset:-6px}` 로 히트 영역만 확대 |
| 하드코딩 색 토큰화 | 같은 값이 2곳 이상이면 `:root` 에 토큰 추가. 도면 데이터 색은 제외 |

- [ ] **Step 1: 채택 항목 목록 확정**

보고서 5절에서 `채택=예, 차수=1차` 행을 ID 순으로 나열해 작업 목록으로 삼는다. 각 ID 별로 Step 2~5 를 반복한다.

- [ ] **Step 2: 수정 전 측정값 기록**

해당 ID 의 근거 수치(대비 비율, w×h, 검출 건수)를 보고서 행에 `전:` 으로 적는다.

- [ ] **Step 3: 최소 수정**

원인을 가장 좁은 수준에서 고친다. 팔레트·서체·radius·카드 구조는 건드리지 않는다. 문구 변경 없음.

- [ ] **Step 4: 재측정**

```powershell
.\tools\review\check.ps1 -SkipShots
```
Expected: 해당 수치가 목표를 넘고(`후:` 로 기록), 콘솔 오류 없음, 새 검출 항목 없음.

- [ ] **Step 5: ID 단위 커밋**

```powershell
git add index.html "docs/superpowers/reviews/20260910_프론트엔드점검.md"
git commit -m "디자인 1차: [ID] [한 줄 요약]"
```

- [ ] **Step 6: 1차 전체 완료 후 스크린샷 비교**

```powershell
.\tools\review\shots.ps1 -Out "docs/superpowers/reviews/raw/after-1"
```
6장을 Read 로 열어 Task 1 기준 스크린샷과 나란히 확인. 의도치 않은 시각 변화가 있으면 원인 커밋을 수정.

- [ ] **Step 7: 버전 올리기**

`index.html` 3879행 `var C_VER="v193";` → `"v194"`, `sw.js` 1행 `const C="pushback-v193";` → `"pushback-v194"`.

```powershell
git add index.html sw.js
git commit -m "버전 v194"
```

- [ ] **Step 8: 배포 체크리스트 실행·보고**

```powershell
.\tools\review\check.ps1
git diff --stat main..HEAD
```
Expected: 콘솔 오류 없음, `주기장별절차/`·`img/` 변경 0. 결과(수정 ID 목록, 전후 수치, 체크리스트 결과)를 사용자에게 보고하고 병합 승인을 받는다.

- [ ] **Step 9: 병합·push (승인 후)**

```powershell
git checkout main
git merge --no-ff feature/frontend-polish -m "디자인 점검 1차 수정: 접근성·다크모드·터치 목표 (v194)"
git push origin main
git checkout feature/frontend-polish
```

---

### Task 7: 2차 수정 — 시각 변화 있는 항목 (배포 v195)

**Files:**
- Modify: `index.html`
- Modify: `sw.js:1`
- Modify: `docs/superpowers/reviews/20260910_프론트엔드점검.md`

**Interfaces:**
- Consumes: 보고서 5절에서 `채택=예, 차수=2차` 인 이슈 ID, Task 6 완료 상태
- Produces: v195 배포

2차 범주와 원칙.

| 범주 | 원칙 |
|---|---|
| 레이아웃·간격 | 기존 간격 단위(8·10·12·14·16·18px)만 사용. 새 단위 도입 금지 |
| 위계 | 같은 역할의 버튼은 같은 스타일로 통일. 기존 클래스 중 하나를 기준으로 삼고 나머지를 맞춤 |
| 문구 | 능동태, 버튼 이름과 결과 문구 일치. 안전·사실 문구 변경은 사용자 확인 후 |
| 상태 | 로딩·빈 결과·오류 화면이 다음 행동을 제시. 기존 `.noresult`·`imgFail` 패턴 활용 |
| 다크 경보 가독성 | `.devBar.hit` 다크 값 대비 7:1 이상. 색 의미(빨강=경보)는 유지 |

- [ ] **Step 1: 채택 항목 목록 확정**

보고서 5절에서 `채택=예, 차수=2차` 행을 나열한다. 문구 변경이 포함된 ID 는 변경 전후 문구를 사용자에게 먼저 보여 확인받는다.

- [ ] **Step 2: ID 별 수정·재측정·커밋**

Task 6 Step 2~5 와 같은 절차(전 수치 기록 → 최소 수정 → `check.ps1 -SkipShots` → 커밋). 커밋 메시지는 `디자인 2차: [ID] [한 줄 요약]`.

- [ ] **Step 3: 360px 보조 확인**

```powershell
.\tools\review\shots.ps1 -Out "docs/superpowers/reviews/raw/after-2-360" -W 360 -H 780
```
Expected: 가로 스크롤 없음, 키패드·탭·칩 줄바꿈 정상.

- [ ] **Step 4: 스크린샷 비교·버전·체크리스트·보고**

```powershell
.\tools\review\shots.ps1 -Out "docs/superpowers/reviews/raw/after-2"
```
`C_VER` → `"v195"`, `sw.js` → `"pushback-v195"` 후 커밋 `버전 v195`. `.\tools\review\check.ps1` 실행, `git diff --stat main..HEAD` 로 데이터 폴더 변경 0 확인. 전후 스크린샷과 수치를 사용자에게 보고하고 병합 승인.

- [ ] **Step 5: 병합·push (승인 후)**

```powershell
git checkout main
git merge --no-ff feature/frontend-polish -m "디자인 점검 2차 수정: 레이아웃·문구·상태 표시 (v195)"
git push origin main
```

---

### Task 8: 재채점과 보고서 마감

**Files:**
- Modify: `docs/superpowers/reviews/20260910_프론트엔드점검.md`

**Interfaces:**
- Consumes: Task 6·7 의 after 스크린샷과 check.ps1 수치

- [ ] **Step 1: audit 재채점**

Task 4 Step 1 과 같은 기준으로 5항목을 다시 채점. 근거는 `after` 수치.

- [ ] **Step 2: 보고서에 결과 절 추가**

```markdown
## 10. 수정 결과 (v195)
| 항목 | 전 | 후 |
| audit 합계 | NN/20 | NN/20 |
| AA 미달 조합 | n | n |
| 48px 미만 요소 | n | n |
| 검출기 확정 항목 | n | n |
□ 전후 스크린샷: raw/shot-*.png ↔ raw/after-2/shot-*.png
□ 미채택·보류 항목과 사유
□ 범위 밖 항목은 8절 부록 유지 (별도 버그 작업)
```

- [ ] **Step 3: 서버 종료·커밋 (문서만이므로 main 직접)**

```powershell
Get-CimInstance Win32_Process -Filter "Name='powershell.exe'" | Where-Object { $_.CommandLine -like "*serve.ps1*" } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }
git checkout main
git add "docs/superpowers/reviews/20260910_프론트엔드점검.md" docs/superpowers/reviews/raw/after-2
git commit -m "프론트엔드 디자인 점검 보고서: 수정 결과 반영"
git push origin main
```

- [ ] **Step 4: 완료 보고**

spec 8절 완료 기준 5개를 하나씩 확인한 결과와 함께 보고. 범위 밖 항목 4건은 별도 작업 제안으로 마무리.
