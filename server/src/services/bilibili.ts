import type { HotItem, HotPlatform } from '../types/hot.js';

/** B 站热搜 JSON 接口（非 HTML 页面） */
const BILIBILI_HOT_SQUARE_URL = 'https://api.bilibili.com/x/web-interface/search/square?limit=50';

const MOBILE_USER_AGENT =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148';

const BILIBILI_REFERER = 'https://www.bilibili.com/';

const REQUEST_TIMEOUT_MS = 10_000;

/** 上游 trending.list 单项（仅声明用到的字段） */
interface BilibiliTrendingItem {
  /** 热搜词，映射为 HotItem.title（show_name 为空时使用） */
  keyword?: string;
  /** 展示名称，优先映射为 HotItem.title */
  show_name?: string;
  /** 热度分值，映射为 HotItem.heat（格式化为「N万」） */
  heat_score?: number;
}

interface BilibiliHotSquareResponse {
  /** 0 表示成功 */
  code?: number;
  message?: string;
  data?: {
    trending?: {
      /** 榜单标题（如「bilibili热搜」） */
      title?: string;
      /** 热搜条目数组，映射为 HotItem[] */
      list?: BilibiliTrendingItem[];
    };
  };
}

function formatHeat(score: number): string {
  if (score >= 10_000) {
    return `${Math.round(score / 10_000)}万`;
  }
  return String(score);
}

function buildSearchUrl(keyword: string): string {
  return `https://search.bilibili.com/all?keyword=${encodeURIComponent(keyword)}`;
}

/**
 * 解析 api.bilibili.com/x/web-interface/search/square 响应体。
 * 字段映射：list 下标 → rank，show_name/keyword → title，heat_score → heat，keyword 搜索链接 → url
 */
export function parseBilibiliHotItems(payload: BilibiliHotSquareResponse): HotItem[] {
  if (payload.code !== 0) {
    throw new Error(`B 站热搜接口返回 code !== 0（${payload.message ?? '未知错误'}）`);
  }

  const trendingList = payload.data?.trending?.list;

  if (!Array.isArray(trendingList) || trendingList.length === 0) {
    throw new Error('B 站热搜响应缺少 data.trending.list 或列表为空');
  }

  const items: HotItem[] = [];

  for (const [index, entry] of trendingList.entries()) {
    const keyword = entry.keyword?.trim();
    const title = entry.show_name?.trim() || keyword;

    if (!title || !keyword) {
      continue;
    }

    const heat =
      typeof entry.heat_score === 'number' ? formatHeat(entry.heat_score) : undefined;

    items.push({
      rank: index + 1,
      title,
      heat,
      url: buildSearchUrl(keyword),
    });
  }

  if (items.length === 0) {
    throw new Error('B 站热搜解析后无有效条目（keyword / title 均为空）');
  }

  return items;
}

function toFriendlyBilibiliMessage(error: unknown): string {
  if (!(error instanceof Error)) {
    return 'B 站热搜加载失败，请稍后重试';
  }

  const detail = error.message;

  if (detail.includes('超时')) {
    return 'B 站热搜请求超时，请稍后重试';
  }

  if (detail.includes('HTTP') || detail.includes('code !== 0') || detail.includes('非 JSON')) {
    return 'B 站热搜暂时不可用，请稍后重试';
  }

  if (detail.includes('为空') || detail.includes('缺少')) {
    return 'B 站热搜数据异常，请稍后重试';
  }

  return 'B 站热搜加载失败，请稍后重试';
}

async function requestBilibiliHotSquare(): Promise<BilibiliHotSquareResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(BILIBILI_HOT_SQUARE_URL, {
      signal: controller.signal,
      headers: {
        'User-Agent': MOBILE_USER_AGENT,
        Referer: BILIBILI_REFERER,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`B 站热搜接口 HTTP ${response.status}`);
    }

    const contentType = response.headers.get('content-type') ?? '';

    if (!contentType.includes('application/json')) {
      throw new Error(`B 站热搜接口返回非 JSON 内容（Content-Type: ${contentType || '未知'}）`);
    }

    return (await response.json()) as BilibiliHotSquareResponse;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`B 站热搜请求超时（>${REQUEST_TIMEOUT_MS / 1000} 秒）`);
    }

    if (error instanceof Error) {
      throw new Error(`B 站热搜请求失败：${error.message}`);
    }

    throw new Error('B 站热搜请求失败：未知错误');
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchBilibiliHot(): Promise<HotPlatform> {
  try {
    const payload = await requestBilibiliHotSquare();
    const items = parseBilibiliHotItems(payload);

    return {
      source: 'bilibili',
      sourceName: '哔哩哔哩',
      listName: '全站热搜',
      updatedAt: new Date().toISOString(),
      items,
    };
  } catch (error) {
    console.error('[bilibili]', error instanceof Error ? error.message : error);

    return {
      source: 'bilibili',
      sourceName: '哔哩哔哩',
      listName: '全站热搜',
      updatedAt: new Date().toISOString(),
      items: [],
      error: true,
      message: toFriendlyBilibiliMessage(error),
    };
  }
}
