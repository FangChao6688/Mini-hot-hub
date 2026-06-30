import { useCallback, useEffect, useState } from 'react';
import { CategorySwitch } from './components/CategorySwitch';
import { Home } from './pages/Home';
import type { HotCategory } from './types/hot';
import styles from './App.module.css';

function readCategoryFromHash(): HotCategory {
  return window.location.hash === '#finance' ? 'finance' : 'news';
}

export default function App() {
  const [category, setCategory] = useState<HotCategory>(() => readCategoryFromHash());

  const handleCategoryChange = useCallback((nextCategory: HotCategory) => {
    setCategory(nextCategory);
    window.location.hash = nextCategory === 'finance' ? '#finance' : '#news';
  }, []);

  useEffect(() => {
    const handleHashChange = () => {
      setCategory(readCategoryFromHash());
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  return (
    <div className={styles.app}>
      <div className={styles.switchBar}>
        <CategorySwitch value={category} onChange={handleCategoryChange} />
      </div>
      <Home category={category} />
    </div>
  );
}
