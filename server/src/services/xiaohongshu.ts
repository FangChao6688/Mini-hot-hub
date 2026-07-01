import { Client, generateA1, registerId } from 'xhshow-js';
import type { HotItem, HotPlatform } from '../types/hot.js';

/** 小红书 Web 热搜 JSON 接口（需签名请求头，非 HTML 页面） */
const XHS_HOME_URL = 'https://www.xiaohongshu.com/';
const XHS_WEB_HOT_LIST_PATH = '/api/sns/web/v1/search/hotlist';
const XHS_WEB_HOT_LIST_URL = `https://edith.xiaohongshu.com${XHS_WEB_HOT_LIST_PATH}`;

/** 移动端热搜接口（无签名时常返回 406 + 空 data，作为备用） */
const XHS_MOBILE_HOT_LIST_URL =
  'https://edith.xiaohongshu.com/api/sns/v1/search/hot_list?source=ExploreFeed&search_type=hot_list&version=1';

const DESKTOP_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const MOBILE_USER_AGENT =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148';

const XHS_REFERER = 'https://www.xiaohongshu.com/';

const REQUEST_TIMEOUT_MS = 10_000;

const xhsSignClient = new Client();

interface XhsHotListItem {
  title?: string;
  score?: string | number;
  word_type?: string;
}

interface XhsTrendingItem {
  title?: string;
  score?: string | number;
}

interface XhsHotListResponse {
  code?: number;
  success?: boolean;
  msg?: string;
  data?: {
    items?: XhsHotListItem[];
    queries?: XhsTrendingItem[];
  };
}

type CookieDict = Record<string, string>;

function parseCookieHeader(raw: string): CookieDict {
  const cookies: CookieDict = {};

  for (const part of raw.split(';')) {
    const trimmed = part.trim();

    if (!trimmed) {
      continue;
    }

    const eq = trimmed.indexOf('=');

    if (eq === -1) {
      continue;
    }

    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();

    if (key) {
      cookies[key] = value;
    }
  }

  return cookies;
}

function extractAllCookies(setCookieHeaders: string[] | undefined): CookieDict {
  if (!setCookieHeaders?.length) {
    return {};
  }

  const cookies: CookieDict = {};

  for (const entry of setCookieHeaders) {
    const part = entry.split(';')[0] ?? '';
    const eq = part.indexOf('=');

    if (eq === -1) {
      continue;
    }

    const key = part.slice(0, eq).trim();
    const value = part.slice(eq + 1);

    if (key) {
      cookies[key] = value;
    }
  }

  return cookies;
}

function buildCookieHeader(cookies: CookieDict): string {
  return Object.entries(cookies)
    .map(([key, value]) => `${key}=${value}`)
    .join('; ');
}

function formatHeat(score: string | number): string {
  if (typeof score === 'number') {
    if (score >= 10_000) {
      return `${Math.round(score / 10_000)}万`;
    }

    return String(score);
  }

  const trimmed = score.trim();

  if (!trimmed) {
    return '';
  }

  return trimmed;
}

function buildSearchUrl(title: string): string {
  return `https://www.xiaohongshu.com/search_result?keyword=${encodeURIComponent(title)}`;
}

export function parseXiaohongshuHotItems(payload: XhsHotListResponse): HotItem[] {
  if (payload.code !== 0 || payload.success !== true) {
    throw new Error(`小红书热搜接口返回异常（code=${payload.code ?? '未知'}）`);
  }

  const rawItems = payload.data?.items ?? payload.data?.queries;

  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    throw new Error('小红书热搜响应缺少 data.items / data.queries 或列表为空');
  }

  const items: HotItem[] = [];

  for (const [index, entry] of rawItems.entries()) {
    const title = entry.title?.trim();

    if (!title) {
      continue;
    }

    const heat =
      entry.score !== undefined && entry.score !== null && entry.score !== ''
        ? formatHeat(entry.score)
        : undefined;

    items.push({
      rank: index + 1,
      title,
      heat: heat || undefined,
      url: buildSearchUrl(title),
    });
  }

  if (items.length === 0) {
    throw new Error('小红书热搜解析后无有效条目');
  }

  return items;
}

function toFriendlyXiaohongshuMessage(error: unknown): string {
  if (!(error instanceof Error)) {
    return '小红书热搜加载失败，请稍后重试';
  }

  const detail = error.message;

  if (detail.includes('超时')) {
    return '小红书热搜请求超时，请稍后重试';
  }

  if (detail.includes('登录') || detail.includes('-101')) {
    return '小红书热搜暂时不可用，请稍后重试';
  }

  if (detail.includes('HTTP') || detail.includes('受限') || detail.includes('非 JSON')) {
    return '小红书热搜暂时不可用，请稍后重试';
  }

  if (detail.includes('为空') || detail.includes('缺少')) {
    return '小红书热搜数据异常，请稍后重试';
  }

  return '小红书热搜加载失败，请稍后重试';
}

