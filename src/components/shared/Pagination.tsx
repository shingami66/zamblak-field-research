import Link from "next/link";
import styles from "./pagination.module.css";

interface PaginationProps {
  currentPage: number;
  visibleCount: number;
  pageSize: number;
  previousHref?: string | null;
  nextHref?: string | null;
  previousLabel?: string;
  nextLabel?: string;
}

export function Pagination({
  currentPage,
  visibleCount,
  pageSize,
  previousHref,
  nextHref,
  previousLabel = "السابق",
  nextLabel = "التالي",
}: PaginationProps) {
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = startItem + visibleCount - 1;

  if (visibleCount === 0) return null;

  return (
    <nav className={styles.pagination} aria-label="تنقل الصفحات">
      <div className={styles.info}>
        المعروض: <bdi dir="ltr">{startItem}–{endItem}</bdi>
      </div>
      <div className={styles.controls}>
        {nextHref ? (
          <Link className={styles.link} href={nextHref} rel="next">
            {nextLabel}
          </Link>
        ) : (
          <span className={styles.linkDisabled} aria-disabled="true">
            {nextLabel}
          </span>
        )}
        {previousHref ? (
          <Link className={styles.link} href={previousHref} rel="prev">
            {previousLabel}
          </Link>
        ) : (
          <span className={styles.linkDisabled} aria-disabled="true">
            {previousLabel}
          </span>
        )}
      </div>
    </nav>
  );
}
