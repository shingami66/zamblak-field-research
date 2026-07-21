import { redirect } from "next/navigation";
import styles from "./search-card.module.css";

export function SearchCard() {
  async function search(formData: FormData) {
    "use server";
    const q = formData.get("q")?.toString() || "";
    if (q.trim()) {
      redirect(`/respondents?q=${encodeURIComponent(q.trim())}`);
    }
  }

  return (
    <div className={styles.searchCard}>
      <div>
        <h2 className={styles.title}>البحث عن مشارك</h2>
        <p id="participant-search-help" className={styles.description}>
          ابحث برقم الجوال للوصول السريع إلى سجل المشارك.
        </p>
      </div>
      <form action={search} className={styles.form}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="participant-mobile-search">
            رقم الجوال
          </label>
          <input
            id="participant-mobile-search"
            type="tel"
            name="q"
            placeholder="9665xxxxxxxx"
            className={styles.input}
            dir="ltr"
            aria-describedby="participant-search-help"
            autoComplete="tel"
            required
          />
        </div>
        <button type="submit" className={styles.button}>
          بحث
        </button>
      </form>
    </div>
  );
}
