import type { HotPlatform, HotSource } from '../types/hot';
import { HotList } from './HotList';
import { UpdatedAt } from './UpdatedAt';
import styles from './HotCard.module.css';

export interface HotCardProps {
  loading?: boolean;
  error?: string | null;
  data?: HotPlatform;
  onRetry?: () => void;
}

function getCardClass(source?: HotSource): string {
  if (!source) {
    return styles.card;
  }

  return `${styles.card} ${styles[`card_${source}`]}`;
}

function LoadingCard({ data }: { data?: HotPlatform }) {
  return (
    <article className={getCardClass(data?.source)} aria-busy="true">
      <header className={styles.header}>
        {data ? (
          <>
            <h2 className={styles.title}>{data.sourceName}</h2>
            <p className={styles.listName}>{data.listName}</p>
          </>
        ) : (
          <>
            <div className={styles.skeletonTitle} />
            <div className={styles.skeletonSubtitle} />
          </>
        )}
      </header>
      <div className={styles.body}>
        <ul className={styles.skeletonList} aria-hidden="true">
          {Array.from({ length: 5 }, (_, index) => (
            <li key={index} className={styles.skeletonRow} />
          ))}
        </ul>
        <p className={styles.loadingText} role="status">
          加载中...
        </p>
      </div>
      <footer className={styles.footer}>
        <span className={styles.updatedAt}>更新于 --</span>
      </footer>
    </article>
  );
}

export function HotCard({ loading = false, error = null, data, onRetry }: HotCardProps) {
  if (loading) {
    return <LoadingCard data={data} />;
  }

  if (error) {
    return (
      <article className={getCardClass(data?.source)}>
        <header className={styles.header}>
          <h2 className={styles.title}>{data?.sourceName ?? '热榜'}</h2>
          {data?.listName && <p className={styles.listName}>{data.listName}</p>}
        </header>

        <div className={styles.body}>
          <div className={styles.errorBox}>
            <p className={styles.errorMessage}>{error}</p>
            {onRetry && (
              <button type="button" className={styles.retryButton} onClick={onRetry}>
                点击重试
              </button>
            )}
          </div>
        </div>

        <footer className={styles.footer}>
          <span className={styles.updatedAt}>更新于 --</span>
        </footer>
      </article>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <article className={getCardClass(data.source)}>
      <header className={styles.header}>
        <h2 className={styles.title}>{data.sourceName}</h2>
        <p className={styles.listName}>{data.listName}</p>
      </header>

      <div className={styles.body}>
        {data.items.length === 0 && !data.error ? (
          <p className={styles.emptyText}>暂无数据</p>
        ) : (
          <HotList items={data.items} titleLines={data.source === 'zhihu' ? 1 : 2} />
        )}
      </div>

      <footer className={styles.footer}>
        <UpdatedAt iso={data.updatedAt} />
      </footer>
    </article>
  );
}
