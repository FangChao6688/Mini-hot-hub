import { HotCard } from '../components/HotCard';
import { SiteFooter } from '../components/SiteFooter';
import { PLATFORM_META, PLATFORM_ORDER } from '../constants/platforms';
import { useHotList } from '../hooks/useHotList';
import type { HotPlatform, HotSource } from '../types/hot';
import styles from './Home.module.css';

function createPlaceholder(source: HotSource): HotPlatform {
  const meta = PLATFORM_META[source];
  return {
    source,
    sourceName: meta.sourceName,
    listName: meta.listName,
    updatedAt: '',
    items: [],
  };
}

const PLACEHOLDER_PLATFORMS = PLATFORM_ORDER.map(createPlaceholder);

export function Home() {
  const { platforms, loading, refreshingAll, error, loadingSources, reload, retryPlatform } =
    useHotList();

  const showRefreshButton = !loading;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.headerText}>
            <h1 className={styles.title}>迷你今日热榜</h1>
            <p className={styles.intro}>聚合微博、知乎、B 站热榜，一览今日热点</p>
          </div>
          {showRefreshButton && (
            <button
              type="button"
              className={styles.refreshAllButton}
              onClick={reload}
              disabled={refreshingAll}
              aria-busy={refreshingAll}
            >
              <span className={styles.refreshIcon} aria-hidden="true">
                ↻
              </span>
              {refreshingAll ? '刷新中…' : '刷新全部'}
            </button>
          )}
        </div>
      </header>

      <main className={styles.main}>
        {loading ? (
          <div className={styles.grid}>
            {PLACEHOLDER_PLATFORMS.map((platform) => (
              <HotCard key={platform.source} loading data={platform} />
            ))}
          </div>
        ) : error && platforms.length === 0 ? (
          <div className={styles.errorPanel}>
            <p className={styles.errorMessage}>{error}</p>
            <button
              type="button"
              className={styles.retryButton}
              onClick={reload}
              disabled={refreshingAll}
            >
              {refreshingAll ? '刷新中…' : '点击重试'}
            </button>
          </div>
        ) : (
          <div className={styles.grid}>
            {platforms.map((platform) => (
              <HotCard
                key={platform.source}
                loading={Boolean(loadingSources[platform.source])}
                error={platform.error ? (platform.message ?? '加载失败') : null}
                data={platform}
                onRetry={
                  platform.error && !loadingSources[platform.source]
                    ? () => retryPlatform(platform.source)
                    : undefined
                }
              />
            ))}
          </div>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
