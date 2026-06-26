export function formatRelativeUpdatedAt(iso: string, now = Date.now()): string {
  const date = new Date(iso);
  const timestamp = date.getTime();

  if (Number.isNaN(timestamp)) {
    return iso;
  }

  const diffMs = now - timestamp;

  if (diffMs < 0) {
    return '刚刚';
  }

  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 60) {
    return '刚刚';
  }

  const diffMin = Math.floor(diffSec / 60);

  if (diffMin < 60) {
    return `${diffMin} 分钟前`;
  }

  const diffHour = Math.floor(diffMin / 60);

  if (diffHour < 24) {
    return `${diffHour} 小时前`;
  }

  const diffDay = Math.floor(diffHour / 24);

  if (diffDay < 7) {
    return `${diffDay} 天前`;
  }

  return date.toLocaleString('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** @alias formatRelativeUpdatedAt */
export const formatRelativeTime = formatRelativeUpdatedAt;
