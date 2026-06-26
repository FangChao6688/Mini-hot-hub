# 今日热搜 · 开发指令

## 项目概述

使用 React + TypeScript + Vite + CSS 开发前端；
使用 Node.js + Express 开发后端，聚合微博/知乎/B 站等热榜。

## 开发规范

- 使用 TypeScript，前后端类型与 TECH_DESIGN 一致
- 使用函数式组件 + Hooks
- 样式使用 CSS / CSS Modules，保持简洁
- 组件可复用：HotCard、HotList、Layout

## 代码风格

- 组件名 PascalCase，函数 camelCase
- 接口路径：/api/hot/:source
- 禁止在前端 fetch 微博/知乎/B 站原始域名

## 设计要求

- 参考今日热榜的信息密度，清爽易读
- 桌面 3 列卡片，移动端 1 列
- 排名 1～3 可视觉强调
- 单卡失败显示错误文案，不拖垮整页

## 注意事项

- 上游请求加合理 User-Agent、Referer（按平台文档）
- 缓存 TTL 默认 600 秒，可用环境变量 CACHE_TTL
- 不要把敏感信息提交到公开 GitHub
- 页脚注明：学习项目、非商用

## 测试要求

- 每完成一个平台，手动验证 ≥10 条数据
- 测试：单平台挂掉时其他平台仍正常
- 测试：10 分钟内重复刷新不会疯狂打上游
