import { ZamblakLoadingMark } from "@/components/brand/ZamblakLoadingMark";
import styles from "@/components/brand/zamblak-loading-mark.module.css";

/**
 * Root segment loading boundary (renders inside root layout <main>).
 * Header remains from layout.tsx. Nested route loading.tsx files take
 * precedence for Projects/Companies and keep their skeletons.
 */
export default function RootLoading() {
  return (
    <div
      className={styles.fullPageHost}
      aria-busy="true"
      aria-live="polite"
    >
      <ZamblakLoadingMark
        variant="full"
        showWordmark
        label="جاري التحميل..."
      />
    </div>
  );
}
