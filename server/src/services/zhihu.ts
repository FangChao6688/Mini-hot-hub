import type { HotItem, HotPlatform } from '../types/hot.js';

/** 知乎热榜 JSON 接口（非 HTML 页面） */
const ZHIHU_HOT_LIST_URL = 'https://api.zhihu.com/topstory/hot-list?limit=50';

const MOBILE_USER_AGENT =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1';

const ZHIHU_REFERER = 'https://www.zhihu.com/hot';

const REQUEST_TIMEOUT_MS = 10_000;

/** 上游 data[] 单项（仅声明用到的字段） */
interface ZhihuHotFeed {
  /** 榜单序号前缀（0 起），映射为 HotItem.rank（+1） */
  id?: string;
  /** 卡片 ID，格式 Q_{questionId}，用于拼接 HotItem.url */
  card_id?: string;
  /** 热度文案，映射为 HotItem.heat（如「783 万热度」） */
  detail_text?: string;
  target?: {
    /** 问题标题，映射为 HotItem.title */
    title?: string;
    /** API 问题链接，解析 questionId 后生成 www.zhihu.com 链接 */
    url?: string;
  };
}

interface ZhihuHotListResponse {
  /** 热榜条目数组，映射为 HotItem[] */
  data?: ZhihuHotFeed[];
}

function parseRankFromFeedId(feedId: string | undefined, fallback: number): number {
  if (!feedId) {
    return fallback;
  }

  const rankPrefix = feedId.split('_')[0];
  const parsed = Number(rankPrefix);

  if (Number.isFinite(parsed) && parsed >= 0) {
    return parsed + 1;
  }

  return fallback;
}

function buildQuestionUrl(feed: ZhihuHotFeed): string | undefined {
  const apiUrl = feed.target?.url;

  if (apiUrl) {
    const matched = apiUrl.match(/questions\/(\d+)/);
    if (matched) {
      return `https://www.zhihu.com/question/${matched[1]}`;
    }
  }

  if (feed.card_id?.startsWith('Q_')) {
    return `https://www.zhihu.com/question/${feed.card_id.slice(2)}`;
  }

  return undefined;
}

/**
 * 解析 api.zhihu.com/topstory/hot-list 响应体。
 * 字段映射：id 前缀 → rank，target.title → title，detail_text → heat，question 链接 → url
 */
export function parseZhihuHotItems(payload: ZhihuHotListResponse): HotItem[] {
  const feeds = payload.data;

  if (!Array.isArray(feeds) || feeds.length === 0) {
    throw new Error('知乎热榜响应缺少 data 或列表为空');
  }

  const items: HotItem[] = [];

  for (const [index, feed] of feeds.entries()) {
    const title = feed.target?.title?.trim();
    const url = buildQuestionUrl(feed);

    if (!title || !url) {
      continue;
    }

    const rank = parseRankFromFeedId(feed.id, index + 1);
    const heat = feed.detail_text?.trim() || undefined;

    items.push({
      rank,
      title,
      heat,
      url,
    });
  }

  if (items.length === 0) {
    throw new Error('知乎热榜解析后无有效条目（title / url 均为空）');
  }

  return items;
}

function toFriendlyZhihuMessage(error: unknown): string {
  if (!(error instanceof Error)) {
    return '知乎热榜加载失败，请稍后重试';
  }

  const detail = error.message;

  if (detail.includes('超时')) {
    return '知乎热榜请求超时，请稍后重试';
  }

  if (detail.includes('HTTP') || detail.includes('AuthenticationError') || detail.includes('非 JSON')) {
    return '知乎热榜暂时不可用，请稍后重试';
  }

  if (detail.includes('为空') || detail.includes('缺少')) {
    return '知乎热榜数据异常，请稍后重试';
  }

  return '知乎热榜加载失败，请稍后重试';
}

async function requestZhihuHotList(): Promise<ZhihuHotListResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(ZHIHU_HOT_LIST_URL, {
      signal: controller.signal,
      headers: {
        'User-Agent': MOBILE_USER_AGENT,
        Referer: ZHIHU_REFERER,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`知乎热榜接口 HTTP ${response.status}`);
    }

    const contentType = response.headers.get('content-type') ?? '';

    if (!contentType.includes('application/json')) {
      throw new Error(`知乎热榜接口返回非 JSON 内容（Content-Type: ${contentType || '未知'}）`);
    }

    const payload = (await response.json()) as ZhihuHotListResponse & {
      error?: { message?: string; name?: string };
    };

    if (payload.error) {
      throw new Error(
        `知乎热榜接口错误：${payload.error.name ?? 'Unknown'} ${payload.error.message ?? ''}`.trim(),
      );
    }

    return payload;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`知乎热榜请求超时（>${REQUEST_TIMEOUT_MS / 1000} 秒）`);
    }

    if (error instanceof Error) {
      throw new Error(`知乎热榜请求失败：${error.message}`);
    }

    throw new Error('知乎热榜请求失败：未知错误');
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchZhihuHot(): Promise<HotPlatform> {
  try {
    const payload = await requestZhihuHotList();
    const items = parseZhihuHotItems(payload);

    return {
      source: 'zhihu',
      sourceName: '知乎',
      listName: '热榜',
      updatedAt: new Date().toISOString(),
      items,
    };
  } catch (error) {
    console.error('[zhihu]', error instanceof Error ? error.message : error);

    return {
      source: 'zhihu',
      sourceName: '知乎',
      listName: '热榜',
      updatedAt: new Date().toISOString(),
      items: [],
      error: true,
      message: toFriendlyZhihuMessage(error),
    };
  }
}
