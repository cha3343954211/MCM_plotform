# Domain + HTTPS Setup Script
# Run as Administrator in PowerShell:
# Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
# .\setup-domain.ps1

$APP_DIR = "C:\codeworks"
$CADDY_DIR = "C:\caddy"
$APP_PORT = 3000

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "   Domain + HTTPS Setup" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

$DOMAIN = Read-Host "Enter domain (e.g. mathoi.duckdns.org)"
if ([string]::IsNullOrEmpty($DOMAIN)) {
    Write-Host "Domain cannot be empty" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "[1/5] Downloading Caddy..." -ForegroundColor Yellow
$null = New-Item -ItemType Directory -Path $CADDY_DIR -Force
$caddyExe = Join-Path $CADDY_DIR "caddy.exe"
if (-not (Test-Path $caddyExe)) {
    $caddyZip = Join-Path $env:TEMP "caddy.zip"
    Invoke-WebRequest -Uri "https://github.com/caddyserver/caddy/releases/download/v2.8.4/caddy_2.8.4_windows_amd64.zip" -OutFile $caddyZip
    Expand-Archive -Path $caddyZip -DestinationPath $CADDY_DIR -Force
    Remove-Item $caddyZip -Force
    Write-Host "  Caddy downloaded" -ForegroundColor Green
}
else {
    Write-Host "  Caddy exists, skip" -ForegroundColor Gray
}

Write-Host "[2/5] Creating Caddyfile..." -ForegroundColor Yellow
$caddyFile = Join-Path $CADDY_DIR "Caddyfile"
$NL = [System.Environment]::NewLine
$caddyText = $DOMAIN + " {" + $NL + "    reverse_proxy localhost:" + $APP_PORT + $NL + "}"
[System.IO.File]::WriteAllText($caddyFile, $caddyText, [System.Text.Encoding]::UTF8)
Write-Host "  Caddyfile created" -ForegroundColor Green

Write-Host "[3/5] Configuring firewall..." -ForegroundColor Yellow
$r1 = Get-NetFirewallRule -DisplayName "Caddy-HTTP" -ErrorAction SilentlyContinue
if (-not $r1) {
    $null = New-NetFirewallRule -DisplayName "Caddy-HTTP" -Direction Inbound -Port 80 -Protocol TCP -Action Allow
}
$r2 = Get-NetFirewallRule -DisplayName "Caddy-HTTPS" -ErrorAction SilentlyContinue
if (-not $r2) {
    $null = New-NetFirewallRule -DisplayName "Caddy-HTTPS" -Direction Inbound -Port 443 -Protocol TCP -Action Allow
}
Write-Host "  Port 80 and 443 opened" -ForegroundColor Green

Write-Host "[4/5] Updating .env..." -ForegroundColor Yellow
$envFile = Join-Path $APP_DIR ".env"
if (Test-Path $envFile) {
    $envText = [System.IO.File]::ReadAllText($envFile)
    $newUrl = 'NEXTAUTH_URL="https://' + $DOMAIN + '"'
    $envText = [System.Text.RegularExpressions.Regex]::Replace($envText, 'NEXTAUTH_URL=.*', $newUrl)
    [System.IO.File]::WriteAllText($envFile, $envText, [System.Text.Encoding]::UTF8)
    Write-Host "  NEXTAUTH_URL updated to https://$DOMAIN" -ForegroundColor Green
}
else {
    Write-Host "  .env not found at $APP_DIR" -ForegroundColor Red
}

Write-Host "[5/5] Starting Caddy..." -ForegroundColor Yellow
$oldCaddy = Get-Process -Name "caddy" -ErrorAction SilentlyContinue
if ($oldCaddy) {
    Stop-Process -Name "caddy" -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 1
}

$svcName = "Caddy"
$existSvc = Get-Service -Name $svcName -ErrorAction SilentlyContinue
if ($existSvc) {
    Stop-Service -Name $svcName -Force -ErrorAction SilentlyContinue
    & sc.exe delete $svcName | Out-Null
    Start-Sleep -Seconds 2
}

$binArg = '"' + $caddyExe + '" run --config "' + $caddyFile + '" --adapter caddyfile'
& sc.exe create $svcName binPath= $binArg start= auto | Out-Null
& sc.exe description $svcName "Caddy Web Server" | Out-Null
Start-Service -Name $svcName
Write-Host "  Caddy service started (auto-start enabled)" -ForegroundColor Green

Write-Host "  Restarting app..." -ForegroundColor Yellow
Set-Location $APP_DIR
& pm2 restart mathoi-mcm
Start-Sleep -Seconds 3

Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "  Setup complete!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Host "  URL: https://$DOMAIN" -ForegroundColor Cyan
Write-Host "  (SSL cert takes ~30s on first visit)" -ForegroundColor Gray
Write-Host ""
Write-Host "  Commands:" -ForegroundColor Gray
Write-Host "    Get-Service Caddy         # Caddy status" -ForegroundColor Gray
Write-Host "    Restart-Service Caddy     # restart Caddy" -ForegroundColor Gray
Write-Host "    pm2 restart mathoi-mcm    # restart app" -ForegroundColor Gray
Write-Host ""
