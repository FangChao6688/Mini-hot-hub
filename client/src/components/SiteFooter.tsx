import { FOOTER_CONTACT_EMAIL, FOOTER_LINES } from '../constants/compliance';
import styles from './SiteFooter.module.css';

interface SiteFooterProps {
  className?: string;
}

export function SiteFooter({ className }: SiteFooterProps) {
  return (
    <footer className={className ? `${styles.footer} ${className}` : styles.footer}>
      {FOOTER_LINES.map((line) => (
        <p key={line} className={styles.line}>
          {line}
        </p>
      ))}
      <p className={styles.contact}>
        如有内容侵权或违规问题，请联系：
        <a className={styles.contactLink} href={`mailto:${FOOTER_CONTACT_EMAIL}`}>
          {FOOTER_CONTACT_EMAIL}
        </a>
      </p>
    </footer>
  );
}
