# 数学建模竞赛平台 - 项目工作日志 / 交接文档

## 项目概述

- **项目名称**: MathoiMCM
- **项目类型**: 数学建模竞赛在线平台
- **当前用途**: 赛题发布、论文提交、后台管理、评审打分、团队赛、作品公示、通知管理
- **技术栈**: Next.js 14 + TypeScript + Prisma + SQLite + NextAuth + Tailwind CSS
- **目标运行环境**: Windows Server 2025 / Linux VPS
- **当前代码状态**:
  - `npx tsc --noEmit` 通过
  - `npm run build` 通过
  - 本地 `npm run dev` 可正常启动

---

## 一、技术架构与运行方式

### 1.1 前端

- 使用 Next.js App Router
- 主要页面位于 `src/app`
- UI 基于 Tailwind CSS + `lucide-react`
- 后台页面集中在 `src/app/admin/page.tsx`
- 评委工作台位于 `src/app/judge/page.tsx`

### 1.2 后端

- 使用 Next.js Route Handlers 作为 API 层
- 主要 API 位于 `src/app/api`
- 认证依赖 NextAuth Credentials Provider
- 数据访问统一通过 Prisma

### 1.3 数据库

- 数据库类型: SQLite
- ORM: Prisma
- Prisma Schema: `prisma/schema.prisma`
- Prisma 客户端单例: `src/lib/prisma.ts`

### 1.4 当前生产启动方式

- 推荐入口: `server.js`
- PM2 启动命令:

```powershell
pm2 start server.js --name mcm
```

- Windows 一键部署脚本: `deploy.ps1`
- Linux 部署脚本: `deploy.sh`

---

## 二、项目核心功能现状

### 2.1 用户与认证

相关文件:

- `src/lib/auth.ts`
- `src/app/api/auth/[...nextauth]/route.ts`
- `src/app/api/register/route.ts`
- `src/app/login/page.tsx`
- `src/app/register/page.tsx`

已实现:

- 邮箱 + 密码登录
- 密码 bcrypt 加密
- NextAuth JWT Session
- Session 中持久化 `user.id` 与 `user.role`
- 登录失败日志记录
- 登录失败锁定策略
- 用户资料字段: 学校、学号、手机号

当前角色体系:

- `user`: 普通用户
- `judge`: 评委
- `admin`: 普通管理员
- `super_admin`: 高级管理员

权限规则:

- `user`: 只能参与比赛、查看自己的信息与提交
- `judge`: 只能进入评委工作台，执行匿名评审
- `admin`: 可进入管理后台，但不能评审、不能评奖
- `super_admin`: 可进入后台，可评审、可评奖、可查看实名评审信息

说明:

- 用户角色修改默认仅允许 `super_admin`
- 如果系统中没有任何 `super_admin`，允许创建第一个高级管理员，避免系统锁死

---

### 2.2 赛题管理

相关文件:

- `src/app/api/competitions/route.ts`
- `src/app/api/competitions/[id]/route.ts`
- `src/app/competitions/page.tsx`
- `src/app/competitions/[id]/page.tsx`

已实现:

- 创建赛题
- 编辑赛题
- 删除赛题
- 赛题附件上传与替换
- 前台赛题列表展示
- 赛题详情页展示

赛题主要字段:

- 标题、简介、正文
- 开始时间、截止时间
- 状态控制
- 附件名称与路径

---

### 2.3 提交系统

相关文件:

- `src/app/api/submissions/route.ts`
- `src/app/api/submissions/[id]/route.ts`
- `src/app/api/submissions/batch/route.ts`
- `src/app/my-submissions/page.tsx`

已实现:

- 用户提交论文
- 提交文件上传
- 重交与版本控制
- 最新版本标记 `isLatest`
- 管理员查看提交列表
- 批量评分、批量评奖、批量公示、批量删除
- 用户删除自己的未评分提交
- 我的提交页查看历史提交

当前设计说明:

- 默认只展示最新版本
- 管理端可按需要查看更多提交数据
- 上传文件仍是文件系统存储，不走对象存储

---

### 2.4 团队赛

相关文件:

- `src/app/api/teams/route.ts`
- `src/app/api/teams/[id]/route.ts`
- `src/app/api/teams/join/route.ts`
- `src/app/teams/page.tsx`

已实现:

- 创建团队
- 加入团队
- 团队详情查看
- 队长管理成员
- 队长解散团队
- 成员退出团队
- 提交与团队关联

说明:

- 团队相关能力已可用
- 后续仍可增强队长转让、团队锁定、按赛题配置团队模式等能力

---

### 2.5 多评委评分与评审

