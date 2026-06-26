import type { ReactNode } from 'react';
import { SiteFooter } from './SiteFooter';
import styles from './Layout.module.css';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.logo}>今日热搜</h1>
        <p className={styles.subtitle}>微博 · 知乎 · B 站热榜聚合</p>
      </header>

      <main className={styles.main}>{children}</main>

      <SiteFooter />
    </div>
  );
}
