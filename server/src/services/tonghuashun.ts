import type { HotItem, HotPlatform } from '../types/hot.js';

/** 同花顺热股榜 JSON 接口（非 HTML 页面） */
const THS_HOT_STOCK_URL =
  'https://dq.10jqka.com.cn/fuyao/hot_list_data/out/hot_list/v1/stock?stock_type=a&type=hour&list_type=normal';

const MOBILE_USER_AGENT =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148';

const THS_REFERER = 'https://eq.10jqka.com.cn/';

const REQUEST_TIMEOUT_MS = 10_000;

interface ThsHotStockEntry {
  order?: number;
  name?: string;
  code?: string;
  rate?: string | number;
  rise_and_fall?: number;
}

interface ThsHotStockResponse {
  status_code?: number;
  data?: {
    stock_list?: ThsHotStockEntry[];
  };
}

function formatHeat(rate: string | number): string {
  const value = typeof rate === 'string' ? Number.parseFloat(rate) : rate;

  if (!Number.isFinite(value)) {
    return String(rate);
  }

  if (value >= 10_000) {
    return `${Math.round(value / 10_000)}万`;
  }

  return String(Math.round(value));
}

function buildStockUrl(code: string): string {
  return `https://stockpage.10jqka.com.cn/${code}/`;
}

export function parseTonghuashunHotItems(payload: ThsHotStockResponse): HotItem[] {
  if (payload.status_code !== 0) {
    throw new Error('同花顺热股榜接口返回 status_code !== 0，可能已变更或受限');
  }

  const stockList = payload.data?.stock_list;

  if (!Array.isArray(stockList) || stockList.length === 0) {
    throw new Error('同花顺热股榜响应缺少 data.stock_list 或列表为空');
  }

  const items: HotItem[] = [];

  for (const entry of stockList) {
    const title = entry.name?.trim();
    const code = entry.code?.trim();

    if (!title || !code) {
      continue;
    }

    items.push({
      rank: entry.order ?? items.length + 1,
      title,
      heat: entry.rate !== undefined ? formatHeat(entry.rate) : undefined,
      url: buildStockUrl(code),
    });
  }

  if (items.length === 0) {
    throw new Error('同花顺热股榜解析后无有效条目');
  }

  return items;
}

function toFriendlyTonghuashunMessage(error: unknown): string {
  if (!(error instanceof Error)) {
    return '同花顺热股榜加载失败，请稍后重试';
  }

  const detail = error.message;

  if (detail.includes('超时')) {
    return '同花顺热股榜请求超时，请稍后重试';
  }

  if (detail.includes('HTTP') || detail.includes('受限') || detail.includes('非 JSON')) {
    return '同花顺热股榜暂时不可用，请稍后重试';
  }

  if (detail.includes('为空') || detail.includes('缺少')) {
    return '同花顺热股榜数据异常，请稍后重试';
  }

  return '同花顺热股榜加载失败，请稍后重试';
}

async function requestTonghuashunHotStock(): Promise<ThsHotStockResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(THS_HOT_STOCK_URL, {
      signal: controller.signal,
      headers: {
        'User-Agent': MOBILE_USER_AGENT,
        Referer: THS_REFERER,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`同花顺热股榜接口 HTTP ${response.status}`);
    }

    const contentType = response.headers.get('content-type') ?? '';

    if (!contentType.includes('application/json')) {
      throw new Error(`同花顺热股榜接口返回非 JSON 内容（Content-Type: ${contentType || '未知'}）`);
    }

    return (await response.json()) as ThsHotStockResponse;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`同花顺热股榜请求超时（>${REQUEST_TIMEOUT_MS / 1000} 秒）`);
    }

    if (error instanceof Error) {
      throw new Error(`同花顺热股榜请求失败：${error.message}`);
    }

    throw new Error('同花顺热股榜请求失败：未知错误');
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchTonghuashunHot(): Promise<HotPlatform> {
  try {
    const payload = await requestTonghuashunHotStock();
    const items = parseTonghuashunHotItems(payload);

    return {
      source: 'ths',
      sourceName: '同花顺',
      listName: '热股榜',
      updatedAt: new Date().toISOString(),
      items,
    };
  } catch (error) {
    console.error('[ths]', error instanceof Error ? error.message : error);

    return {
      source: 'ths',
      sourceName: '同花顺',
      listName: '热股榜',
      updatedAt: new Date().toISOString(),
      items: [],
      error: true,
      message: toFriendlyTonghuashunMessage(error),
    };
  }
}
