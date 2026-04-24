# 数学建模竞赛平台 - 项目工作日志

## 项目概述

- **项目名称**: MathoiMCM (数学建模竞赛平台)
- **技术栈**: Next.js 14 + TypeScript + Prisma (SQLite) + NextAuth + TailwindCSS
- **开发时间**: 2026年4月23日

---

## 一、项目初始化

### 1.1 创建项目结构

- 初始化 `package.json`，配置 Next.js、React、Prisma、NextAuth、TailwindCSS、bcryptjs、lucide-react 等依赖
- 配置 `tsconfig.json`、`next.config.mjs`、`tailwind.config.ts`、`postcss.config.mjs`
- 创建 `.gitignore`、`.env.example` 环境变量模板

### 1.2 数据库设计 (Prisma Schema)

**文件**: `prisma/schema.prisma`

定义了以下数据模型:

| 模型 | 说明 | 关键字段 |
|------|------|----------|
| User | 用户 | name, email, password, role, school, studentId, phone |
| Competition | 赛题 | title, description, content, startTime, endTime, status, attachmentName, attachmentPath |
| Announcement | 公告 | title, content, pinned, published |
| Submission | 提交 | fileName, filePath, teamName, teamMembers, score, feedback, status |

### 1.3 认证系统

**文件**: `src/lib/auth.ts`

- 使用 NextAuth Credentials Provider，基于邮箱+密码登录
- JWT Session 策略，有效期 7 天
- 角色扩展: session 中携带 `role` 和 `id` 字段
- 管理员种子账号: `admin@mathoi.com` / `admin123`

---

## 二、核心功能开发

### 2.1 用户注册与登录

| 文件 | 功能 |
|------|------|
| `src/app/api/register/route.ts` | 用户注册 API，密码 bcrypt 加密 |
| `src/app/login/page.tsx` | 登录页面，邮箱+密码表单 |
| `src/app/register/page.tsx` | 注册页面，含学校/学号/手机可选字段 |

### 2.2 赛题管理

| 文件 | 功能 |
|------|------|
| `src/app/api/competitions/route.ts` | GET 赛题列表 / POST 创建赛题 (FormData, 附件上传) |
| `src/app/api/competitions/[id]/route.ts` | GET 详情 / PUT 更新 / DELETE 删除 (含附件清理) |
| `src/app/competitions/page.tsx` | 赛题列表前台页面 |
| `src/app/competitions/[id]/page.tsx` | 赛题详情页 + 论文提交表单 |

**附件上传**:
- 存储路径: `public/uploads/competitions/`
- 文件名格式: `comp_{timestamp}{ext}`
- 大小限制: 10MB (前后端双重校验)

### 2.3 论文提交

| 文件 | 功能 |
|------|------|
| `src/app/api/submissions/route.ts` | GET 提交列表 / POST 提交论文 (10MB 限制) |
| `src/app/api/submissions/[id]/route.ts` | PUT 评分/反馈 (管理员) |
| `src/app/my-submissions/page.tsx` | "我的提交" 页面 |

**提交条件**: 赛题 status 为 `active` 且未过截止时间

### 2.4 公告系统

| 文件 | 功能 |
|------|------|
| `src/app/api/announcements/route.ts` | GET 公告列表 / POST 创建公告 |
| `src/app/api/announcements/[id]/route.ts` | PUT 更新 / DELETE 删除 |
| `src/components/AnnouncementList.tsx` | 首页公告展示组件 |

**功能**: 置顶、发布/取消发布、CRUD

---

## 三、管理后台

**文件**: `src/app/admin/page.tsx`

### 3.1 功能 Tab

| Tab | 功能 |
|-----|------|
| 赛题管理 | 创建/编辑/删除赛题，附件上传/替换/移除 |
| 提交评审 | 查看所有提交，评分、写评语 |
| 用户管理 | 编辑用户信息、删除用户 (级联删除提交和文件) |
| 公告管理 | 发布/编辑/删除公告，置顶/取消置顶，发布/取消发布 |
| 文件存储 | 查看所有上传文件，下载/删除，显示总大小 |

### 3.2 管理 API

| 文件 | 功能 |
|------|------|
| `src/app/api/admin/users/route.ts` | GET 用户列表 |
| `src/app/api/admin/users/[id]/route.ts` | PUT 编辑用户 / DELETE 删除用户 |
| `src/app/api/admin/files/route.ts` | GET 文件列表 / DELETE 删除文件 |

---

## 四、稳定性增强与部署准备

### 4.1 安全加固

| 改动 | 文件 |
|------|------|
| 安全响应头 (X-Content-Type-Options, X-Frame-Options 等) | `next.config.mjs` |
| 关闭 X-Powered-By | `next.config.mjs` |
| API 限流 (认证10次/分钟，通用100次/分钟) | `src/middleware.ts` |
| NextAuth 显式 secret + 7天 session | `src/lib/auth.ts` |

