export type HotSource = 'weibo' | 'zhihu' | 'bilibili';

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
  platforms: HotPlatform[];
}
