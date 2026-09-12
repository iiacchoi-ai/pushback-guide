param([string]$Out="docs/superpowers/reviews/raw",[int]$W=390,[int]$H=844,[string]$Gate="250",[string]$Lang="ko")
$ErrorActionPreference="Continue"
Add-Type -AssemblyName System.Drawing
$edge="C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
$udd=Join-Path $env:TEMP "pushback-shot-profile"  # 실행 중인 일반 Edge 와 프로필 충돌 방지
$root=Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $root
New-Item -ItemType Directory -Force $Out | Out-Null
foreach($theme in "light","dark"){
  foreach($view in "home","detail","lightbox"){
    # shot.html 의 iframe 을 -W/-H 그대로 만들게 넘긴다 (넘기지 않으면 390x844 고정이라 자르기만 됨)
    $url="http://localhost:8765/tools/review/shot.html?theme=$theme&view=$view&gate=$Gate&w=$W&h=$H&lang=$Lang"
    $png=Join-Path (Resolve-Path $Out) "shot-$view-$theme-$Lang.png"
    $rawPng=Join-Path (Resolve-Path $Out) "shot-$view-$theme-$Lang.raw.png"
    Remove-Item -Force $png -ErrorAction SilentlyContinue   # 이전 결과가 남아 실패를 OK 로 오판하지 않도록 먼저 삭제
    Remove-Item -Force $rawPng -ErrorAction SilentlyContinue
    # `&` 호출 연산자는 이 실행 환경에서 프로세스 종료를 제대로 기다리지 않아 스크린샷이
    # 기록되기 전에 다음 단계로 넘어가는 경우가 있어 Start-Process + WaitForExit 로 명시 대기한다.
    # 헤드리스 Edge 는 --window-size 를 그대로 쓰지 않고 외곽 창 폭을 최소 ~496px 로 올림(요청 390 →
    # 실제 뷰포트 496x751). shot.html 에서 iframe 을 390x844 고정 박스로 좌상단에 두고, 여기서는
    # 뷰포트가 확실히 그 박스를 포함하도록 더 큰 창(600x960)으로 찍은 뒤 좌상단 390x844 만 잘라낸다.
    $edgeArgs=@("--headless=new","--disable-gpu","--hide-scrollbars","--no-first-run","--no-default-browser-check",
            "--user-data-dir=$udd","--window-size=600,960","--virtual-time-budget=12000","--screenshot=$rawPng",$url)
    $proc=Start-Process -FilePath $edge -ArgumentList $edgeArgs -PassThru `
      -RedirectStandardError "$env:TEMP\pushback-shot-edge-err.txt" `
      -RedirectStandardOutput "$env:TEMP\pushback-shot-edge-out.txt"
    $null=$proc.WaitForExit(30000)
    if(-not $proc.HasExited){ $proc.Kill() }
    if(Test-Path $rawPng){
      $img=[System.Drawing.Bitmap]::FromFile($rawPng)
      $rect=New-Object System.Drawing.Rectangle 0,0,$W,$H
      $cropped=$img.Clone($rect,$img.PixelFormat)
      $cropped.Save($png,[System.Drawing.Imaging.ImageFormat]::Png)
      $cropped.Dispose()
      $img.Dispose()
      Remove-Item -Force $rawPng -ErrorAction SilentlyContinue
    }
    if(Test-Path $png){ Write-Host "OK  $png" } else { Write-Host "FAIL $url" }
  }
}
