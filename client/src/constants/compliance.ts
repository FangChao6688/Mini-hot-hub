/** 与 server 端 CACHE_TTL 默认值 600 秒保持一致，可通过 VITE_CACHE_TTL_SECONDS 覆盖 */
const CACHE_TTL_SECONDS = Number(import.meta.env.VITE_CACHE_TTL_SECONDS) || 600;

export const CACHE_TTL_MINUTES = Math.round(CACHE_TTL_SECONDS / 60);

/** 侵权 / 违规联系邮箱（占位，部署时请替换） */
export const FOOTER_CONTACT_EMAIL = 'contact@example.com';

export const FOOTER_LINES = [
  '本站为个人学习项目，仅供技术交流与演示，非商用。',
  '数据来源于微博、知乎、B 站等平台的公开信息，与各平台无官方关联。',
  `榜单更新频率约 ${CACHE_TTL_MINUTES} 分钟（服务端缓存 TTL，与 CACHE_TTL 环境变量一致）。`,
] as const;
