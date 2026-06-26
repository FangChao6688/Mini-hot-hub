import type { HotSource } from '../types/hot';

export const PLATFORM_ORDER: HotSource[] = ['weibo', 'zhihu', 'bilibili'];

export const PLATFORM_META: Record<HotSource, { sourceName: string; listName: string }> = {
  weibo: { sourceName: '微博', listName: '热搜榜' },
  zhihu: { sourceName: '知乎', listName: '热榜' },
  bilibili: { sourceName: 'B 站', listName: '全站热门' },
};

/** 各平台主题色（用于卡片 accent） */
export const PLATFORM_THEME: Record<
  HotSource,
  { accent: string; accentSoft: string; accentMuted: string }
> = {
  weibo: { accent: '#ff6a00', accentSoft: 'rgba(255, 106, 0, 0.12)', accentMuted: '#fff7ed' },
  zhihu: { accent: '#0066ff', accentSoft: 'rgba(0, 102, 255, 0.1)', accentMuted: '#eff6ff' },
  bilibili: { accent: '#fb7299', accentSoft: 'rgba(251, 114, 153, 0.12)', accentMuted: '#fff1f5' },
};
