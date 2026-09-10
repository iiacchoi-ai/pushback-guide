param([string]$Out="docs/superpowers/reviews/raw",[int]$W=390,[int]$H=844,[string]$Gate="250")
$ErrorActionPreference="Stop"
$edge="C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
$udd=Join-Path $env:TEMP "pushback-shot-profile"  # 실행 중인 일반 Edge 와 프로필 충돌 방지
$root=Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $root
New-Item -ItemType Directory -Force $Out | Out-Null
foreach($theme in "light","dark"){
  foreach($view in "home","detail","lightbox"){
    $url="http://localhost:8765/tools/review/shot.html?theme=$theme&view=$view&gate=$Gate"
    $png=Join-Path (Resolve-Path $Out) "shot-$view-$theme.png"
    & $edge --headless=new --disable-gpu --hide-scrollbars --user-data-dir="$udd" --window-size=$W,$H --virtual-time-budget=12000 --screenshot="$png" $url 2>$null
    if(Test-Path $png){ Write-Host "OK  $png" } else { Write-Host "FAIL $url" }
  }
}
