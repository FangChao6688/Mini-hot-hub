import { useEffect, useState } from 'react';
import { formatRelativeTime } from '../utils/formatRelativeTime';
import styles from './HotCard.module.css';

interface UpdatedAtProps {
  iso: string;
}

function formatAbsoluteTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }

  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function UpdatedAt({ iso }: UpdatedAtProps) {
  const [, setTick] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setTick((value) => value + 1);
    }, 60_000);

    return () => window.clearInterval(timer);
  }, [iso]);

  return (
    <time className={styles.updatedAt} dateTime={iso} title={formatAbsoluteTime(iso)}>
      更新于 {formatRelativeTime(iso)}
    </time>
  );
}
