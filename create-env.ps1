# Script tạo file .env.production tự động
# Chạy trên máy công ty: .\create-env.ps1

$content = @"
APP_PORT=3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=https://woqtdgzldkxmcgjshthx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndvcXRkZ3psZGt4bWNnanNodGh4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4MTYyMDcsImV4cCI6MjA4OTM5MjIwN30.f6cgXCzxWcpRLHsHOEGyNUmFOR8cffofCUuUYigNIEE
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndvcXRkZ3psZGt4bWNnanNodGh4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzgxNjIwNywiZXhwIjoyMDg5MzkyMjA3fQ.jGZlG0GWc1eZRaHd0FtFtGcYiDe18Nu_YoWkAyXiGWM
SYNC_API_KEY=0c63b25fc8054aa43449fe75d1f5387ccd7c86e82cd0d2815a8ed8ad167862ff
CRON_SECRET=blackstone-cron-secret-2026
ONEOFFICE_API_KEY=84869196569c35038d0514699999665
ONEOFFICE_BASE_URL=https://cloud-cloud.1office.vn
ONEOFFICE_INVENTORY_TOKEN=201770191369c4adde97a6d512470927
ONEOFFICE_WAREHOUSE_TOKEN=21629249469c4ae9a40117149012318
"@

$content | Out-File -FilePath ".env.production" -Encoding UTF8 -NoNewline
Write-Host "✅ File .env.production da duoc tao thanh cong!" -ForegroundColor Green
Write-Host "   Xoa file create-env.ps1 sau khi chay xong." -ForegroundColor Yellow
