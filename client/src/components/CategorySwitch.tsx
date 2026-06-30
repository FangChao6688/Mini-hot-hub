import type { HotCategory } from '../types/hot';
import styles from './CategorySwitch.module.css';

interface CategorySwitchProps {
  value: HotCategory;
  onChange: (category: HotCategory) => void;
}

const OPTIONS: Array<{ value: HotCategory; label: string }> = [
  { value: 'news', label: '资讯' },
  { value: 'finance', label: '财经' },
];

export function CategorySwitch({ value, onChange }: CategorySwitchProps) {
  return (
    <div className={styles.switch} role="tablist" aria-label="热榜分类">
      {OPTIONS.map((option) => {
        const active = value === option.value;

        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            className={active ? `${styles.tab} ${styles.tabActive}` : styles.tab}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
