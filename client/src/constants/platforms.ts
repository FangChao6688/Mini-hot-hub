import type { HotCategory, HotSource } from '../types/hot';

export const NEWS_PLATFORM_ORDER: HotSource[] = ['weibo', 'zhihu', 'bilibili'];
export const FINANCE_PLATFORM_ORDER: HotSource[] = ['ths', 'xueqiu', 'cls'];

export const PLATFORM_ORDER_BY_CATEGORY: Record<HotCategory, HotSource[]> = {
  news: NEWS_PLATFORM_ORDER,
  finance: FINANCE_PLATFORM_ORDER,
};

export const PLATFORM_META: Record<HotSource, { sourceName: string; listName: string }> = {
  weibo: { sourceName: '微博', listName: '热搜榜' },
  zhihu: { sourceName: '知乎', listName: '热榜' },
  bilibili: { sourceName: 'B 站', listName: '全站热门' },
  ths: { sourceName: '同花顺', listName: '热股榜' },
  xueqiu: { sourceName: '雪球', listName: '热股榜' },
  cls: { sourceName: '财联社', listName: '热门文章' },
};

export const CATEGORY_META: Record<
  HotCategory,
  { title: string; intro: string; pageLabel: string }
> = {
  news: {
    title: '迷你今日热榜',
    intro: '聚合微博、知乎、B 站热榜，一览今日热点',
    pageLabel: '资讯',
  },
  finance: {
    title: '今日暴富热榜',
    intro: '聚合同花顺、雪球、财联社热榜，一览今日金融热点',
    pageLabel: '财经',
  },
};

/** 各平台主题色（用于卡片 accent） */
export const PLATFORM_THEME: Record<
  HotSource,
  { accent: string; accentSoft: string; accentMuted: string }
> = {
  weibo: { accent: '#ff6a00', accentSoft: 'rgba(255, 106, 0, 0.12)', accentMuted: '#fff7ed' },
  zhihu: { accent: '#0066ff', accentSoft: 'rgba(0, 102, 255, 0.1)', accentMuted: '#eff6ff' },
  bilibili: { accent: '#fb7299', accentSoft: 'rgba(251, 114, 153, 0.12)', accentMuted: '#fff1f5' },
  ths: { accent: '#e62e2e', accentSoft: 'rgba(230, 46, 46, 0.12)', accentMuted: '#fff1f2' },
  xueqiu: { accent: '#0077ff', accentSoft: 'rgba(0, 119, 255, 0.1)', accentMuted: '#eff6ff' },
  cls: { accent: '#c41e3a', accentSoft: 'rgba(196, 30, 58, 0.1)', accentMuted: '#fff1f2' },
};

export function getPlatformOrder(category: HotCategory): HotSource[] {
  return PLATFORM_ORDER_BY_CATEGORY[category];
}