### 4.2 错误处理

| 文件 | 功能 |
|------|------|
| `src/app/error.tsx` | 全局错误边界，显示错误提示 + 重试按钮 |
| `src/app/not-found.tsx` | 404 页面 |
| `src/app/loading.tsx` | 全局加载状态 |
| `src/lib/env.ts` | 环境变量验证 |

### 4.3 文件下载修复

**问题**: 动态上传的文件通过静态路径 `/uploads/xxx` 在生产模式下无法访问

**修复**: 创建 `src/app/api/download/route.ts`
- 通过 API 流式返回文件
- 路径遍历攻击防护 (只允许 `/uploads/` 前缀)
- 正确的 MIME 类型和中文文件名支持

### 4.4 数据库

- 从 `db push` 迁移到 `prisma migrate`，生成正式迁移文件
- Prisma Client 添加条件日志 + 优雅断连

### 4.5 健康检查

**文件**: `src/app/api/health/route.ts`

```
GET /api/health → { status: "healthy", checks: { database, filesystem } }
```

---

## 五、部署配置

### 5.1 生产构建

```bash
npm run build  # ✓ 零错误通过
```

### 5.2 配置文件

| 文件 | 用途 |
|------|------|
| `ecosystem.config.js` | PM2 进程管理配置 (自动重启、内存限制、日志) |
| `.env.example` | 环境变量模板 (含生产配置说明) |
| `DEPLOY.md` | 完整部署文档 (Nginx/HTTPS/备份) |
| `deploy.sh` | 一键部署脚本 |

### 5.3 一键部署脚本 (`deploy.sh`)

自动完成: 安装 Node.js/PM2/Nginx → 配置环境变量 → 安装依赖 → 数据库迁移 → 构建 → PM2 启动 → Nginx 反向代理 → 可选 HTTPS → 定时备份

---

## 六、项目文件结构

```
MathoiMCM/
├── prisma/
│   ├── schema.prisma          # 数据模型
│   ├── seed.ts                # 种子数据 (管理员)
│   └── migrations/            # 数据库迁移
├── public/uploads/            # 上传文件存储
│   └── competitions/          # 赛题附件
├── src/
│   ├── app/
│   │   ├── layout.tsx         # 根布局
│   │   ├── page.tsx           # 首页
│   │   ├── error.tsx          # 错误边界
│   │   ├── not-found.tsx      # 404
│   │   ├── loading.tsx        # 加载状态
│   │   ├── globals.css        # 全局样式
│   │   ├── login/page.tsx     # 登录
│   │   ├── register/page.tsx  # 注册
│   │   ├── competitions/
│   │   │   ├── page.tsx       # 赛题列表
│   │   │   └── [id]/page.tsx  # 赛题详情+提交
│   │   ├── my-submissions/page.tsx  # 我的提交
│   │   ├── admin/page.tsx     # 管理后台
│   │   └── api/
│   │       ├── auth/[...nextauth]/route.ts
│   │       ├── register/route.ts
│   │       ├── competitions/route.ts
│   │       ├── competitions/[id]/route.ts
│   │       ├── submissions/route.ts
│   │       ├── submissions/[id]/route.ts
│   │       ├── announcements/route.ts
│   │       ├── announcements/[id]/route.ts
│   │       ├── admin/users/route.ts
│   │       ├── admin/users/[id]/route.ts
│   │       ├── admin/files/route.ts
│   │       ├── download/route.ts
│   │       └── health/route.ts
│   ├── components/
│   │   ├── Navbar.tsx         # 导航栏
│   │   ├── Providers.tsx      # NextAuth Provider
│   │   └── AnnouncementList.tsx  # 公告组件
│   ├── lib/
│   │   ├── prisma.ts          # Prisma 客户端
│   │   ├── auth.ts            # NextAuth 配置
│   │   ├── utils.ts           # 工具函数
│   │   └── env.ts             # 环境变量验证
│   ├── types/next-auth.d.ts   # 类型声明
│   └── middleware.ts          # API 限流
├── package.json
├── next.config.mjs
├── tailwind.config.ts
├── ecosystem.config.js        # PM2 配置
├── deploy.sh                  # 一键部署脚本
├── DEPLOY.md                  # 部署文档
└── WORKLOG.md                 # 本文件
```

---

## 七、关键配置

| 项目 | 值 |
|------|-----|
| 默认管理员 | admin@mathoi.com / admin123 |
| 数据库 | SQLite (file:./dev.db) |
| 文件上传限制 | 10MB |
| Session 有效期 | 7 天 |
| API 限流 | 认证 10次/分钟，通用 100次/分钟 |
| 数据库备份 | 每日凌晨2点 (保留30天) |
