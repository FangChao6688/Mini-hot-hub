import type { HotAggregateResponse, HotCategory, HotPlatform, HotSource } from '../types/hot';

const API_BASE = import.meta.env.VITE_API_BASE ?? '';

async function request<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`);

  if (!response.ok) {
    throw new Error(`请求失败：${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function fetchHotPlatform(
  source: HotSource,
  options?: { refresh?: boolean },
): Promise<HotPlatform> {
  const query = options?.refresh ? '?refresh=1' : '';
  return request<HotPlatform>(`/api/hot/${source}${query}`);
}

export async function fetchHotByCategory(
  category: HotCategory,
  options?: { refresh?: boolean },
): Promise<HotAggregateResponse> {
  const params = new URLSearchParams({ category });

  if (options?.refresh) {
    params.set('refresh', '1');
  }

  return request<HotAggregateResponse>(`/api/hot?${params.toString()}`);
}
