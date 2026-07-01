import type { HotItem, HotPlatform } from '../types/hot.js';

/** 财新滚动文章 JSON 接口（非 HTML 页面） */
const CAIXIN_SCROLL_URL = 'https://gateway.caixin.com/api/dataplatform/scroll/index?page=1&pageSize=50';

const DESKTOP_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const CAIXIN_REFERER = 'https://www.caixin.com/';

const REQUEST_TIMEOUT_MS = 10_000;

interface CaixinArticleEntry {
  title?: string;
  url?: string;
  time?: number;
  updateTime?: number;
}

interface CaixinScrollResponse {
  code?: number;
  msg?: string;
  data?: {
    articleList?: CaixinArticleEntry[];
  };
}

function buildArticleUrl(url: string): string {
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }

  return `https://www.caixin.com${url.startsWith('/') ? url : `/${url}`}`;
}

export function parseCaixinHotItems(payload: CaixinScrollResponse): HotItem[] {
  if (payload.code !== 0) {
    throw new Error('财新热门文章接口返回 code !== 0，可能已变更或受限');
  }

  const articles = payload.data?.articleList;

  if (!Array.isArray(articles) || articles.length === 0) {
    throw new Error('财新热门文章响应缺少 data.articleList 或列表为空');
  }

  const items: HotItem[] = [];

  for (const [index, entry] of articles.entries()) {
    const title = entry.title?.trim();
    const url = entry.url?.trim();

    if (!title || !url) {
      continue;
    }

    if (
      url.startsWith('https://fm.caixin.com/') ||
      url.startsWith('https://video.caixin.com/') ||
      url.startsWith('https://datanews.caixin.com/')
    ) {
      continue;
    }

    items.push({
      rank: index + 1,
      title,
      url: buildArticleUrl(url),
    });
  }

  if (items.length === 0) {
    throw new Error('财新热门文章解析后无有效条目');
  }

  return items;
}

function toFriendlyCaixinMessage(error: unknown): string {
  if (!(error instanceof Error)) {
    return '财新热门文章加载失败，请稍后重试';
  }

  const detail = error.message;

  if (detail.includes('超时')) {
    return '财新热门文章请求超时，请稍后重试';
  }

  if (detail.includes('HTTP') || detail.includes('受限') || detail.includes('非 JSON')) {
    return '财新热门文章暂时不可用，请稍后重试';
  }

  if (detail.includes('为空') || detail.includes('缺少')) {
    return '财新热门文章数据异常，请稍后重试';
  }

  return '财新热门文章加载失败，请稍后重试';
}

async function requestCaixinScrollArticles(): Promise<CaixinScrollResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(CAIXIN_SCROLL_URL, {
      signal: controller.signal,
      headers: {
        'User-Agent': DESKTOP_USER_AGENT,
        Referer: CAIXIN_REFERER,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`财新热门文章接口 HTTP ${response.status}`);
    }

    const contentType = response.headers.get('content-type') ?? '';

    if (!contentType.includes('application/json')) {
      throw new Error(`财新热门文章接口返回非 JSON 内容（Content-Type: ${contentType || '未知'}）`);
    }

    return (await response.json()) as CaixinScrollResponse;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`财新热门文章请求超时（>${REQUEST_TIMEOUT_MS / 1000} 秒）`);
    }

    if (error instanceof Error) {
      throw new Error(`财新热门文章请求失败：${error.message}`);
    }

    throw new Error('财新热门文章请求失败：未知错误');
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchCaixinHot(): Promise<HotPlatform> {
  try {
    const payload = await requestCaixinScrollArticles();
    const items = parseCaixinHotItems(payload);

    return {
      source: 'caixin',
      sourceName: '财新',
      listName: '热门文章',
      updatedAt: new Date().toISOString(),
      items,
    };
  } catch (error) {
    console.error('[caixin]', error instanceof Error ? error.message : error);

    return {
      source: 'caixin',
      sourceName: '财新',
      listName: '热门文章',
      updatedAt: new Date().toISOString(),
      items: [],
      error: true,
      message: toFriendlyCaixinMessage(error),
    };
  }
}
