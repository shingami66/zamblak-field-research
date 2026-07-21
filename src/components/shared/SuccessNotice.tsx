import styles from "./success-notice.module.css";

export function SuccessNotice({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className={styles.notice} role="status" aria-live="polite">
      {message}
    </div>
  );
}
