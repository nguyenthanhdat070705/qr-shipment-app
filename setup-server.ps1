# ══════════════════════════════════════════════════════════════
# BlackStone Order SCM — Server Setup Script (Windows)
# Chạy script này trên máy công ty để deploy app
# ══════════════════════════════════════════════════════════════
# 
# CÁCH CHẠY:
#   Mở PowerShell (Run as Administrator) → cd vào thư mục project
#   .\setup-server.ps1
# ══════════════════════════════════════════════════════════════

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "╔══════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  BlackStone Order SCM — Server Setup             ║" -ForegroundColor Cyan
Write-Host "║  Self-hosted Docker Deployment                   ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# ── Step 0: Check prerequisites ──────────────────────────────
Write-Host "▶ [0/5] Checking prerequisites..." -ForegroundColor Yellow

# Check Docker
try {
    $dockerVersion = docker --version
    Write-Host "  ✅ Docker found: $dockerVersion" -ForegroundColor Green
} catch {
    Write-Host "  ❌ Docker not found! Please install Docker Desktop first." -ForegroundColor Red
    Write-Host "     Download: https://www.docker.com/products/docker-desktop/" -ForegroundColor Gray
    exit 1
}

# Check Docker is running
try {
    docker info 2>$null | Out-Null
    Write-Host "  ✅ Docker is running" -ForegroundColor Green
} catch {
    Write-Host "  ❌ Docker is not running! Please start Docker Desktop." -ForegroundColor Red
    exit 1
}

# Check .env.production exists
if (-not (Test-Path ".env.production")) {
    Write-Host "  ❌ .env.production not found!" -ForegroundColor Red
    Write-Host "     Copy .env.production.example → .env.production and fill in values" -ForegroundColor Gray
    exit 1
}
Write-Host "  ✅ .env.production found" -ForegroundColor Green

# ── Step 1: Show machine info ─────────────────────────────────
Write-Host ""
Write-Host "▶ [1/5] Machine information..." -ForegroundColor Yellow

$localIP = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { 
    $_.InterfaceAlias -notmatch "Loopback" -and 
    $_.IPAddress -notmatch "^169\." -and
    $_.IPAddress -ne "127.0.0.1"
} | Select-Object -First 1).IPAddress

Write-Host "  📍 Computer name: $env:COMPUTERNAME" -ForegroundColor White
Write-Host "  📍 Local IP: $localIP" -ForegroundColor White
Write-Host "  📍 LAN URL sẽ là: http://${localIP}:3000" -ForegroundColor Cyan

# ── Step 2: Open firewall port 3000 ──────────────────────────
Write-Host ""
Write-Host "▶ [2/5] Configuring Windows Firewall..." -ForegroundColor Yellow

$firewallRule = Get-NetFirewallRule -DisplayName "BlackStone SCM (Port 3000)" -ErrorAction SilentlyContinue
if ($firewallRule) {
    Write-Host "  ✅ Firewall rule already exists" -ForegroundColor Green
} else {
    try {
        New-NetFirewallRule -DisplayName "BlackStone SCM (Port 3000)" `
            -Direction Inbound -Protocol TCP -LocalPort 3000 `
            -Action Allow -Profile Domain,Private `
            -Description "Allow incoming connections to BlackStone Order SCM app" | Out-Null
        Write-Host "  ✅ Firewall rule created (Port 3000 opened for LAN)" -ForegroundColor Green
    } catch {
        Write-Host "  ⚠️  Could not create firewall rule (run as Administrator)" -ForegroundColor Yellow
        Write-Host "     LAN access may not work, but tunnel will still work" -ForegroundColor Gray
    }
}

# ── Step 3: Build & Start containers ─────────────────────────
Write-Host ""
Write-Host "▶ [3/5] Building & starting Docker containers..." -ForegroundColor Yellow
Write-Host "  ⏳ This may take 3-5 minutes on first build..." -ForegroundColor Gray

docker compose --env-file .env.production up -d --build

if ($LASTEXITCODE -ne 0) {
    Write-Host "  ❌ Docker build failed!" -ForegroundColor Red
    exit 1
}
Write-Host "  ✅ All containers started" -ForegroundColor Green

# ── Step 4: Wait for health check ─────────────────────────────
Write-Host ""
Write-Host "▶ [4/5] Waiting for app to be healthy..." -ForegroundColor Yellow

$maxRetries = 20
$retryCount = 0
$healthy = $false

while ($retryCount -lt $maxRetries) {
    $retryCount++
    Start-Sleep -Seconds 5
    $status = docker inspect --format='{{.State.Health.Status}}' blackstone-app 2>$null
    
    if ($status -eq "healthy") {
        $healthy = $true
        break
    }
    Write-Host "  ⏳ Waiting... ($retryCount/$maxRetries) - Status: $status" -ForegroundColor Gray
}

if ($healthy) {
    Write-Host "  ✅ App is healthy and running!" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  App may still be starting. Check: docker logs blackstone-app" -ForegroundColor Yellow
}

# ── Step 5: Get tunnel URL ────────────────────────────────────
Write-Host ""
Write-Host "▶ [5/5] Getting Cloudflare Tunnel URL..." -ForegroundColor Yellow

Start-Sleep -Seconds 8

$tunnelLogs = docker logs blackstone-tunnel 2>&1

# Extract the tunnel URL from logs
$tunnelUrl = $tunnelLogs | Select-String -Pattern "https://.*\.trycloudflare\.com" | 
    Select-Object -Last 1 | 
    ForEach-Object { $_.Matches[0].Value }

Write-Host ""
Write-Host "══════════════════════════════════════════════════" -ForegroundColor Green
Write-Host "  ✅ DEPLOYMENT COMPLETE!" -ForegroundColor Green
Write-Host "══════════════════════════════════════════════════" -ForegroundColor Green
Write-Host ""
Write-Host "  📌 Truy cập trong mạng LAN:" -ForegroundColor White
Write-Host "     http://${localIP}:3000" -ForegroundColor Cyan
Write-Host ""

if ($tunnelUrl) {
    Write-Host "  🌐 Truy cập từ bên ngoài (Internet):" -ForegroundColor White
    Write-Host "     $tunnelUrl" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  ⚠️  URL tunnel sẽ đổi mỗi khi restart container." -ForegroundColor Yellow
    Write-Host "     Xem URL mới: docker compose logs tunnel" -ForegroundColor Gray
} else {
    Write-Host "  🌐 Tunnel đang khởi tạo, xem URL:" -ForegroundColor White
    Write-Host "     docker compose logs tunnel" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "  📊 Xem trạng thái: docker compose ps" -ForegroundColor Gray
Write-Host "  📋 Xem logs:       docker compose logs -f" -ForegroundColor Gray
Write-Host "  🔄 Restart:        docker compose --env-file .env.production restart" -ForegroundColor Gray
Write-Host "  🛑 Dừng:           docker compose down" -ForegroundColor Gray
Write-Host ""
