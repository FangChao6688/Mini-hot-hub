import { useCallback, useEffect, useState } from 'react';
import { fetchAllHot, fetchHotPlatform } from '../api/hot';
import { PLATFORM_META, PLATFORM_ORDER } from '../constants/platforms';
import type { HotPlatform, HotSource } from '../types/hot';

function sortPlatforms(platforms: HotPlatform[]): HotPlatform[] {
  return PLATFORM_ORDER.map((source) => platforms.find((item) => item.source === source)).filter(
    (item): item is HotPlatform => item !== undefined,
  );
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
  bilibili: 'B 站热搜加载失败，请稍后重试',
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

export function useHotList(): UseHotListResult {
  const [platforms, setPlatforms] = useState<HotPlatform[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshingAll, setRefreshingAll] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingSources, setLoadingSources] = useState<Partial<Record<HotSource, boolean>>>({});

  const loadInitial = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { platforms: nextPlatforms } = await fetchAllHot();
      setPlatforms(sortPlatforms(nextPlatforms));
    } catch {
      setError('加载失败，请稍后重试');
      setPlatforms([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const reload = useCallback(async () => {
    setRefreshingAll(true);
    setError(null);

    try {
      const { platforms: nextPlatforms } = await fetchAllHot({ refresh: true });
      setPlatforms(sortPlatforms(nextPlatforms));
    } catch {
      setError('加载失败，请稍后重试');
    } finally {
      setRefreshingAll(false);
    }
  }, []);

  const retryPlatform = useCallback(async (source: HotSource) => {
    setLoadingSources((prev) => ({ ...prev, [source]: true }));

    try {
      const platform = await fetchHotPlatform(source, { refresh: true });
      setPlatforms((prev) =>
        sortPlatforms(prev.map((item) => (item.source === source ? platform : item))),
      );
    } catch {
      setPlatforms((prev) =>
        sortPlatforms(
          prev.map((item) =>
            item.source === source
              ? createErrorPlatform(source, RETRY_ERROR_MESSAGE[source])
              : item,
          ),
        ),
      );
    } finally {
      setLoadingSources((prev) => ({ ...prev, [source]: false }));
    }
  }, []);

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
