import type { HotItem, HotPlatform } from '../types/hot.js';

/** 微博热搜 JSON 接口（非 HTML 页面） */
const WEIBO_HOT_BAND_URL = 'https://weibo.com/ajax/statuses/hot_band';

const MOBILE_USER_AGENT =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148';

const WEIBO_REFERER = 'https://s.weibo.com/top/summary';

const REQUEST_TIMEOUT_MS = 10_000;

/** 上游 band_list 单项（仅声明用到的字段） */
interface WeiboBandItem {
  /** 真实排名，映射为 HotItem.rank */
  realpos?: number;
  /** 热搜词，映射为 HotItem.title */
  word?: string;
  /** 热度数值，映射为 HotItem.heat（格式化为「N万」） */
  num?: number;
}

interface WeiboHotBandResponse {
  /** 1 表示成功 */
  ok?: number;
  data?: {
    /** 热搜列表数组，映射为 HotItem[] */
    band_list?: WeiboBandItem[];
  };
}

function formatHeat(num: number): string {
  if (num >= 10_000) {
    return `${Math.round(num / 10_000)}万`;
  }
  return String(num);
}

function buildSearchUrl(word: string): string {
  return `https://s.weibo.com/weibo?q=${encodeURIComponent(word)}`;
}

/**
 * 解析 weibo.com/ajax/statuses/hot_band 响应体。
 * 字段映射：realpos → rank，word → title，num → heat，word 拼接搜索链接 → url
 */
export function parseWeiboHotItems(payload: WeiboHotBandResponse): HotItem[] {
  if (payload.ok !== 1) {
    throw new Error('微博热搜接口返回 ok !== 1，可能已变更或受限');
  }

  const bandList = payload.data?.band_list;

  if (!Array.isArray(bandList) || bandList.length === 0) {
    throw new Error('微博热搜响应缺少 data.band_list 或列表为空');
  }

  const items: HotItem[] = [];

  for (const entry of bandList) {
    const title = entry.word?.trim();

    if (!title) {
      continue;
    }

    const rank = entry.realpos ?? items.length + 1;
    const heat = typeof entry.num === 'number' ? formatHeat(entry.num) : undefined;

    items.push({
      rank,
      title,
      heat,
      url: buildSearchUrl(title),
    });
  }

  if (items.length === 0) {
    throw new Error('微博热搜解析后无有效条目（word 字段均为空）');
  }

  return items;
}

/** 将内部错误转为面向用户的友好提示（不暴露技术细节） */
function toFriendlyWeiboMessage(error: unknown): string {
  if (!(error instanceof Error)) {
    return '微博热搜加载失败，请稍后重试';
  }

  const detail = error.message;

  if (detail.includes('超时')) {
    return '微博热搜请求超时，请稍后重试';
  }

  if (detail.includes('HTTP') || detail.includes('受限') || detail.includes('非 JSON')) {
    return '微博热搜暂时不可用，请稍后重试';
  }

  if (detail.includes('为空') || detail.includes('缺少')) {
    return '微博热搜数据异常，请稍后重试';
  }

  return '微博热搜加载失败，请稍后重试';
}

async function requestWeiboHotBand(): Promise<WeiboHotBandResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(WEIBO_HOT_BAND_URL, {
      signal: controller.signal,
      headers: {
        'User-Agent': MOBILE_USER_AGENT,
        Referer: WEIBO_REFERER,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`微博热搜接口 HTTP ${response.status}`);
    }

    const contentType = response.headers.get('content-type') ?? '';

    if (!contentType.includes('application/json')) {
      throw new Error(`微博热搜接口返回非 JSON 内容（Content-Type: ${contentType || '未知'}）`);
    }

    return (await response.json()) as WeiboHotBandResponse;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`微博热搜请求超时（>${REQUEST_TIMEOUT_MS / 1000} 秒）`);
    }

    if (error instanceof Error) {
      throw new Error(`微博热搜请求失败：${error.message}`);
    }

    throw new Error('微博热搜请求失败：未知错误');
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchWeiboHot(): Promise<HotPlatform> {
  try {
    const payload = await requestWeiboHotBand();
    const items = parseWeiboHotItems(payload);

    return {
      source: 'weibo',
      sourceName: '微博',
      listName: '热搜榜',
      updatedAt: new Date().toISOString(),
      items,
    };
  } catch (error) {
    console.error('[weibo]', error instanceof Error ? error.message : error);

    return {
      source: 'weibo',
      sourceName: '微博',
      listName: '热搜榜',
      updatedAt: new Date().toISOString(),
      items: [],
      error: true,
      message: toFriendlyWeiboMessage(error),
    };
  }
}
