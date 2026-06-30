import { createClsSign } from '../utils/clsSign.js';
import type { HotItem, HotPlatform } from '../types/hot.js';

/** 财联社热门文章 JSON 接口（非 HTML 页面） */
const CLS_HOT_ARTICLE_BASE = 'https://www.cls.cn/v2/article/hot/list';

const DESKTOP_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const CLS_REFERER = 'https://www.cls.cn/';

const REQUEST_TIMEOUT_MS = 10_000;

interface ClsHotArticleEntry {
  id?: number;
  title?: string;
  readNum?: number;
}

interface ClsHotArticleResponse {
  errno?: number | string;
  data?: ClsHotArticleEntry[];
}

function formatHeat(readNum: number): string {
  if (readNum >= 10_000) {
    return `${Math.round(readNum / 10_000)}万阅读`;
  }

  return `${readNum}阅读`;
}

function buildArticleUrl(id: number): string {
  return `https://www.cls.cn/detail/${id}`;
}

function buildHotArticleUrl(): string {
  const params = {
    app: 'CailianpressWeb',
    os: 'web',
    sv: '7.7.5',
  };

  const sign = createClsSign(params);
  const query = new URLSearchParams({
    ...params,
    sign,
  });

  return `${CLS_HOT_ARTICLE_BASE}?${query.toString()}`;
}

export function parseCailiansheHotItems(payload: ClsHotArticleResponse): HotItem[] {
  if (payload.errno !== 0 && payload.errno !== '0') {
    throw new Error('财联社热榜接口返回 errno !== 0，可能已变更或受限');
  }

  const articles = payload.data;

  if (!Array.isArray(articles) || articles.length === 0) {
    throw new Error('财联社热榜响应缺少 data 或列表为空');
  }

  const items: HotItem[] = [];

  for (const [index, entry] of articles.entries()) {
    const title = entry.title?.trim();
    const id = entry.id;

    if (!title || typeof id !== 'number') {
      continue;
    }

    items.push({
      rank: index + 1,
      title,
      heat: typeof entry.readNum === 'number' ? formatHeat(entry.readNum) : undefined,
      url: buildArticleUrl(id),
    });
  }

  if (items.length === 0) {
    throw new Error('财联社热榜解析后无有效条目');
  }

  return items;
}

function toFriendlyCailiansheMessage(error: unknown): string {
  if (!(error instanceof Error)) {
    return '财联社热榜加载失败，请稍后重试';
  }

  const detail = error.message;

  if (detail.includes('超时')) {
    return '财联社热榜请求超时，请稍后重试';
  }

  if (detail.includes('HTTP') || detail.includes('受限') || detail.includes('非 JSON')) {
    return '财联社热榜暂时不可用，请稍后重试';
  }

  if (detail.includes('为空') || detail.includes('缺少')) {
    return '财联社热榜数据异常，请稍后重试';
  }

  return '财联社热榜加载失败，请稍后重试';
}

async function requestCailiansheHotArticles(): Promise<ClsHotArticleResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(buildHotArticleUrl(), {
      signal: controller.signal,
      headers: {
        'User-Agent': DESKTOP_USER_AGENT,
        Referer: CLS_REFERER,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`财联社热榜接口 HTTP ${response.status}`);
    }

    const contentType = response.headers.get('content-type') ?? '';

    if (!contentType.includes('application/json')) {
      throw new Error(`财联社热榜接口返回非 JSON 内容（Content-Type: ${contentType || '未知'}）`);
    }

    return (await response.json()) as ClsHotArticleResponse;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`财联社热榜请求超时（>${REQUEST_TIMEOUT_MS / 1000} 秒）`);
    }

    if (error instanceof Error) {
      throw new Error(`财联社热榜请求失败：${error.message}`);
    }

    throw new Error('财联社热榜请求失败：未知错误');
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchCailiansheHot(): Promise<HotPlatform> {
  try {
    const payload = await requestCailiansheHotArticles();
    const items = parseCailiansheHotItems(payload);

    return {
      source: 'cls',
      sourceName: '财联社',
      listName: '热门文章',
      updatedAt: new Date().toISOString(),
      items,
    };
  } catch (error) {
    console.error('[cls]', error instanceof Error ? error.message : error);

    return {
      source: 'cls',
      sourceName: '财联社',
      listName: '热门文章',
      updatedAt: new Date().toISOString(),
      items: [],
      error: true,
      message: toFriendlyCailiansheMessage(error),
    };
  }
}
