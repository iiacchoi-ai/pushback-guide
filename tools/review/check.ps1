# tools/review/check.ps1 — 수정 후 회귀 점검. 서버(8765)가 떠 있어야 함.
param([switch]$SkipShots)
$ErrorActionPreference="Continue"
# 새 셸에 node 가 PATH 에 없는 경우 대비
$env:Path=[Environment]::GetEnvironmentVariable('Path','Machine')+';'+[Environment]::GetEnvironmentVariable('Path','User')
$root=Resolve-Path (Join-Path $PSScriptRoot "..\..") ; Set-Location $root
$edge="C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
$udd=Join-Path $env:TEMP "pushback-check-profile"  # 실행 중인 일반 Edge 와 프로필 충돌 방지

Write-Host "== 1. 문법"
node -e "const fs=require('fs'),vm=require('vm');const h=fs.readFileSync('index.html','utf8');const m=[...h.matchAll(/<script>([\s\S]*?)<\/script>/g)];m.forEach((x,i)=>{new vm.Script(x[1],{filename:'inline'+i})});new vm.Script(fs.readFileSync('sw.js','utf8'),{filename:'sw.js'});console.log('OK 인라인 스크립트',m.length,'개 + sw.js')"

Write-Host "== 2. 콘솔 오류"
# `&` 호출 연산자는 이 환경에서 프로세스 종료를 제대로 기다리지 않아 큰 페이지에서 출력이
# 유실될 수 있음(tools/review/shots.ps1 참고) — Start-Process + WaitForExit 로 명시 대기한다.
$consoleErrFile=Join-Path $env:TEMP "pushback-check-console-err.txt"
$consoleOutFile=Join-Path $env:TEMP "pushback-check-console-out.txt"
$consoleArgs=@("--headless=new","--disable-gpu","--enable-logging=stderr","--v=0","--user-data-dir=$udd",
  "--virtual-time-budget=8000","--dump-dom","http://localhost:8765/index.html#gate=250")
$proc=Start-Process -FilePath $edge -ArgumentList $consoleArgs -PassThru `
  -RedirectStandardError $consoleErrFile -RedirectStandardOutput $consoleOutFile
$null=$proc.WaitForExit(30000)
if(-not $proc.HasExited){ $proc.Kill() }
Start-Sleep -Milliseconds 500
$log=[System.IO.File]::ReadAllText($consoleErrFile,[System.Text.Encoding]::UTF8)
$err=($log -split "`n" | Where-Object { $_ -match "CONSOLE.*(error|Uncaught|TypeError|ReferenceError)" })
if($err){ Write-Host "콘솔 오류:"; $err } else { Write-Host "OK 콘솔 오류 없음" }

Write-Host "== 3. 검출기"
$l="$env:USERPROFILE\.claude\plugins\marketplaces\impeccable\plugin\skills\impeccable\scripts\impeccable.cmd"
if(-not (Test-Path $l)){ $l="$env:USERPROFILE\.claude\plugins\cache\impeccable\impeccable\4.3.1\skills\impeccable\scripts\impeccable.cmd" }
$env:IMPECCABLE_BROWSER="C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
& $l detect index.html 2>&1 | Select-Object -Last 3

Write-Host "== 4. 대비·색·터치"
node tools/review/contrast.js; node tools/review/colors.js
Add-Type -AssemblyName System.Web
foreach($t in "light","dark"){
  $domFile=Join-Path $env:TEMP "pushback-check-measure-$t.txt"
  $measureArgs=@("--headless=new","--disable-gpu","--window-size=420,900","--virtual-time-budget=12000",
    "--dump-dom","http://localhost:8765/tools/review/measure.html?theme=$t&gate=250")
  $mproc=Start-Process -FilePath $edge -ArgumentList $measureArgs -PassThru `
    -RedirectStandardOutput $domFile -RedirectStandardError "$env:TEMP\pushback-check-measure-err-$t.txt"
  $null=$mproc.WaitForExit(30000)
  if(-not $mproc.HasExited){ $mproc.Kill() }
  Start-Sleep -Milliseconds 500
  $dom=[System.IO.File]::ReadAllText($domFile,[System.Text.Encoding]::UTF8)
  $m=[regex]::Match($dom,"MEASURE_JSON=(\{.*\})")
  if($m.Success){
    $jsonText=[System.Web.HttpUtility]::HtmlDecode($m.Groups[1].Value)
    $outPath=Join-Path $root "docs/superpowers/reviews/raw/audit-touch-$t.json"
    # Set-Content -Encoding utf8 은 PS 5.1 에서 BOM 을 붙여 node require() 를 깨뜨리므로 BOM 없이 직접 저장
    [IO.File]::WriteAllText($outPath,$jsonText,(New-Object Text.UTF8Encoding $false))
  } else {
    Write-Host "FAIL $t 측정 실패 (MEASURE_JSON 없음)"
  }
}
node -e "for(const t of ['light','dark']){const j=require('./docs/superpowers/reviews/raw/audit-touch-'+t+'.json');for(const k of ['home','detail']){const a=j[k];console.log(t,k,'48미만',a.filter(x=>!x.ok48).length,'44미만',a.filter(x=>!x.ok44).length)}}"

Write-Host "== 5. 데이터 폴더 변경 여부"
git diff --stat -- 주기장별절차 img

if(-not $SkipShots){ Write-Host "== 6. 스크린샷"; .\tools\review\shots.ps1 -Out "docs/superpowers/reviews/raw/after" }
