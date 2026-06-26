import type { HotItem } from '../types/hot';
import styles from './HotList.module.css';

interface HotListProps {
  items: HotItem[];
  /** 标题最多展示行数，知乎等长标题平台建议为 1 */
  titleLines?: 1 | 2;
}

function getRankClass(rank: number): string {
  if (rank === 1) return styles.rank1;
  if (rank === 2) return styles.rank2;
  if (rank === 3) return styles.rank3;
  return '';
}

function getLinkClass(titleLines: 1 | 2): string {
  return titleLines === 1 ? `${styles.link} ${styles.linkOneLine}` : styles.link;
}

export function HotList({ items, titleLines = 2 }: HotListProps) {
  const linkClass = getLinkClass(titleLines);

  return (
    <ol className={styles.list}>
      {items.map((item) => (
        <li
          key={`${item.rank}-${item.title}`}
          className={`${styles.item} ${getRankClass(item.rank)}`}
        >
          <span className={styles.rank}>{item.rank}</span>
          <a
            className={linkClass}
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            title={item.title}
          >
            {item.title}
          </a>
          {item.heat && <span className={styles.heat}>{item.heat}</span>}
        </li>
      ))}
    </ol>
  );
}