async function bootstrapXiaohongshuCookies(): Promise<CookieDict> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(XHS_HOME_URL, {
      signal: controller.signal,
      headers: {
        'User-Agent': DESKTOP_USER_AGENT,
        Accept: 'text/html,application/xhtml+xml',
      },
    });

    if (!response.ok) {
      throw new Error(`小红书 Cookie 预热 HTTP ${response.status}`);
    }

    const setCookieHeaders =
      typeof response.headers.getSetCookie === 'function'
        ? response.headers.getSetCookie()
        : undefined;

    return extractAllCookies(setCookieHeaders);
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`小红书 Cookie 预热超时（>${REQUEST_TIMEOUT_MS / 1000} 秒）`);
    }

    if (error instanceof Error) {
      throw new Error(`小红书 Cookie 预热失败：${error.message}`);
    }

    throw new Error('小红书 Cookie 预热失败：未知错误');
  } finally {
    clearTimeout(timeout);
  }
}

async function resolveXiaohongshuCookies(): Promise<CookieDict> {
  const envCookie = process.env.XHS_COOKIE?.trim();

  if (envCookie) {
    return parseCookieHeader(envCookie);
  }

  return bootstrapXiaohongshuCookies();
}

function ensureSignedCookieFields(cookies: CookieDict): CookieDict {
  const next = { ...cookies };

  if (!next.a1) {
    next.a1 = generateA1();
  }

  if (!next.webId) {
    next.webId = registerId();
  }

  return next;
}

async function readJsonResponse(response: Response): Promise<XhsHotListResponse> {
  const contentType = response.headers.get('content-type') ?? '';

  if (!contentType.includes('application/json')) {
    throw new Error(`小红书热搜接口返回非 JSON 内容（Content-Type: ${contentType || '未知'}）`);
  }

  return (await response.json()) as XhsHotListResponse;
}

async function requestSignedWebHotList(cookies: CookieDict): Promise<XhsHotListResponse> {
  const signedCookies = ensureSignedCookieFields(cookies);
  const xt = xhsSignClient.getXT();
  const xs = xhsSignClient.signXS(
    'GET',
    XHS_WEB_HOT_LIST_PATH,
    signedCookies.a1,
    'xhs-pc-web',
    {},
    xt,
  );
  const xsCommon = xhsSignClient.signXSCommon({ a1: signedCookies.a1, ...signedCookies });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(XHS_WEB_HOT_LIST_URL, {
      signal: controller.signal,
      headers: {
        'User-Agent': DESKTOP_USER_AGENT,
        Referer: XHS_REFERER,
        Origin: XHS_REFERER.replace(/\/$/, ''),
        Accept: 'application/json, text/plain, */*',
        Cookie: buildCookieHeader(signedCookies),
        'x-s': xs,
        'x-s-common': xsCommon,
        'x-t': String(xt),
        'x-b3-traceid': xhsSignClient.getB3TraceId(),
        'x-xray-traceid': xhsSignClient.getXrayTraceId(),
      },
    });

    const payload = await readJsonResponse(response);

    if (!response.ok && payload.code === undefined) {
      throw new Error(`小红书热搜接口 HTTP ${response.status}`);
    }

    if (payload.code === -101) {
      throw new Error('小红书热搜接口需要登录态（code=-101）');
    }

    return payload;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`小红书热搜请求超时（>${REQUEST_TIMEOUT_MS / 1000} 秒）`);
    }

    if (error instanceof Error) {
      throw error;
    }

    throw new Error('小红书热搜请求失败：未知错误');
  } finally {
    clearTimeout(timeout);
  }
}

async function requestMobileHotList(): Promise<XhsHotListResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(XHS_MOBILE_HOT_LIST_URL, {
      signal: controller.signal,
      headers: {
        'User-Agent': MOBILE_USER_AGENT,
        Referer: XHS_REFERER,
        Accept: 'application/json',
      },
    });

    const payload = await readJsonResponse(response);

    if (payload.code !== 0 || payload.success !== true) {
      throw new Error(`小红书移动端热搜接口返回异常（HTTP ${response.status}）`);
    }

    return payload;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`小红书热搜请求超时（>${REQUEST_TIMEOUT_MS / 1000} 秒）`);
    }

    if (error instanceof Error) {
      throw new Error(`小红书移动端热搜请求失败：${error.message}`);
    }

    throw new Error('小红书移动端热搜请求失败：未知错误');
  } finally {
    clearTimeout(timeout);
  }
}

async function requestXiaohongshuHotList(): Promise<XhsHotListResponse> {
  const cookies = await resolveXiaohongshuCookies();

  try {
    const webPayload = await requestSignedWebHotList(cookies);

    if (Array.isArray(webPayload.data?.items) && webPayload.data.items.length > 0) {
      return webPayload;
    }
  } catch (error) {
    if (process.env.XHS_COOKIE?.trim()) {
      throw error;
    }
  }

  return requestMobileHotList();
}

export async function fetchXiaohongshuHot(): Promise<HotPlatform> {
  try {
    const payload = await requestXiaohongshuHotList();
    const items = parseXiaohongshuHotItems(payload);

    return {
      source: 'xhs',
      sourceName: '小红书',
      listName: '热搜榜',
      updatedAt: new Date().toISOString(),
      items,
    };
  } catch (error) {
    console.error('[xhs]', error instanceof Error ? error.message : error);

    return {
      source: 'xhs',
      sourceName: '小红书',
      listName: '热搜榜',
      updatedAt: new Date().toISOString(),
      items: [],
      error: true,
      message: toFriendlyXiaohongshuMessage(error),
    };
  }
}
