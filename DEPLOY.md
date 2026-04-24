# 部署指南

## 系统要求

- Node.js >= 18
- npm >= 9

## 快速部署步骤

### 1. 克隆代码到服务器

```bash
git clone <repo-url> /opt/mathoi-mcm
cd /opt/mathoi-mcm
```

### 2. 配置环境变量

```bash
cp .env.example .env
```

编辑 `.env` 文件：

```env
DATABASE_URL="file:./data/prod.db"
NEXTAUTH_SECRET="$(openssl rand -base64 32)"  # 替换为实际生成的值
NEXTAUTH_URL="https://your-domain.com"
PORT=3000
```

**⚠️ 重要**: `NEXTAUTH_SECRET` 必须是一个强随机字符串，生产环境绝不能使用默认值。

### 3. 安装依赖

```bash
npm install
```

### 4. 初始化数据库

```bash
mkdir -p data
npx prisma migrate deploy
npm run db:seed
```

默认管理员: `admin@mathoi.com` / `admin123`  
**登录后请立即修改密码。**

### 5. 创建上传目录

```bash
mkdir -p public/uploads/competitions
```

### 6. 构建项目

```bash
npm run build
```

### 7. 启动服务

```bash
# 直接启动
npm run start

# 或使用 PM2 (推荐)
npm install -g pm2
pm2 start npm --name "mathoi-mcm" -- start
pm2 save
pm2 startup
```

## 使用 PM2 管理 (推荐)

```bash
# 使用 ecosystem 配置
pm2 start ecosystem.config.js
pm2 save
pm2 startup   # 设置开机自启
```

## Nginx 反向代理配置

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # 重定向到 HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate     /etc/ssl/certs/your-domain.crt;
    ssl_certificate_key /etc/ssl/private/your-domain.key;

    # 上传大小限制
    client_max_body_size 15M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # 静态文件缓存
    location /uploads/ {
        alias /opt/mathoi-mcm/public/uploads/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

## 健康检查

```bash
curl http://localhost:3000/api/health
```

返回示例：
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "duration": "5ms",
  "checks": {
    "database": "ok",
    "filesystem": "ok"
  }
}
```

## 数据库备份

```bash
# 手动备份
cp data/prod.db data/backup_$(date +%Y%m%d_%H%M%S).db

# 定时备份 (crontab -e)
0 2 * * * cp /opt/mathoi-mcm/data/prod.db /opt/mathoi-mcm/data/backup_$(date +\%Y\%m\%d).db
```

## 更新部署

```bash
cd /opt/mathoi-mcm
git pull
npm install
npx prisma migrate deploy
npm run build
pm2 restart mathoi-mcm
```
