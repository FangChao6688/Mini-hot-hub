import { getCache, setCache } from '../utils/cache.js';
import { fetchBilibiliHot } from './bilibili.js';
import { fetchCaixinHot } from './caixin.js';
import { fetchCailiansheHot } from './cailianshe.js';
import { fetchTonghuashunHot } from './tonghuashun.js';
import { fetchWeiboHot } from './weibo.js';
import { fetchXiaohongshuHot } from './xiaohongshu.js';
import { fetchXueqiuHot } from './xueqiu.js';
import { fetchZhihuHot } from './zhihu.js';
import type {
  HotAggregateResponse,
  HotCategory,
  HotPlatform,
  HotSource,
} from '../types/hot.js';
import { getSourcesByCategory } from '../types/hot.js';

type PlatformFetcher = () => HotPlatform | Promise<HotPlatform>;

export interface FetchHotOptions {
  skipCache?: boolean;
}

export interface FetchHotResult {
  platform: HotPlatform;
  cacheHit: boolean;
}

const PLATFORM_META: Record<HotSource, { sourceName: string; listName: string }> = {
  weibo: { sourceName: '微博', listName: '热搜榜' },
  zhihu: { sourceName: '知乎', listName: '热榜' },
  xhs: { sourceName: '小红书', listName: '热搜榜' },
  bilibili: { sourceName: '哔哩哔哩', listName: '全站热搜' },
  ths: { sourceName: '同花顺', listName: '热股榜' },
  xueqiu: { sourceName: '雪球', listName: '热股榜' },
  cls: { sourceName: '财联社', listName: '热门文章' },
  caixin: { sourceName: '财新', listName: '热门文章' },
};

const FALLBACK_ERROR_MESSAGE: Record<HotSource, string> = {
  weibo: '微博热搜加载失败，请稍后重试',
  zhihu: '知乎热榜加载失败，请稍后重试',
  xhs: '小红书热搜加载失败，请稍后重试',
  bilibili: 'B 站热搜加载失败，请稍后重试',
  ths: '同花顺热股榜加载失败，请稍后重试',
  xueqiu: '雪球热股榜加载失败，请稍后重试',
  cls: '财联社热榜加载失败，请稍后重试',
  caixin: '财新热门文章加载失败，请稍后重试',
};

/** 开发环境模拟单平台失败，生产环境始终忽略 */
const MOCK_FAIL_ENV: Record<HotSource, string> = {
  weibo: 'MOCK_FAIL_WEIBO',
  zhihu: 'MOCK_FAIL_ZHIHU',
  xhs: 'MOCK_FAIL_XHS',
  bilibili: 'MOCK_FAIL_BILIBILI',
  ths: 'MOCK_FAIL_THS',
  xueqiu: 'MOCK_FAIL_XUEQIU',
  cls: 'MOCK_FAIL_CLS',
  caixin: 'MOCK_FAIL_CAIXIN',
};

function isMockFailEnabled(source: HotSource): boolean {
  if (process.env.NODE_ENV === 'production') {
    return false;
  }

  return process.env[MOCK_FAIL_ENV[source]] === '1';
}

function createMockFailPlatform(source: HotSource): HotPlatform {
  console.warn(`[mock fail] ${source} — 已启用 ${MOCK_FAIL_ENV[source]}=1`);
  return createErrorPlatform(source, `${FALLBACK_ERROR_MESSAGE[source]}（开发模拟失败）`);
}

export const platformFetchers: Record<HotSource, PlatformFetcher> = {
  weibo: fetchWeiboHot,
  zhihu: fetchZhihuHot,
  xhs: fetchXiaohongshuHot,
  bilibili: fetchBilibiliHot,
  ths: fetchTonghuashunHot,
  xueqiu: fetchXueqiuHot,
  cls: fetchCailiansheHot,
  caixin: fetchCaixinHot,
};

function cacheKey(source: HotSource): string {
  return `hot:${source}`;
}

function createErrorPlatform(source: HotSource, message: string): HotPlatform {
  const meta = PLATFORM_META[source];

  return {
    source,
    sourceName: meta.sourceName,
    listName: meta.listName,
    updatedAt: new Date().toISOString(),
    items: [],
    error: true,
    message,
  };
}

async function loadPlatform(source: HotSource): Promise<HotPlatform> {
  try {
    return await platformFetchers[source]();
  } catch (error) {
    console.error(`[${source}]`, error instanceof Error ? error.message : error);
    return createErrorPlatform(source, FALLBACK_ERROR_MESSAGE[source]);
  }
}

export async function fetchHotBySource(
  source: HotSource,
  options?: FetchHotOptions,
): Promise<FetchHotResult> {
  if (isMockFailEnabled(source)) {
    return { platform: createMockFailPlatform(source), cacheHit: false };
  }

  const key = cacheKey(source);

  if (!options?.skipCache) {
    const cached = getCache<HotPlatform>(key);
    if (cached) {
      return { platform: cached, cacheHit: true };
    }
  }

  const platform = await loadPlatform(source);

  if (!platform.error) {
    setCache(key, platform);
  }

  return { platform, cacheHit: false };
}

/** 并行拉取指定分类下的各平台，单路失败不影响其余平台（失败项带 error: true） */
export async function fetchHotByCategory(
  category: HotCategory,
  options?: FetchHotOptions,
): Promise<HotAggregateResponse> {
  const sources = getSourcesByCategory(category);
  const results = await Promise.all(sources.map((source) => fetchHotBySource(source, options)));

  return {
    category,
    platforms: results.map((result) => result.platform),
  };
}

/** @deprecated 使用 fetchHotByCategory('news') */
export async function fetchAllHot(options?: FetchHotOptions): Promise<HotAggregateResponse> {
  return fetchHotByCategory('news', options);
}
