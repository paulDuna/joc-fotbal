# Server mic pentru joc, pe Windows. Porneste-l cu start.bat.
param([int]$Port = 8123)

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$mime = @{
  '.html' = 'text/html; charset=utf-8'
  '.js'   = 'text/javascript; charset=utf-8'
  '.mjs'  = 'text/javascript; charset=utf-8'
  '.css'  = 'text/css; charset=utf-8'
  '.json' = 'application/json'
  '.png'  = 'image/png'
  '.jpg'  = 'image/jpeg'
  '.jpeg' = 'image/jpeg'
  '.gif'  = 'image/gif'
  '.svg'  = 'image/svg+xml'
  '.ico'  = 'image/x-icon'
  '.mp3'  = 'audio/mpeg'
  '.wav'  = 'audio/wav'
  '.ogg'  = 'audio/ogg'
  '.glb'  = 'model/gltf-binary'
  '.gltf' = 'model/gltf+json'
  '.woff2'= 'font/woff2'
  '.webmanifest' = 'application/manifest+json'
}

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://+:$Port/")      # si pentru telefon (are nevoie de rezervarea URL facuta o data, ca admin)
$phone = $true
try { $listener.Start() } catch {
  $listener = New-Object System.Net.HttpListener
  $listener.Prefixes.Add("http://localhost:$Port/")
  $phone = $false
  try { $listener.Start() } catch {
    Write-Host "Nu pot porni serverul pe portul $Port. Poate jocul e deja pornit intr-o alta fereastra." -ForegroundColor Red
    Read-Host "Apasa Enter ca sa inchizi"
    exit 1
  }
}

Write-Host ""
Write-Host "  Jocul merge la adresa: http://localhost:$Port" -ForegroundColor Green
if ($phone) {
  $ip = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue | Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254*' -and $_.PrefixOrigin -ne 'WellKnown' } | Select-Object -First 1 -ExpandProperty IPAddress
  if ($ip) { Write-Host "  Pe telefon (acelasi Wi-Fi):  http://${ip}:$Port" -ForegroundColor Cyan }
}
Write-Host "  NU inchide fereastra asta cat timp joci." -ForegroundColor Yellow
Write-Host "  Cand termini, inchide fereastra (X sus in dreapta)."
Write-Host ""
Start-Process "http://localhost:$Port"

while ($listener.IsListening) {
  $ctx = $listener.GetContext()
  $res = $ctx.Response
  try {
    $rel = [Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath).TrimStart('/')
    if ($rel -eq '') { $rel = 'index.html' }
    $full = [IO.Path]::GetFullPath((Join-Path $root $rel))
    if ($full.StartsWith($root, [StringComparison]::OrdinalIgnoreCase) -and (Test-Path $full -PathType Leaf)) {
      $ext = [IO.Path]::GetExtension($full).ToLower()
      $type = $mime[$ext]; if (-not $type) { $type = 'application/octet-stream' }
      $bytes = [IO.File]::ReadAllBytes($full)
      $res.ContentType = $type
      $res.Headers.Add('Cache-Control', 'no-store')
      $res.ContentLength64 = $bytes.Length
      $res.OutputStream.Write($bytes, 0, $bytes.Length)
    } else {
      $res.StatusCode = 404
    }
  } catch {
    $res.StatusCode = 500
  } finally {
    $res.Close()
  }
}
