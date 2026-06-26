# 今日热搜 · Agent 开发指令

> 本文档供 AI Agent / 协作者快速上手实现。需求背景见 [RESEARCH.md](./RESEARCH.md)，产品约束见 [PRD.md](./PRD.md)，接口与结构见 [TECH_DESIGN.md](./TECH_DESIGN.md)。

## 阅读顺序

1. **RESEARCH.md** — 做什么、为什么
2. **TECH_DESIGN.md** — 怎么做（类型、API、目录、缓存）
3. **本文档** — 实现时的硬性规则与推荐步骤

## 项目概述

| 端 | 技术栈 | 职责 |
|----|--------|------|
| 前端 `client/` | React + TypeScript + Vite + CSS | 卡片网格展示多平台热榜 |
| 后端 `server/` | Node.js + Express + TypeScript | 聚合微博 / 知乎 / B 站 JSON，缓存后对外提供 API |

**目标**：真实热榜数据（非长期 Mock），HTTPS 可公网访问，单平台失败不影响整页。

---

## 硬性约束（必须遵守）

### 架构

- **业务逻辑写在 Service**，`routes/` 只做参数校验与 HTTP 响应，禁止在 Controller / Route 里写解析逻辑
- 前端**只请求本站** `/api/*`，**禁止** `fetch` 微博 / 知乎 / B 站原始域名
- 类型以 `server/src/types/hot.ts` 为权威定义，前端 `client/src/types/` 与之保持一致

### API

| 方法 | 路径 | 用途 |
|------|------|------|
| `GET` | `/api/hot` | 首页：返回全部平台 `{ platforms: HotPlatform[] }` |
| `GET` | `/api/hot/:source` | 单平台：`weibo` \| `zhihu` \| `bilibili` |
| `GET` | `/api/health` | 健康检查 |

- 单平台上游失败：HTTP 仍 `200`，响应体设 `error: true` + `message`，`items: []`
- 非法 `source`：返回 `404`

### 数据与缓存

- 数据来源：各平台**公开 JSON 接口**（`fetch` 解析），**不用** HTML 爬虫、**不用**微博 OAuth
- 缓存：内存 `Map`，键 `hot:${source}`，TTL 默认 **600 秒**，环境变量 `CACHE_TTL` 可覆盖（建议 300～600）
- Mock 仅用于本地联调初期；接入真实接口后，首页应展示真实数据

### 安全与合规

- `.env`、密钥、Token **不得**提交到 Git；提供 `.env.example`
- 页脚固定文案：**学习项目 · 非商用**
- 上游请求需设置合理 `User-Agent`、`Referer`（按平台实际调试结果）

---

## 开发规范

### 前端

- 函数式组件 + Hooks，不用 class 组件
- 组件名 **PascalCase**，函数 / 变量 **camelCase**
- 样式：**CSS 或 CSS Modules**，不引入重型 UI 库，保持简洁清新
- 可复用组件：`Layout`、`HotCard`、`HotList`
- API 封装放在 `client/src/api/`（如 `fetchAllHot`）

### 后端

- 每个平台一个 Service 文件：`weibo.ts`、`zhihu.ts`、`bilibili.ts`
- 统一导出 `PlatformFetcher` 签名，在 `services/index.ts` 注册
- 请求超时建议 8～10 秒；异常捕获后返回 `error` 态 `HotPlatform`，不导致 `/api/hot` 整页 500
- 多平台聚合时**并行**请求，互不影响

### 代码风格

- 使用 TypeScript，避免 `any`；必要时用明确类型或 `unknown` + 收窄
- 不添加与任务无关的注释、重构或依赖
- 类名不冲突时用 `import`，不用全限定类名
- 不使用已标记废弃的 API

---

## UI / 设计要求

- 参考「今日热榜」**信息密度**：清爽、易读、风格简洁清新
- **桌面**：3 列卡片网格；**移动端**：1 列（CSS Grid + media query）
- 排名 **1～3** 视觉强调（颜色 / 字重 / 序号样式）
- 单卡状态：`loading` → 列表 / `error`（展示 `message`），**不拖垮整页**
- 热榜链接 `target="_blank"` + `rel="noopener noreferrer"`

