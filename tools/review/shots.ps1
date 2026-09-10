param([string]$Out="docs/superpowers/reviews/raw",[int]$W=390,[int]$H=844,[string]$Gate="250")
$ErrorActionPreference="Continue"
$edge="C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
$udd=Join-Path $env:TEMP "pushback-shot-profile"  # 실행 중인 일반 Edge 와 프로필 충돌 방지
$root=Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $root
New-Item -ItemType Directory -Force $Out | Out-Null
foreach($theme in "light","dark"){
  foreach($view in "home","detail","lightbox"){
    $url="http://localhost:8765/tools/review/shot.html?theme=$theme&view=$view&gate=$Gate"
    $png=Join-Path (Resolve-Path $Out) "shot-$view-$theme.png"
    Remove-Item -Force $png -ErrorAction SilentlyContinue   # 이전 결과가 남아 실패를 OK 로 오판하지 않도록 먼저 삭제
    # `&` 호출 연산자는 이 실행 환경에서 프로세스 종료를 제대로 기다리지 않아 스크린샷이
    # 기록되기 전에 다음 단계로 넘어가는 경우가 있어 Start-Process + WaitForExit 로 명시 대기한다.
    $edgeArgs=@("--headless=new","--disable-gpu","--hide-scrollbars","--no-first-run","--no-default-browser-check",
            "--user-data-dir=$udd","--window-size=$W,$H","--virtual-time-budget=12000","--screenshot=$png",$url)
    $proc=Start-Process -FilePath $edge -ArgumentList $edgeArgs -PassThru `
      -RedirectStandardError "$env:TEMP\pushback-shot-edge-err.txt" `
      -RedirectStandardOutput "$env:TEMP\pushback-shot-edge-out.txt"
    $null=$proc.WaitForExit(30000)
    if(-not $proc.HasExited){ $proc.Kill() }
    if(Test-Path $png){ Write-Host "OK  $png" } else { Write-Host "FAIL $url" }
  }
}
