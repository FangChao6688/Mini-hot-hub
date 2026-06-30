import { HotCard } from '../components/HotCard';
import { SiteFooter } from '../components/SiteFooter';
import { CATEGORY_META, getPlatformOrder, PLATFORM_META } from '../constants/platforms';
import { useHotList } from '../hooks/useHotList';
import type { HotCategory, HotPlatform, HotSource } from '../types/hot';
import styles from './Home.module.css';

interface HomeProps {
  category: HotCategory;
}

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

export function Home({ category }: HomeProps) {
  const { platforms, loading, refreshingAll, error, loadingSources, reload, retryPlatform } =
    useHotList(category);

  const meta = CATEGORY_META[category];
  const placeholderPlatforms = getPlatformOrder(category).map(createPlaceholder);
  const showRefreshButton = !loading;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.headerText}>
            <h1 className={styles.title}>{meta.title}</h1>
            <p className={styles.intro}>{meta.intro}</p>
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
            {placeholderPlatforms.map((platform) => (
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
