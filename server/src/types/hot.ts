export type HotCategory = 'news' | 'finance';

export type NewsHotSource = 'weibo' | 'zhihu' | 'bilibili';
export type FinanceHotSource = 'ths' | 'xueqiu' | 'cls';
export type HotSource = NewsHotSource | FinanceHotSource;

export interface HotItem {
  rank: number;
  title: string;
  url: string;
  heat?: string;
}

export interface HotPlatform {
  source: HotSource;
  sourceName: string;
  listName: string;
  updatedAt: string;
  items: HotItem[];
  error?: boolean;
  message?: string;
}

export interface HotAggregateResponse {
  category: HotCategory;
  platforms: HotPlatform[];
}

export const NEWS_HOT_SOURCES: NewsHotSource[] = ['weibo', 'zhihu', 'bilibili'];
export const FINANCE_HOT_SOURCES: FinanceHotSource[] = ['ths', 'xueqiu', 'cls'];
export const HOT_SOURCES: HotSource[] = [...NEWS_HOT_SOURCES, ...FINANCE_HOT_SOURCES];

export function isHotSource(value: string): value is HotSource {
  return HOT_SOURCES.includes(value as HotSource);
}

export function isHotCategory(value: string): value is HotCategory {
  return value === 'news' || value === 'finance';
}

export function getSourcesByCategory(category: HotCategory): HotSource[] {
  return category === 'finance' ? FINANCE_HOT_SOURCES : NEWS_HOT_SOURCES;
}

export function resolveHotCategory(value: unknown): HotCategory {
  return value === 'finance' ? 'finance' : 'news';
}
