import styles from "./zamblak-loading-mark.module.css";

export type ZamblakLoadingMarkVariant = "compact" | "standard" | "full";

export type ZamblakLoadingMarkProps = {
  /** Size / layout variant. Default: standard. */
  variant?: ZamblakLoadingMarkVariant;
  /** Optional visible loading label (standard/full). Decorative SVG stays aria-hidden. */
  label?: string;
  /**
   * Show the Zamblak wordmark. Defaults to true for full, false otherwise.
   * Compact never shows a wordmark even when forced true.
   */
  showWordmark?: boolean;
  className?: string;
};

/**
 * Original Zamblak branded loading mark: minimal stopwatch + animated seconds hand.
 * Server-compatible: inline SVG + CSS only (no client hooks, timers, or assets).
 */
export function ZamblakLoadingMark({
  variant = "standard",
  label,
  showWordmark,
  className,
}: ZamblakLoadingMarkProps) {
  const isCompact = variant === "compact";
  const isFull = variant === "full";
  const displayWordmark = !isCompact && (showWordmark ?? isFull);

  const rootClass = [
    styles.root,
    isCompact ? styles.compact : isFull ? styles.full : styles.standard,
    !isFull && label ? styles.inline : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={rootClass}>
      <svg
        className={styles.mark}
        viewBox="0 0 48 48"
        width={isCompact ? 18 : isFull ? 56 : 28}
        height={isCompact ? 18 : isFull ? 56 : 28}
        aria-hidden="true"
        focusable="false"
      >
        {/* Crown / top button */}
        <path
          className={styles.crown}
          d="M20 8.5h8M24 5.5v5"
        />
        {/* Bezel */}
        <circle className={styles.bezel} cx="24" cy="26" r="14.5" />
        {/* Cardinal ticks only */}
        <path className={styles.tick} d="M24 13.5v2.5" />
        <path className={styles.tick} d="M24 36v2.5" />
        <path className={styles.tick} d="M11.5 26h2.5" />
        <path className={styles.tick} d="M34 26h2.5" />
        {/* Seconds hand — lime accent; transform origin at dial center */}
        <line
          className={styles.hand}
          x1="24"
          y1="26"
          x2="24"
          y2="14.5"
        />
        <circle className={styles.handTip} cx="24" cy="14.5" r="1.4" />
        {/* Center pivot */}
        <circle className={styles.pivot} cx="24" cy="26" r="2.1" />
      </svg>
      {displayWordmark ? (
        <p className={styles.wordmark}>Zamblak</p>
      ) : null}
      {label ? <p className={styles.label}>{label}</p> : null}
    </div>
  );
}
