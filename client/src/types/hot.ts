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
