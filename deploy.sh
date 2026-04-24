#!/bin/bash
set -e

# ============================================
#  数学建模竞赛平台 - 一键部署脚本
#  用法: bash deploy.sh
#  适用: Ubuntu 20.04+ / Debian 11+
# ============================================

APP_NAME="mathoi-mcm"
APP_DIR="/opt/$APP_NAME"
DOMAIN=""
PORT=3000

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log()  { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
err()  { echo -e "${RED}[✗]${NC} $1"; exit 1; }
ask()  { echo -en "${CYAN}[?]${NC} $1"; }

echo ""
echo "============================================"
echo "   数学建模竞赛平台 - 一键部署"
echo "============================================"
echo ""

# ---- 交互式配置 ----
ask "请输入域名 (无域名直接回车用IP访问): "
read DOMAIN
ask "请输入端口号 [默认3000]: "
read input_port
PORT=${input_port:-3000}

# ---- 1. 安装系统依赖 ----
echo ""
log "正在检查系统依赖..."

if ! command -v node &> /dev/null; then
    log "安装 Node.js 18..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
else
    NODE_VER=$(node -v)
    log "Node.js 已安装: $NODE_VER"
fi

if ! command -v npm &> /dev/null; then
    err "npm 未找到，请检查 Node.js 安装"
fi

if ! command -v pm2 &> /dev/null; then
    log "安装 PM2..."
    sudo npm install -g pm2
else
    log "PM2 已安装"
fi

if ! command -v nginx &> /dev/null; then
    log "安装 Nginx..."
    sudo apt-get update -qq
    sudo apt-get install -y nginx
else
    log "Nginx 已安装"
fi

# ---- 2. 准备项目目录 ----
log "准备项目目录..."

if [ ! -d "$APP_DIR" ]; then
    # 检测当前是否在项目目录内
    if [ -f "./package.json" ] && grep -q "mathoi-mcm" ./package.json; then
        log "从当前目录复制项目到 $APP_DIR..."
        sudo mkdir -p "$APP_DIR"
        sudo cp -r ./* "$APP_DIR/"
        sudo cp -r ./.env.example "$APP_DIR/" 2>/dev/null || true
        sudo cp -r ./.gitignore "$APP_DIR/" 2>/dev/null || true
    else
        ask "项目目录 $APP_DIR 不存在。请输入项目源码路径: "
        read src_path
        if [ ! -d "$src_path" ]; then
            err "路径不存在: $src_path"
        fi
        sudo mkdir -p "$APP_DIR"
        sudo cp -r "$src_path"/* "$APP_DIR/"
        sudo cp -r "$src_path"/.env.example "$APP_DIR/" 2>/dev/null || true
        sudo cp -r "$src_path"/.gitignore "$APP_DIR/" 2>/dev/null || true
    fi
fi

cd "$APP_DIR"
sudo chown -R $USER:$USER "$APP_DIR"

# ---- 3. 创建必要目录 ----
mkdir -p data public/uploads/competitions logs

# ---- 4. 配置环境变量 ----
if [ ! -f ".env" ]; then
    log "生成环境变量配置..."
    SECRET=$(openssl rand -base64 32)

    if [ -n "$DOMAIN" ]; then
        SITE_URL="http://$DOMAIN"
    else
        SERVER_IP=$(hostname -I | awk '{print $1}')
        SITE_URL="http://$SERVER_IP:$PORT"
    fi

    cat > .env << EOF
DATABASE_URL="file:./data/prod.db"
NEXTAUTH_SECRET="$SECRET"
NEXTAUTH_URL="$SITE_URL"
PORT=$PORT
EOF
    log "环境变量已配置"
    log "  NEXTAUTH_URL = $SITE_URL"
else
    warn ".env 文件已存在，跳过配置"
fi

# ---- 5. 安装依赖 ----
log "安装项目依赖..."
npm install --production=false 2>&1 | tail -1

# ---- 6. 数据库迁移 ----
log "执行数据库迁移..."
npx prisma migrate deploy

if ! npx prisma db execute --stdin <<< "SELECT id FROM User LIMIT 1;" &>/dev/null; then
    log "初始化管理员账号..."
    npm run db:seed
    log "管理员: admin@mathoi.com / admin123"
else
    warn "数据库已有数据，跳过种子数据"
fi

# ---- 7. 构建项目 ----
log "构建生产版本 (请稍候)..."
npm run build 2>&1 | tail -3

# ---- 8. PM2 启动 ----
log "启动应用服务..."
pm2 delete "$APP_NAME" 2>/dev/null || true
pm2 start ecosystem.config.js
pm2 save

# 设置开机自启
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u $USER --hp $HOME 2>/dev/null || true
pm2 save

# ---- 9. 配置 Nginx ----
if [ -n "$DOMAIN" ]; then
    log "配置 Nginx 反向代理..."
    sudo tee /etc/nginx/sites-available/$APP_NAME > /dev/null << EOF
server {
    listen 80;
    server_name $DOMAIN;

    client_max_body_size 15M;

    location / {
        proxy_pass http://127.0.0.1:$PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF
    sudo ln -sf /etc/nginx/sites-available/$APP_NAME /etc/nginx/sites-enabled/
    sudo rm -f /etc/nginx/sites-enabled/default
    sudo nginx -t && sudo systemctl reload nginx
    log "Nginx 配置完成"

    # ---- 10. HTTPS (可选) ----
    ask "是否配置 HTTPS 证书? (y/n) [n]: "
    read setup_ssl
    if [ "$setup_ssl" = "y" ] || [ "$setup_ssl" = "Y" ]; then
        if ! command -v certbot &> /dev/null; then
            sudo apt-get install -y certbot python3-certbot-nginx
        fi
        sudo certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --register-unsafely-without-email || warn "SSL 证书申请失败，请稍后手动运行: sudo certbot --nginx -d $DOMAIN"

        # 更新 NEXTAUTH_URL 为 https
        sed -i "s|NEXTAUTH_URL=.*|NEXTAUTH_URL=\"https://$DOMAIN\"|" .env
        npm run build 2>&1 | tail -1
        pm2 restart "$APP_NAME"
        log "HTTPS 已启用"
    fi
else
    warn "未配置域名，跳过 Nginx 配置"
    warn "直接通过 http://服务器IP:$PORT 访问"
fi

# ---- 11. 配置定时备份 ----
BACKUP_CMD="0 2 * * * cp $APP_DIR/data/prod.db $APP_DIR/data/backup_\$(date +\%Y\%m\%d).db && find $APP_DIR/data/ -name 'backup_*.db' -mtime +30 -delete"
(crontab -l 2>/dev/null | grep -v "$APP_DIR/data/prod.db"; echo "$BACKUP_CMD") | crontab -
log "数据库每日凌晨2点自动备份 (保留30天)"

# ---- 完成 ----
echo ""
echo "============================================"
echo -e "  ${GREEN}部署完成！${NC}"
echo "============================================"
echo ""

# 健康检查
sleep 2
HEALTH=$(curl -s http://127.0.0.1:$PORT/api/health 2>/dev/null)
if echo "$HEALTH" | grep -q '"healthy"'; then
    log "健康检查通过 ✓"
else
    warn "健康检查未通过，请检查日志: pm2 logs $APP_NAME"
fi

echo ""
if [ -n "$DOMAIN" ]; then
    echo -e "  访问地址:  ${CYAN}http://$DOMAIN${NC}"
else
    SERVER_IP=$(hostname -I | awk '{print $1}')
    echo -e "  访问地址:  ${CYAN}http://$SERVER_IP:$PORT${NC}"
fi
echo -e "  管理后台:  登录后点击「管理后台」"
echo -e "  管理账号:  admin@mathoi.com"
echo -e "  管理密码:  admin123"
echo -e "  健康检查:  curl http://localhost:$PORT/api/health"
echo ""
echo -e "  ${YELLOW}⚠ 请立即登录修改管理员密码！${NC}"
echo ""
echo "  常用命令:"
echo "    pm2 status          # 查看运行状态"
echo "    pm2 logs $APP_NAME  # 查看日志"
echo "    pm2 restart $APP_NAME  # 重启服务"
echo ""