---

## 推荐实现顺序

按阶段推进，每阶段完成后再进入下一阶段，并执行对应测试。

```text
Phase 0  脚手架
         ├── client/（Vite + React + TS）
         ├── server/（Express + TS）
         └── Vite 代理 /api → localhost:3001

Phase 1  契约与骨架
         ├── server/src/types/hot.ts
         ├── utils/cache.ts
         ├── routes/hot.ts（可先返回 Mock）
         └── 前端 Layout + HotCard + HotList 静态布局

Phase 2  平台接入（逐个完成，每完成一个即验收）
         ├── services/weibo.ts   → 手测 ≥10 条
         ├── services/zhihu.ts   → 手测 ≥10 条
         └── services/bilibili.ts → 手测 ≥10 条

Phase 3  联调与打磨
         ├── 首页 GET /api/hot 一次拉全量
         ├── 错误态、更新时间、页脚文案
         └── README：启动方式、环境变量、部署说明
```

**原则**：先打通一条真实平台链路，再复制模式到其余平台；不要三个平台同时半成品。

---

## 测试要求（每阶段必做）

| 项 | 验收标准 |
|----|----------|
| 数据量 | 每个平台 ≥10 条，含 `rank`、`title`、`url` |
| 容错 | 模拟单平台失败（错误 URL 或断网），其他卡片仍正常 |
| 缓存 | 10 分钟内多次刷新，上游请求次数符合 TTL（看日志或抓包） |
| 布局 | 桌面 3 列、移动 1 列；前 3 名样式正确 |
| 合规 | 页脚可见「学习项目 · 非商用」 |

Agent 完成实现后应**实际运行** `client` 与 `server`，用浏览器或 `curl` 验证，不要仅声称通过。

---

## 禁止事项

- 在前端直连第三方热榜域名
- 在 `routes/` 写抓取、解析、字段映射逻辑
- 长期用 Mock 冒充生产数据
- 提交 `.env`、API Key、Cookie 等敏感信息
- 为单个平台失败返回 `/api/hot` 整体 500
- 未经用户要求执行 `git commit` / `git push`

---

## 环境变量

| 变量 | 位置 | 默认 | 说明 |
|------|------|------|------|
| `CACHE_TTL` | server | `600` | 缓存秒数 |
| `PORT` | server | `3001` | 后端端口 |
| `VITE_API_BASE` | client | 空 | 生产后端根 URL；开发留空走 Vite 代理 |

---

## 本地启动（实现后应可执行）

```bash
# 终端 1 — 后端
cd server && npm install && npm run dev

# 终端 2 — 前端
cd client && npm install && npm run dev
```

浏览器访问 `http://localhost:5173`，Network 中应看到对 `/api/hot` 的请求。

---

## 完成定义（Definition of Done）

- [ ] 微博、知乎、B 站三个平台均有真实数据展示
- [ ] `GET /api/hot` 与 `GET /api/hot/:source` 行为符合 TECH_DESIGN
- [ ] 缓存生效，TTL 可通过 `CACHE_TTL` 配置
- [ ] 单卡失败有明确错误文案，其余卡片正常
- [ ] 响应式布局与排名前 3 强调符合设计要求
- [ ] README 含启动、环境变量、部署指引
- [ ] 无敏感信息入库

---

## 遇到问题时的优先级

1. **查 TECH_DESIGN** — 类型、API、目录是否一致
2. **查上游 JSON 结构是否变更** — 调整对应 `services/*.ts` 映射
3. **查请求头** — `User-Agent` / `Referer` 是否导致 403
4. **救急方案** — 短期可用不稳定第三方 API，但需在代码注释标明，且不应替代主路线

---

## 文档维护

- 变更 API 或类型时，同步更新 **TECH_DESIGN.md** 与前后端 `types`
- 新增平台：新增 `services/xxx.ts` + 注册 `HotSource` + 更新 TECH_DESIGN 平台列表
- PRD 描述「做什么」，TECH_DESIGN 描述「怎么设计」，**AGENT.md 描述「怎么写代码」** — 三者勿混用职责
