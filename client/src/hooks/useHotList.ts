import { useCallback, useEffect, useState } from 'react';
import { fetchHotByCategory, fetchHotPlatform } from '../api/hot';
import { getPlatformOrder, PLATFORM_META } from '../constants/platforms';
import type { HotCategory, HotPlatform, HotSource } from '../types/hot';

function sortPlatforms(platforms: HotPlatform[], category: HotCategory): HotPlatform[] {
  const order = getPlatformOrder(category);

  return order
    .map((source) => platforms.find((item) => item.source === source))
    .filter((item): item is HotPlatform => item !== undefined);
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

const RETRY_ERROR_MESSAGE: Record<HotSource, string> = {
  weibo: '微博热搜加载失败，请稍后重试',
  zhihu: '知乎热榜加载失败，请稍后重试',
  xhs: '小红书热搜加载失败，请稍后重试',
  bilibili: 'B 站热搜加载失败，请稍后重试',
  ths: '同花顺热股榜加载失败，请稍后重试',
  xueqiu: '雪球热股榜加载失败，请稍后重试',
  cls: '财联社热榜加载失败，请稍后重试',
  caixin: '财新热门文章加载失败，请稍后重试',
};

interface UseHotListResult {
  platforms: HotPlatform[];
  loading: boolean;
  refreshingAll: boolean;
  error: string | null;
  loadingSources: Partial<Record<HotSource, boolean>>;
  reload: () => void;
  retryPlatform: (source: HotSource) => void;
}

export function useHotList(category: HotCategory): UseHotListResult {
  const [platforms, setPlatforms] = useState<HotPlatform[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshingAll, setRefreshingAll] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingSources, setLoadingSources] = useState<Partial<Record<HotSource, boolean>>>({});

  const loadInitial = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { platforms: nextPlatforms } = await fetchHotByCategory(category);
      setPlatforms(sortPlatforms(nextPlatforms, category));
    } catch {
      setError('加载失败，请稍后重试');
      setPlatforms([]);
    } finally {
      setLoading(false);
    }
  }, [category]);

  const reload = useCallback(async () => {
    setRefreshingAll(true);
    setError(null);

    try {
      const { platforms: nextPlatforms } = await fetchHotByCategory(category, { refresh: true });
      setPlatforms(sortPlatforms(nextPlatforms, category));
    } catch {
      setError('加载失败，请稍后重试');
    } finally {
      setRefreshingAll(false);
    }
  }, [category]);

  const retryPlatform = useCallback(
    async (source: HotSource) => {
      setLoadingSources((prev) => ({ ...prev, [source]: true }));

      try {
        const platform = await fetchHotPlatform(source, { refresh: true });
        setPlatforms((prev) =>
          sortPlatforms(
            prev.map((item) => (item.source === source ? platform : item)),
            category,
          ),
        );
      } catch {
        setPlatforms((prev) =>
          sortPlatforms(
            prev.map((item) =>
              item.source === source
                ? createErrorPlatform(source, RETRY_ERROR_MESSAGE[source])
                : item,
            ),
            category,
          ),
        );
      } finally {
        setLoadingSources((prev) => ({ ...prev, [source]: false }));
      }
    },
    [category],
  );

  useEffect(() => {
    void loadInitial();
  }, [loadInitial]);

  return {
    platforms,
    loading,
    refreshingAll,
    error,
    loadingSources,
    reload: () => void reload(),
    retryPlatform: (source) => void retryPlatform(source),
  };
}