相关文件:

- `src/app/judge/page.tsx`
- `src/app/api/judge-scores/route.ts`
- `src/lib/roles.ts`

已实现:

- 评委工作台
- 多评委独立打分
- 平均分回写提交记录
- 高级管理员可后台评审
- 普通管理员不能评审
- 评委执行匿名评审

匿名评审规则:

- `judge` 获取提交列表时返回匿名数据
- 隐藏用户实名信息
- 隐藏 `userId`
- 隐藏团队展示信息
- 使用 `anonymousCode` 作为评审编号

当前评审角色规则:

- `judge`: 匿名评分
- `super_admin`: 后台评分、评奖、公示
- `admin`: 不可评分

---

### 2.6 作品公示、评论与点赞

相关文件:

- `src/app/api/showcase/route.ts`
- `src/app/api/showcase/[id]/comments/route.ts`
- `src/app/api/showcase/[id]/comments/[commentId]/route.ts`
- `src/app/api/showcase/[id]/like/route.ts`
- `src/components/ShowcaseInteraction.tsx`

已实现:

- 作品公示列表
- 评论发布
- 点赞切换
- 评论删除与隐藏
- 全站评论/点赞开关

站点配置项:

- `SiteConfig.commentsEnabled`

效果:

- 管理员可关闭互动功能
- 关闭后不能新增评论和点赞
- 旧评论仍可查看

---

### 2.7 公告与通知

相关文件:

- `src/app/api/announcements/route.ts`
- `src/app/api/announcements/[id]/route.ts`
- `src/app/api/notifications/route.ts`
- `src/app/api/admin/notifications/route.ts`

已实现:

- 公告发布与置顶
- 公告前台展示
- 站内通知发送
- 已读/未读状态
- 后台通知管理

---

### 2.8 后台管理

主文件:

- `src/app/admin/page.tsx`

主要模块:

- 仪表盘
- 赛题管理
- 提交管理
- 用户管理
- 文件管理
- 公告管理
- 登录日志
- 数据清理
- 站点设置
- 通知发送
- 模板管理

说明:

- 当前后台是单大页实现
- 功能完整，但文件较大，后续可按模块拆分组件

---

## 三、数据库模型现状

关键模型:

- `User`
- `Competition`
- `Submission`
- `Announcement`
- `Notification`
- `LoginLog`
- `SiteConfig`
- `Team`
- `TeamMember`
- `JudgeScore`
- `ShowcaseComment`
- `ShowcaseLike`

当前数据库特点:

- SQLite 作为主库
- 适合当前 40 人左右规模
- 已针对低配服务器做优化

---

## 四、稳定性与性能优化记录

### 4.1 Prisma 与 SQLite 优化

文件:

- `src/lib/prisma.ts`

已做改动:

- PrismaClient 单例化
- 设置 SQLite `WAL` 模式
- 设置 `synchronous = NORMAL`
- 设置 `busy_timeout = 5000`
- 使用 `$queryRawUnsafe` 执行 SQLite `PRAGMA`，避免 `Execute returned results` 错误

### 4.2 SSR / ESM 兼容修复

文件:

- `src/components/MarkdownRenderer.tsx`

问题:

- SSR 期间 `isomorphic-dompurify` 拉入 `jsdom`，触发 `ERR_REQUIRE_ESM`

修复:

- 改为客户端动态导入 `dompurify`
- 避免 SSR 期间加载不兼容依赖

### 4.3 限流与安全

文件:

- `src/middleware.ts`
- `src/lib/auth.ts`
- `src/lib/fileType.ts`

已做改动:

- API 统一限流
- 登录失败锁定
- 上传文件类型校验
- 评论频率限制
- 下载接口路径校验

### 4.4 健康检查与清理

文件:

- `src/app/api/health/route.ts`
- `src/app/api/admin/cleanup/route.ts`

已实现:

- 健康检查接口
- 孤立文件清理
- 旧日志清理
- 已读通知清理

---

## 五、部署与运维记录

### 5.1 Windows Server 2025 部署

相关文件:

- `server.js`
- `deploy.ps1`
- `deploy-windows.ps1`
- `ecosystem.config.js`

关键结论:

- Windows 上 `pm2 start npm -- start` 容易出问题
- 当前稳定方案是让 PM2 直接跑 `server.js`

推荐启动方式:

```powershell
pm2 start server.js --name mcm
```

推荐更新方式:

```powershell
cd C:\codeworks
pm2 delete mcm
git fetch origin
git reset --hard origin/main
npm install
npx prisma generate
npx prisma db push
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
$env:NODE_OPTIONS="--max-old-space-size=1536"
npm run build
pm2 start server.js --name mcm
pm2 save
pm2 logs mcm --lines 20 --nostream
```

