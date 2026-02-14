# APrism Forum System

## 项目简介 | Overview
APrism Forum System 是一个前后端分离的论坛系统。  
APrism Forum System is a full-stack forum project with separated frontend and backend.

当前仓库包含两个子项目：  
This repository contains two subprojects:

- `forum-backend` (Node.js + Express + TypeScript + SQLite)
- `forum-frontend` (React + Vite + TypeScript + Zustand)

目前 Phase 1 / Phase 2 核心功能已完成（积分、勋章、通知、关注、版主、私信、搜索等）。  
Phase 1 / Phase 2 core features are complete (points, badges, notifications, follow, moderation, messages, search, etc.).

## 开发文档仓库 | Documentation Repository
- 开发文档独立仓库：`https://github.com/Prism-lengjing/APrism-Forum-System-Docs`
- External documentation repository: `https://github.com/Prism-lengjing/APrism-Forum-System-Docs`

## 目录结构 | Project Structure
```text
APrism-Forum-system/
├─ forum-backend/            # 后端服务 | Backend service
├─ forum-frontend/           # 前端应用 | Frontend app
├─ docs/                     # 本仓库内文档 | In-repo docs
├─ .github/workflows/ci.yml  # CI 工作流 | CI workflow
└─ README.md
```

## 环境要求 | Requirements
- Node.js 20.x (与 CI 一致 / same as CI)
- npm 10.x+
- Windows / macOS / Linux

## 快速启动 | Quick Start

### 1) 启动后端 | Start Backend
```bash
cd forum-backend
npm install
npm run dev
```

后端默认地址 | Backend default endpoints:
- `http://localhost:3001`
- Health: `http://localhost:3001/health`
- OpenAPI: `http://localhost:3001/api/docs`

### 2) 启动前端 | Start Frontend
```bash
cd forum-frontend
npm install
npm run dev
```

前端默认地址 | Frontend default endpoint:
- `http://localhost:5173`

前端默认请求后端 `http://localhost:3001/api`。  
Frontend API default is `http://localhost:3001/api`.

可配置环境变量 | Optional env vars:
- `VITE_API_BASE_URL`
- `VITE_API_TIMEOUT`

## 常用命令 | Common Commands

### Backend (`forum-backend`)
```bash
npm run dev
npm run build
npm run test
npm run test:coverage
```

### Frontend (`forum-frontend`)
```bash
npm run dev
npm run lint
npm run test
npm run test:coverage
npm run build
npm run test:e2e
```

## CI 说明 | CI Pipeline
CI 文件：`.github/workflows/ci.yml`  
Workflow file: `.github/workflows/ci.yml`

主要 Job | Main jobs:
- `Backend Checks`
- `Frontend Checks`
- `Frontend E2E`

当前策略 | Current strategy:
- Node 20
- npm cache enabled
- `cache-dependency-path: '**/package-lock.json'`
- 安装依赖有兜底：有锁文件用 `npm ci`，否则 `npm install`  
  Install fallback: use `npm ci` when lock file exists, otherwise `npm install`

## 贡献流程 | Contribution Workflow
1. 从最新主分支创建功能分支。  
   Create a feature branch from the latest main branch.
2. 在对应子项目内开发（`forum-backend` 或 `forum-frontend`）。  
   Work in the relevant subproject (`forum-backend` or `forum-frontend`).
3. 提交前执行本地自检。  
   Run local checks before commit.

### 分支命名规范 | Branch Naming Convention
推荐格式：`<type>/<scope>-<short-description>`  
Recommended format: `<type>/<scope>-<short-description>`

常用类型 | Common types:
- `feat`：新功能 | new feature
- `fix`：缺陷修复 | bug fix
- `refactor`：重构 | refactor
- `docs`：文档更新 | docs update
- `test`：测试相关 | tests

命名示例 | Examples:
- `feat/backend-moderator-logs`
- `feat/frontend-thread-moderation-panel`
- `fix/frontend-header-encoding`
- `fix/ci-npm-lock-install`
- `docs/readme-bilingual-update`

### 提交信息规范 | Commit Message Convention
推荐使用 Conventional Commits：  
Use Conventional Commits format:

`<type>(<scope>): <summary>`

常用类型 | Common types:
- `feat`：新功能 | new feature
- `fix`：缺陷修复 | bug fix
- `refactor`：重构（无功能变更）| code refactor (no behavior change)
- `docs`：文档更新 | documentation update
- `test`：测试新增/调整 | tests
- `chore`：构建、脚本、依赖维护 | tooling/deps/maintenance

提交示例 | Commit examples:
- `feat(backend): add forum moderator logs endpoint`
- `fix(frontend): repair header text encoding`
- `test(e2e): stabilize notification settings selectors`
- `docs(readme): add bilingual contribution guide`

后端建议检查 | Backend pre-checks:
```bash
cd forum-backend
npm run build
npm run test
```

前端建议检查 | Frontend pre-checks:
```bash
cd forum-frontend
npm run lint
npm run test
npm run build
```

提交与 PR 建议 | Commit and PR guidelines:
- Commit 信息清晰描述变更目的和范围。  
  Use clear commit messages describing intent and scope.
- PR 描述包含：背景、改动点、验证结果、风险/回滚方案。  
  PR description should include context, changes, validation, and rollback/risk notes.
- 涉及接口变更时，同步更新文档仓库。  
  If API contracts change, update the documentation repository accordingly.

## 开发账号（种子数据） | Seed Accounts
- `admin` / `password123`
- `testuser` / `password123`

## 文档索引 | Docs Index
- `docs/PHASE1_IMPLEMENTATION_STATUS.md`
- `docs/API_REFERENCE.md`
- `docs/BACKEND_GUIDE.md`
- `docs/FRONTEND_GUIDE.md`
- `docs/TESTING_GUIDE.md`

## 常见问题 | FAQ

### 1) CI 中 `npm ci` 失败
通常是 lock 文件缺失。请确认提交了 `package-lock.json`。  
Usually caused by missing lock files. Ensure `package-lock.json` is committed.

### 2) 页面中文乱码
请检查文件编码是否为 UTF-8，并强制刷新浏览器缓存。  
Check file encoding (UTF-8) and hard-refresh browser cache.

## 当前状态 | Current Status
截至 2026-02-14，Phase 2 主线功能与测试已可运行。  
As of 2026-02-14, Phase 2 mainline features and tests are runnable.
