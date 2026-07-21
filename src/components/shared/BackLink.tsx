import Link from "next/link";
import type { ReactNode } from "react";
import styles from "./back-link.module.css";

type BackLinkProps = {
  href: string;
  children: ReactNode;
  className?: string;
};

export function BackLink({ href, children, className }: BackLinkProps) {
  return (
    <Link href={href} className={[styles.backLink, className].filter(Boolean).join(" ")}>
      <svg className={styles.icon} width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="m9 18 6-6-6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span>{children}</span>
    </Link>
  );
}