### 5.2 Linux 部署

相关文件:

- `deploy.sh`
- `DEPLOY.md`

说明:

- 已提供 Linux 部署方案
- 但当前实际主要以 Windows Server 路线为准

---

## 六、重要配置与常量

当前常见配置:

- 数据库: SQLite
- 默认文件上传限制: 10MB
- 最大提交版本数: 5
- 评论限流: 每用户每分钟 5 条
- 通知标题最大长度: 200
- 通知内容最大长度: 2000
- 低配服务器目标: 2 核 / 2GB / 40GB SSD

环境变量重点:

- `DATABASE_URL`
- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`

生产环境注意:

- `NEXTAUTH_SECRET` 必须存在
- `.env` 不能漏配

---

## 七、重要文件清单

### 7.1 配置与启动

- `package.json`
- `next.config.mjs`
- `tailwind.config.ts`
- `postcss.config.mjs`
- `server.js`
- `ecosystem.config.js`

### 7.2 数据与认证

- `prisma/schema.prisma`
- `prisma/seed.ts`
- `src/lib/prisma.ts`
- `src/lib/auth.ts`
- `src/lib/roles.ts`

### 7.3 关键页面

- `src/app/admin/page.tsx`
- `src/app/judge/page.tsx`
- `src/app/competitions/[id]/page.tsx`
- `src/app/my-submissions/page.tsx`
- `src/app/teams/page.tsx`
- `src/app/showcase/page.tsx`

### 7.4 关键接口

- `src/app/api/submissions/route.ts`
- `src/app/api/submissions/[id]/route.ts`
- `src/app/api/submissions/batch/route.ts`
- `src/app/api/judge-scores/route.ts`
- `src/app/api/site-config/route.ts`
- `src/app/api/admin/users/[id]/route.ts`
- `src/app/api/showcase/[id]/comments/route.ts`
- `src/app/api/showcase/[id]/like/route.ts`

---

## 八、近期关键改动记录

### 已完成

- 增加团队赛支持
- 增加多评委评分
- 增加通知系统
- 增加作品公示、评论、点赞
- 增加站点配置项 `commentsEnabled`
- 管理员可关闭评论与点赞
- 修复 Prisma SQLite `PRAGMA` 调用方式
- 修复 Markdown 渲染的 ESM / SSR 问题
- 增加 Windows 服务器稳定部署方案
- 新增角色工具 `src/lib/roles.ts`
- 完成管理员 / 高级管理员 / 评委分级
- 评委改为仅匿名评审
- 普通管理员无法评审与评奖

### 最近通过验证的结果

- `git status` 干净
- `npx tsc --noEmit` 通过
- `npm run build` 通过
- `npm run dev` 本地可启动

---

## 九、当前已知问题与后续建议

### 建议优先处理

- 上传仍是整文件读入内存，低配服务器下并发上传有压力
- 团队赛版本淘汰逻辑仍建议按 `teamId + competitionId` 做更精确控制
- 删除最新提交后应进一步确保 `isLatest` 修复逻辑绝对一致
- 登录锁定建议从单纯按邮箱升级为 `email + ip`

### 结构性建议

- 将 `src/app/admin/page.tsx` 拆分为多个组件
- 增加评委分配机制
- 增加评分维度 Rubric
- 增加最低评审人数控制
- 增加成绩发布开关与评分锁定

---

## 十、IDE 迁移提示

如果迁移到其他 IDE 或交给新的协作人，建议优先让对方阅读顺序如下:

1. `WORKLOG.md`
2. `prisma/schema.prisma`
3. `src/lib/auth.ts`
4. `src/lib/roles.ts`
5. `src/lib/prisma.ts`
6. `src/app/admin/page.tsx`
7. `src/app/judge/page.tsx`
8. `DEPLOY.md`
9. `deploy.ps1`

迁移后的首个验证命令:

```powershell
npm install
npx prisma generate
npx prisma db push
npx tsc --noEmit
npm run build
npm run dev
```

---

## 十一、当前结论

该项目目前已经具备可用的竞赛平台主流程，适合继续在现有架构上迭代。

当前最重要的事实是:

- 平台已可正常运行
- 后台、团队赛、多评委、通知、公示等能力已具备
- Windows Server 2025 部署路径已打通
- 评审权限已完成分级
- 当前版本通过了类型检查、生产构建和本地启动验证

本文件可作为后续迁移到其他 IDE、交给其他开发者接手、或未来继续开发时的项目总览与交接依据。
