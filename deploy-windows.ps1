# ============================================
#  数学建模竞赛平台 - Windows Server 部署脚本
#  用法: 以管理员身份运行 PowerShell，执行:
#  Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
#  .\deploy-windows.ps1
# ============================================

$ErrorActionPreference = "Continue"
$APP_NAME = "mathoi-mcm"
$APP_DIR = $PSScriptRoot
$PORT = 3000

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "   Math Modeling Platform - Windows Deploy" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# ---- 1. Check Node.js ----
Write-Host "[1/7] Checking Node.js..." -ForegroundColor Yellow
$nodeCmd = Get-Command node -ErrorAction SilentlyContinue
if ($nodeCmd) {
    $nodeVer = & node -v
    Write-Host "  Node.js installed: $nodeVer" -ForegroundColor Green
}
else {
    Write-Host "  Node.js not found, downloading..." -ForegroundColor Yellow
    $nodeUrl = "https://nodejs.org/dist/v18.20.3/node-v18.20.3-x64.msi"
    $nodeInstaller = Join-Path $env:TEMP "node-installer.msi"
    Invoke-WebRequest -Uri $nodeUrl -OutFile $nodeInstaller
    Start-Process msiexec.exe -Wait -ArgumentList "/i `"$nodeInstaller`" /quiet"
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
    Write-Host "  Node.js installed" -ForegroundColor Green
}

# ---- 2. Create directories ----
Write-Host "[2/7] Creating directories..." -ForegroundColor Yellow
$null = New-Item -ItemType Directory -Path (Join-Path $APP_DIR "data") -Force
$null = New-Item -ItemType Directory -Path (Join-Path $APP_DIR "public\uploads\competitions") -Force
$null = New-Item -ItemType Directory -Path (Join-Path $APP_DIR "logs") -Force
Write-Host "  Done" -ForegroundColor Green

# ---- 3. Configure .env ----
Write-Host "[3/7] Configuring .env..." -ForegroundColor Yellow
$envFile = Join-Path $APP_DIR ".env"
$envExists = Test-Path $envFile
if (-not $envExists) {
    $bytes = New-Object byte[] 32
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    $rng.GetBytes($bytes)
    $secret = [Convert]::ToBase64String($bytes)
    $ipList = Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -ne "127.0.0.1" -and $_.PrefixOrigin -ne "WellKnown" }
    $serverIP = ($ipList | Select-Object -First 1).IPAddress
    $line1 = 'DATABASE_URL="file:./data/prod.db"'
    $line2 = 'NEXTAUTH_SECRET="' + $secret + '"'
    $line3 = 'NEXTAUTH_URL="http://' + $serverIP + ':' + $PORT + '"'
    $line4 = 'PORT=' + $PORT
    $content = $line1 + "`r`n" + $line2 + "`r`n" + $line3 + "`r`n" + $line4
    [System.IO.File]::WriteAllText($envFile, $content)
    Write-Host "  .env created" -ForegroundColor Green
    Write-Host "  URL = http://${serverIP}:${PORT}" -ForegroundColor Gray
}
else {
    Write-Host "  .env already exists, skipped" -ForegroundColor Gray
}

# ---- 4. Install dependencies ----
Write-Host "[4/7] Installing dependencies (please wait)..." -ForegroundColor Yellow
Set-Location $APP_DIR
& npm install
Write-Host "  Done" -ForegroundColor Green

# ---- 5. Database migration ----
Write-Host "[5/7] Database migration..." -ForegroundColor Yellow
& npx prisma migrate deploy
Write-Host "  Seeding admin account..." -ForegroundColor Yellow
& npm run db:seed
Write-Host "  Admin: admin@mathoi.com / admin123" -ForegroundColor Green

# ---- 6. Build ----
Write-Host "[6/7] Building for production (please wait)..." -ForegroundColor Yellow
& npm run build
Write-Host "  Build complete" -ForegroundColor Green

# ---- 7. Start service ----
Write-Host "[7/7] Starting service..." -ForegroundColor Yellow
& npm install -g pm2
& pm2 delete $APP_NAME -ErrorAction SilentlyContinue
& pm2 start ecosystem.config.js
& pm2 save
Write-Host "  Service started" -ForegroundColor Green

# Auto startup
Write-Host "  Configuring auto-start..." -ForegroundColor Yellow
& npm install -g pm2-windows-startup -ErrorAction SilentlyContinue
& pm2-startup install -ErrorAction SilentlyContinue
& pm2 save

# ---- Done ----
Start-Sleep -Seconds 3

Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "  Deploy complete!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
$ipList2 = Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -ne "127.0.0.1" -and $_.PrefixOrigin -ne "WellKnown" }
$showIP = ($ipList2 | Select-Object -First 1).IPAddress
Write-Host "  URL:      http://${showIP}:${PORT}" -ForegroundColor Cyan
Write-Host "  Admin:    admin@mathoi.com" -ForegroundColor White
Write-Host "  Password: admin123" -ForegroundColor White
Write-Host ""
Write-Host "  Commands:" -ForegroundColor Gray
Write-Host "    pm2 status           # check status" -ForegroundColor Gray
Write-Host "    pm2 logs mathoi-mcm  # view logs" -ForegroundColor Gray
Write-Host "    pm2 restart mathoi-mcm  # restart" -ForegroundColor Gray
Write-Host ""
Write-Host "  !! Change admin password immediately !!" -ForegroundColor Red
Write-Host ""
