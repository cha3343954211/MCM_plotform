# 一键部署脚本（Windows + PM2）
# 用法：在项目根目录执行 .\deploy.ps1

$ErrorActionPreference = 'Stop'
Write-Host "===> 1/7 停止旧 PM2 进程" -ForegroundColor Cyan
pm2 delete mcm 2>$null

Write-Host "===> 2/7 拉取最新代码" -ForegroundColor Cyan
git fetch origin
git reset --hard origin/main
git log -1 --oneline

Write-Host "===> 3/7 安装依赖" -ForegroundColor Cyan
npm install --no-audit --no-fund

Write-Host "===> 4/7 同步数据库结构" -ForegroundColor Cyan
npx prisma generate
npx prisma db push

Write-Host "===> 5/7 清理旧构建产物" -ForegroundColor Cyan
if (Test-Path .next) { Remove-Item -Recurse -Force .next }

Write-Host "===> 6/7 生产环境构建" -ForegroundColor Cyan
$env:NODE_OPTIONS = "--max-old-space-size=1536"
npm run build

Write-Host "===> 7/7 启动 PM2" -ForegroundColor Cyan
pm2 start server.js --name mcm
pm2 save

Write-Host ""
Write-Host "✅ 部署完成！" -ForegroundColor Green
Write-Host "查看日志: pm2 logs mcm --lines 30 --nostream" -ForegroundColor Yellow
