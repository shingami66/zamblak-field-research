"use client";

import { useEffect, useState } from "react";
import styles from "./success-notice.module.css";

export const SUCCESS_NOTICE_DISMISS_MS = 4000;

export function SuccessNotice({ message }: { message: string | null }) {
  const [dismissedMessage, setDismissedMessage] = useState<string | null>(null);

  const isDismissed = message === null || dismissedMessage === message;

  useEffect(() => {
    if (!message) return;

    const timer = setTimeout(() => {
      setDismissedMessage(message);

      const url = new URL(window.location.href);
      if (!url.searchParams.has("success")) return;
      url.searchParams.delete("success");
      window.history.replaceState(
        window.history.state,
        "",
        `${url.pathname}${url.search}${url.hash}`
      );
    }, SUCCESS_NOTICE_DISMISS_MS);

    return () => clearTimeout(timer);
  }, [message]);

  if (isDismissed) return null;

  return (
    <div className={styles.notice} role="status" aria-live="polite">
      {message}
    </div>
  );
}
