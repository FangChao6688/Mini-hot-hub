# 迷你今日热榜

聚合微博、知乎、B 站热榜的学习演示项目。前端 React + Vite，后端 Express + TypeScript。

## 环境要求

- Node.js 18+
- npm 9+

## 安装依赖

前后端各自独立管理依赖。推荐在**项目根目录**一次性安装（含根目录 `concurrently` 与前后端依赖）：

```bash
npm run install:all
```

也可分别安装：

```bash
# 后端
cd server && npm install

# 前端
cd client && npm install
```

## 启动开发环境

**需同时运行前后端**：前端通过 Vite 代理将 `/api` 转发到后端 `http://localhost:3001`。

### 方式一：根目录一条命令（推荐）

```bash
# 在项目根目录
npm run dev
```

等价于 `concurrently` 同时执行 `dev:client` 与 `dev:server`。

也可单独启动某一端：

```bash
npm run dev:server   # 仅后端，默认端口 3001
npm run dev:client   # 仅前端，默认端口 5173
```

### 方式二：两个终端分别启动

```bash
# 终端 1 — 后端
cd server && npm run dev

# 终端 2 — 前端
cd client && npm run dev
```

浏览器访问 [http://localhost:5173](http://localhost:5173)。打开开发者工具 Network，应能看到对 `/api/hot` 的请求返回三个平台数据。

### 生产构建（可选）

```bash
# 根目录
npm run build:server && npm run start:server   # 后端
npm run build:client && npm run preview --prefix client   # 前端

# 或进入子目录
cd server && npm run build && npm start
cd client && npm run build && npm run preview
```

生产部署时，若前后端分离，在 `client/.env.production` 中设置 `VITE_API_BASE` 为后端根 URL（不含 `/api` 后缀）；若同域反代 `/api`，则留空即可。

## Railway 部署（从根目录启动后端）

本项目后端为纯 API 服务（`server/`），适合部署到 Railway。有两种常见方式：

### 方式 A：Service 根目录设为仓库根（推荐配合 `railway.toml`）

1. 在 Railway 新建 Service，连接本仓库。
2. **Root Directory** 留空或设为 `.`（即仓库根目录）。
3. Railway 会读取根目录 [`railway.toml`](./railway.toml)：
   - **Build**：`npm run build:server`（安装 `server/` 依赖并 `tsc` 编译）
   - **Start**：`npm run start:server`（运行 `node server/dist/index.js`）
4. 在 Railway Variables 中按需设置：
   - `PORT` — 通常由 Railway 自动注入，无需手动设置
   - `CACHE_TTL` — 缓存秒数，默认 `600`
   - `NODE_ENV=production`
5. 部署完成后，用 `https://<你的域名>/api/health` 验证应返回 `{"ok":true}`。

若未使用 `railway.toml`，可在 Railway 控制台手动填写：

| 配置项 | 值 |
|--------|-----|
| Build Command | `npm run build:server` |
| Start Command | `npm run start:server` |

> 根目录 `npm install` 只会安装 `concurrently` 等根 dev 依赖；`build:server` 会在构建阶段进入 `server/` 安装后端生产依赖。

### 方式 B：Service 根目录设为 `server/`

1. Railway Service 的 **Root Directory** 设为 `server`。
2. 使用 `server/package.json` 默认脚本即可：
   - Build：`npm run build`
   - Start：`npm start`
3. 此方式无需根目录 `railway.toml`，也无需在根目录执行命令。

### 前端与 CORS

后端通过环境变量 `CORS_ORIGIN` 控制允许访问 API 的前端域名（多个用英文逗号分隔）。本地开发默认 `http://localhost:5173`。

生产部署示例：

```bash
CORS_ORIGIN=https://your-app.vercel.app
```

前端在 Vercel 等平台构建时需设置 `VITE_API_BASE` 为后端 HTTPS 根地址（见下方「上线部署」）。

## 上线部署（公网 HTTPS）

目标：**前端页面**与**后端 API** 各有一个 HTTPS 地址，他人打开前端链接即可使用。

推荐组合：**Railway（后端 API）+ Vercel（前端静态站）**。两者均自动提供 HTTPS，免费额度够学习演示使用。

### 前置：代码推到 GitHub

Railway / Vercel 均从 Git 仓库拉代码部署：

```bash
git init
git add .
git commit -m "准备部署"
git remote add origin https://github.com/<你的用户名>/Mini-hot-hub.git
git push -u origin main
```

### 第一步：部署后端（Railway）

1. 打开 [Railway](https://railway.app/)，用 GitHub 登录，**New Project → Deploy from GitHub repo**，选择本仓库。
2. **Root Directory** 二选一：
   - 仓库根目录 `.`：会使用根目录 `railway.toml`（Build / Start 已配好）
   - 或设为 `server`：使用 `server/package.json` 的 `npm run build` / `npm start`
3. 在 Service → **Variables** 添加：
   | 变量 | 值 |
   |------|-----|
   | `NODE_ENV` | `production` |
   | `CORS_ORIGIN` | 先留空或填 `*`，**前端部署完再改成 Vercel 域名** |
4. **Settings → Networking → Generate Domain**，获得公网地址，例如：  
   `https://mini-hot-hub-production.up.railway.app`
5. 验证 API：

   ```bash
   curl https://<你的-railway-域名>/api/health
   # 应返回 {"ok":true}

   curl https://<你的-railway-域名>/api/hot
   # 应返回含 platforms 的 JSON
   ```

记下此 URL，作为前端的 `VITE_API_BASE`（**不要**加 `/api` 后缀）。

### 第二步：部署前端（Vercel）

1. 打开 [Vercel](https://vercel.com/)，用 GitHub 登录，**Add New → Project**，导入同一仓库。
2. **Root Directory** 设为 `client`。
3. Framework 选 **Vite**（一般会自动识别）；Build Command `npm run build`，Output `dist`。
4. **Environment Variables** 添加（Production）：

   | 名称 | 值 |
   |------|-----|
   | `VITE_API_BASE` | `https://<你的-railway-域名>` |

   示例：`https://mini-hot-hub-production.up.railway.app`

5. 点击 **Deploy**。完成后获得前端 HTTPS 地址，例如：  
   `https://mini-hot-hub.vercel.app`

### 第三步：回写 CORS 并验证

1. 回到 Railway → Variables，将 `CORS_ORIGIN` 设为前端完整 origin（与浏览器地址栏一致）：

   ```
   https://mini-hot-hub.vercel.app
   ```

   若有预览域名，可逗号分隔多个：`https://xxx.vercel.app,https://xxx-git-main-xxx.vercel.app`

2. Railway 会自动重新部署。打开前端 HTTPS 链接，应能看到三平台热榜；开发者工具 Network 中 `/api/hot` 请求应指向 Railway 域名且状态 200。

### 常见问题

| 现象 | 处理 |
|------|------|
| 前端「加载失败」，Console 报 CORS | 检查 Railway 的 `CORS_ORIGIN` 是否与 Vercel 域名完全一致（含 `https://`，无末尾 `/`） |
| `/api/hot` 404 或连错地址 | 检查 Vercel 的 `VITE_API_BASE` 是否正确；修改后需 **Redeploy** 前端 |
| Railway 构建失败 | 确认 Root Directory 与 Build 命令匹配（根目录用 `npm run build:server`） |
| 仅想快速联调 | 临时设 `CORS_ORIGIN=*`（学习项目可用，正式环境建议写具体域名） |

### 其它平台（可选）

- **后端**：Render、Fly.io、自有 VPS + Nginx + Let's Encrypt，启动命令均为 `npm run build && npm start`（在 `server/` 内）。
- **前端**：Netlify、Cloudflare Pages，构建目录 `client/dist`，同样设置 `VITE_API_BASE`。
- **同域部署**：若用 Nginx 将 `/api` 反代到 Node、静态文件指向前端 `dist`，则 `VITE_API_BASE` 留空即可，且无需 CORS。

## 常见问题

### 端口被占用

**现象**：启动时报 `EADDRINUSE`，或页面无法访问。

| 端口 | 默认服务 | 处理方式 |
|------|----------|----------|
| **3001** | Express 后端 | 结束占用进程，或指定其他端口 |
| **5173** | Vite 前端 | 结束占用进程，Vite 会自动尝试下一端口 |

**macOS / Linux** — 查找并结束占用进程：

```bash
# 查看占用 3001 的进程
lsof -i :3001

# 结束进程（将 PID 替换为实际值）
kill -9 <PID>
```

**改用其他后端端口**：

```bash
PORT=3002 npm run dev   # 在 server/ 目录下
```

若修改后端端口，需同步更新 `client/vite.config.ts` 中的 `API_PROXY_TARGET`。

### 代理不生效

**现象**：前端页面报错「加载失败」、Network 中 `/api/hot` 返回 404 或 HTML 而非 JSON。

按以下顺序排查：

1. **确认后端已启动**  
   在终端应看到 `Server running at http://localhost:3001`。可单独验证：

   ```bash
   curl http://localhost:3001/api/hot
   ```

   应返回包含 `platforms` 数组的 JSON。

2. **确认通过 Vite 访问前端**  
   开发环境请访问 `http://localhost:5173`，不要直接打开 `client/dist` 静态文件。代理仅在 `npm run dev`（或 `npm run preview`）时生效。

3. **确认请求路径正确**  
   前端应请求相对路径 `/api/hot`，而非 `http://localhost:3001/api/hot`（开发环境由 Vite 代理转发）。

4. **检查 `VITE_API_BASE`**  
   本地开发时 `VITE_API_BASE` 应为空或未设置。若误设为其他地址，请求会绕过 Vite 代理，可能导致跨域或连错服务。

5. **重启两端**  
   修改 `vite.config.ts` 或后端端口后，需重启 `npm run dev` 使配置生效。

## 数据来源说明

本项目的榜单数据由后端 Express 服务从各平台**公开 JSON 接口**拉取并聚合，**不解析 HTML 网页**，前端仅请求本站 `/api/*`。

### 各平台获取方式

| 平台 | 榜单 | JSON 接口 | 实现文件 |
|------|------|-----------|----------|
| 微博 | 热搜榜 | `https://weibo.com/ajax/statuses/hot_band` | `server/src/services/weibo.ts` |
| 知乎 | 热榜 | `https://api.zhihu.com/topstory/hot-list?limit=50` | `server/src/services/zhihu.ts` |
| B 站 | 全站热搜 | `https://api.bilibili.com/x/web-interface/search/square?limit=50` | `server/src/services/bilibili.ts` |

后端请求时会设置合理的移动端 `User-Agent` 与 `Referer`。上游字段映射为统一结构 `{ rank, title, heat?, url }`，详见各 Service 文件中的注释。

单平台失败时，HTTP 仍返回 `200`，响应体设 `error: true` 与 `message`，不影响其他平台卡片展示。

### 更新频率（缓存 TTL）

为避免频繁请求上游，后端对每平台独立缓存，键名为 `hot:weibo`、`hot:zhihu`、`hot:bilibili`：

| 配置项 | 默认值 | 说明 |
|--------|--------|------|
| `CACHE_TTL` | `600`（秒） | 同一平台在 TTL 内重复请求走内存缓存 |
| 缓存范围 | 单平台独立 | `?refresh=1`（仅开发环境）只刷新当前平台缓存 |

因此页面上「更新于 N 分钟前」在缓存有效期内可能不变，表示**该批数据的抓取时间**，属正常现象。

开发环境强制刷新示例：

```bash
curl 'http://localhost:3001/api/hot/weibo?refresh=1'
```

### 模拟单平台失败（开发环境）

用于验证前端 error 卡片展示，在 `server/` 目录设置环境变量后重启后端：

| 变量 | 效果 |
|------|------|
| `MOCK_FAIL_WEIBO=1` | 微博返回 `error: true` |
| `MOCK_FAIL_ZHIHU=1` | 知乎返回 `error: true` |
| `MOCK_FAIL_BILIBILI=1` | B 站返回 `error: true` |

```bash
cd server
MOCK_FAIL_WEIBO=1 npm run dev
```

浏览器访问首页，微博卡片应显示错误文案与「点击重试」按钮，知乎 / B 站仍正常。关闭模拟：去掉环境变量并重启，或 `unset MOCK_FAIL_WEIBO`。

> 生产环境（`NODE_ENV=production`）下这些变量会被忽略。

### 免责声明

- 本项目为**个人学习演示**，**非商用**，不得用于商业或大规模对外服务。
- 数据来源于微博、知乎、B 站的公开接口，仅供学习与技术交流，**与各平台无任何官方关联或授权**。
- 榜单内容版权归各平台及原作者所有；上游接口可能变更或限流，本项目不保证数据的实时性、完整性与准确性。
- 请勿将 `.env`、Cookie、Token 等敏感信息提交到公开仓库。

## 项目结构

```
├── client/          # React 前端
├── server/          # Express 后端
├── package.json     # 根脚本：dev / dev:client / dev:server / build:server 等
├── railway.toml     # Railway 从根目录部署后端的构建与启动命令
├── TECH_DESIGN.md   # 接口与类型设计
└── AGENT.md         # 开发规范
```
