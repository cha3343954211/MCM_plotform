# MathoiMCM 数学建模竞赛平台

一个基于 **Next.js 14 + Prisma + SQLite + NextAuth** 的数学建模竞赛平台，支持赛题发布、论文提交、团队赛、评委打分、作品公示与后台管理。

## 功能概览

- 用户注册、登录、权限控制（user / judge / admin / super_admin）
- 赛题管理（发布、编辑、附件）
- 提交系统（多版本提交、历史管理）
- 团队赛（创建团队、加入团队、成员管理）
- 多评委评分与匿名评审
- 作品公示、评论、点赞
- 公告与站内通知
- 管理后台（用户、赛题、提交、文件、配置等）

## 技术栈

- **前端/全栈框架**: Next.js 14（App Router）
- **语言**: TypeScript
- **样式**: Tailwind CSS
- **认证**: NextAuth
- **ORM**: Prisma
- **数据库**: SQLite（默认）

## 目录结构

```text
.
├── src/
│   ├── app/                # 页面与 API（Route Handlers）
│   ├── components/         # 复用组件
│   ├── lib/                # 认证、权限、数据库等公共逻辑
│   └── types/
├── prisma/
│   ├── schema.prisma       # 数据模型
│   ├── migrations/         # 迁移文件
│   └── seed.ts             # 初始化数据
├── public/uploads/         # 上传文件目录
├── DEPLOY.md               # 部署文档
└── WORKLOG.md              # 项目工作日志/交接文档
```

## 本地开发

### 1) 环境要求

- Node.js >= 18
- npm（随 Node.js 安装）

### 2) 安装依赖

```bash
npm install
```

### 3) 配置环境变量

```bash
cp .env.example .env
```

至少需要正确配置：

- `DATABASE_URL`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`

> 生产环境务必使用强随机 `NEXTAUTH_SECRET`。

### 4) 初始化数据库

```bash
mkdir -p data
npm run db:deploy
npm run db:seed
```

### 5) 启动开发环境

```bash
npm run dev
```

默认地址：`http://localhost:3000`

## 常用脚本

```bash
npm run dev        # 开发模式
npm run build      # 生产构建
npm run start      # 启动生产服务
npm run lint       # 代码检查（需先配置 ESLint）

npm run db:push    # Prisma 推送 schema
npm run db:migrate # 本地开发迁移
npm run db:deploy  # 生产迁移
npm run db:seed    # 初始化种子数据
```

## 默认管理员账号

初始化后默认管理员为：

- 邮箱：`admin@mathoi.com`
- 密码：`admin123`

请首次登录后立即修改密码。

## 部署说明

详细部署请参考：

- [`DEPLOY.md`](./DEPLOY.md)
- Windows / Linux 脚本：`deploy.ps1`、`deploy-windows.ps1`、`deploy.sh`

## 健康检查

```bash
curl http://localhost:3000/api/health
```
