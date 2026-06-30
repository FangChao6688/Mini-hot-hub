import type { HotItem, HotPlatform } from '../types/hot.js';

/** 雪球热股榜 JSON 接口（需先访问 hq 页获取 Cookie） */
const XUEQIU_HQ_URL = 'https://xueqiu.com/hq';
const XUEQIU_HOT_STOCK_URL =
  'https://stock.xueqiu.com/v5/stock/hot_stock/list.json?page=1&size=50&order=desc&order_by=value&type=20';

const DESKTOP_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const XUEQIU_REFERER = 'https://xueqiu.com/';

const REQUEST_TIMEOUT_MS = 10_000;

interface XueqiuHotStockEntry {
  name?: string;
  symbol?: string;
  value?: number;
}

interface XueqiuHotStockResponse {
  error_code?: string | number;
  data?: {
    items?: XueqiuHotStockEntry[];
  };
}

function formatHeat(value: number): string {
  if (value >= 10_000) {
    return `${Math.round(value / 10_000)}万`;
  }

  return String(value);
}

function buildStockUrl(symbol: string): string {
  return `https://xueqiu.com/S/${symbol}`;
}

function extractCookieHeader(setCookieHeaders: string[] | undefined): string {
  if (!setCookieHeaders?.length) {
    return '';
  }

  return setCookieHeaders.map((entry) => entry.split(';')[0] ?? '').filter(Boolean).join('; ');
}

export function parseXueqiuHotItems(payload: XueqiuHotStockResponse): HotItem[] {
  if (payload.error_code !== undefined && payload.error_code !== 0 && payload.error_code !== '0') {
    throw new Error('雪球热股榜接口返回错误，可能已变更或受限');
  }

  const entries = payload.data?.items;

  if (!Array.isArray(entries) || entries.length === 0) {
    throw new Error('雪球热股榜响应缺少 data.items 或列表为空');
  }

  const items: HotItem[] = [];

  for (const [index, entry] of entries.entries()) {
    const title = entry.name?.trim();
    const symbol = entry.symbol?.trim();

    if (!title || !symbol) {
      continue;
    }

    items.push({
      rank: index + 1,
      title,
      heat: typeof entry.value === 'number' ? formatHeat(entry.value) : undefined,
      url: buildStockUrl(symbol),
    });
  }

  if (items.length === 0) {
    throw new Error('雪球热股榜解析后无有效条目');
  }

  return items;
}

function toFriendlyXueqiuMessage(error: unknown): string {
  if (!(error instanceof Error)) {
    return '雪球热股榜加载失败，请稍后重试';
  }

  const detail = error.message;

  if (detail.includes('超时')) {
    return '雪球热股榜请求超时，请稍后重试';
  }

  if (detail.includes('HTTP') || detail.includes('受限') || detail.includes('非 JSON')) {
    return '雪球热股榜暂时不可用，请稍后重试';
  }

  if (detail.includes('为空') || detail.includes('缺少')) {
    return '雪球热股榜数据异常，请稍后重试';
  }

  return '雪球热股榜加载失败，请稍后重试';
}

async function bootstrapXueqiuCookie(): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(XUEQIU_HQ_URL, {
      signal: controller.signal,
      headers: {
        'User-Agent': DESKTOP_USER_AGENT,
        Accept: 'text/html,application/xhtml+xml',
      },
    });

    if (!response.ok) {
      throw new Error(`雪球 Cookie 预热 HTTP ${response.status}`);
    }

    const setCookieHeaders =
      typeof response.headers.getSetCookie === 'function'
        ? response.headers.getSetCookie()
        : undefined;

    const cookieHeader = extractCookieHeader(setCookieHeaders);

    if (!cookieHeader.includes('xq_a_token')) {
      throw new Error('雪球 Cookie 预热失败，未获取到 xq_a_token');
    }

    return cookieHeader;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`雪球 Cookie 预热超时（>${REQUEST_TIMEOUT_MS / 1000} 秒）`);
    }

    if (error instanceof Error) {
      throw new Error(`雪球 Cookie 预热失败：${error.message}`);
    }

    throw new Error('雪球 Cookie 预热失败：未知错误');
  } finally {
    clearTimeout(timeout);
  }
}

async function requestXueqiuHotStock(cookieHeader: string): Promise<XueqiuHotStockResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(XUEQIU_HOT_STOCK_URL, {
      signal: controller.signal,
      headers: {
        'User-Agent': DESKTOP_USER_AGENT,
        Referer: XUEQIU_REFERER,
        Cookie: cookieHeader,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`雪球热股榜接口 HTTP ${response.status}`);
    }

    const contentType = response.headers.get('content-type') ?? '';

    if (!contentType.includes('application/json')) {
      throw new Error(`雪球热股榜接口返回非 JSON 内容（Content-Type: ${contentType || '未知'}）`);
    }

    return (await response.json()) as XueqiuHotStockResponse;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`雪球热股榜请求超时（>${REQUEST_TIMEOUT_MS / 1000} 秒）`);
    }

    if (error instanceof Error) {
      throw new Error(`雪球热股榜请求失败：${error.message}`);
    }

    throw new Error('雪球热股榜请求失败：未知错误');
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchXueqiuHot(): Promise<HotPlatform> {
  try {
    const cookieHeader = await bootstrapXueqiuCookie();
    const payload = await requestXueqiuHotStock(cookieHeader);
    const items = parseXueqiuHotItems(payload);

    return {
      source: 'xueqiu',
      sourceName: '雪球',
      listName: '热股榜',
      updatedAt: new Date().toISOString(),
      items,
    };
  } catch (error) {
    console.error('[xueqiu]', error instanceof Error ? error.message : error);

    return {
      source: 'xueqiu',
      sourceName: '雪球',
      listName: '热股榜',
      updatedAt: new Date().toISOString(),
      items: [],
      error: true,
      message: toFriendlyXueqiuMessage(error),
    };
  }
}
