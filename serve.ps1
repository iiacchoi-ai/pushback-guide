$ErrorActionPreference="Stop"
Set-Location -LiteralPath $PSScriptRoot
$port=8765
try{
  $l=[System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback,$port)
  $l.Start()
}catch{
  Write-Host "Port $port busy - opening existing server page."
  Start-Process "http://localhost:$port/tool.html"; exit
}
Write-Host ""
Write-Host "  Drawing TOOL  :  http://localhost:$port/tool.html"
Write-Host "  Close this window to stop."
Write-Host ""
Start-Process "http://localhost:$port/tool.html"
$mt=@{".html"="text/html";".js"="text/javascript";".svg"="image/svg+xml";".png"="image/png";".json"="application/json";".ico"="image/x-icon"}
while($true){
  $c=$l.AcceptTcpClient()
  try{
    $s=$c.GetStream()
    $r=New-Object System.IO.StreamReader($s)
    $line=$r.ReadLine()
    while($true){ $h=$r.ReadLine(); if($null -eq $h -or $h -eq ""){break} }
    if($line -match "^GET\s+(\S+)"){
      $u=[uri]::UnescapeDataString($Matches[1].Split("?")[0])
      if($u -eq "/"){$u="/tool.html"}
      $p=Join-Path (Get-Location) ($u.TrimStart("/") -replace "/", "\")
      if((Test-Path -LiteralPath $p -PathType Leaf) -and ($p -like (Join-Path (Get-Location) "*"))){
        $b=[System.IO.File]::ReadAllBytes($p)
        $ext=[System.IO.Path]::GetExtension($p).ToLower()
        $m=$mt[$ext]; if(-not $m){$m="application/octet-stream"}
        $hd="HTTP/1.1 200 OK`r`nContent-Type: $m; charset=utf-8`r`nContent-Length: $($b.Length)`r`nCache-Control: no-store`r`nConnection: close`r`n`r`n"
        $hb=[System.Text.Encoding]::ASCII.GetBytes($hd)
        $s.Write($hb,0,$hb.Length); $s.Write($b,0,$b.Length)
      } else {
        $hb=[System.Text.Encoding]::ASCII.GetBytes("HTTP/1.1 404 Not Found`r`nConnection: close`r`n`r`nnot found")
        $s.Write($hb,0,$hb.Length)
      }
    }
  }catch{}
  $c.Close()
}
