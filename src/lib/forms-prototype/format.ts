/**
 * Deterministic display formatters for the prototype.
 *
 * All numeric/date output uses Latin digits so it can be safely LTR-isolated
 * inside the Arabic RTL layout via <bdi dir="ltr">.
 */

/** Formats an integer SAR amount as e.g. "120 ر.س" or "960 ر.س" (Latin digits). */
export function formatCurrency(amount: number): string {
  const safe = Number.isFinite(amount) ? Math.round(amount) : 0;
  return `${safe.toLocaleString("en-US")} ر.س`;
}

/** Formats a plain integer with grouping (Latin digits). */
export function formatNumber(value: number): string {
  const safe = Number.isFinite(value) ? value : 0;
  return safe.toLocaleString("en-US");
}

/** Formats an ISO date (YYYY-MM-DD or full ISO) as DD/MM/YYYY (Latin digits). */
export function formatDate(iso: string | null): string {
  if (!iso) {
    return "—";
  }
  const datePart = iso.slice(0, 10);
  const [year, month, day] = datePart.split("-");
  if (!year || !month || !day) {
    return "—";
  }
  return `${day}/${month}/${year}`;
}

/** Formats an ISO date-time string as DD/MM/YYYY h:mm ص/م in UTC (Latin digits). */
export function formatDateTime(iso: string | null): string {
  if (!iso) {
    return "—";
  }
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return "—";
  }
  const day = String(d.getUTCDate()).padStart(2, "0");
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const year = d.getUTCFullYear();
  let hours = d.getUTCHours();
  const minutes = String(d.getUTCMinutes()).padStart(2, "0");
  const ampm = hours >= 12 ? "م" : "ص";
  hours = hours % 12;
  hours = hours ? hours : 12;
  return `${day}/${month}/${year} ${hours}:${minutes} ${ampm}`;
}

/** Formats a percentage value as e.g. "80%" (Latin digits). */
export function formatPercentage(value: number): string {
  const safe = Number.isFinite(value) ? Math.round(value) : 0;
  return `${safe.toLocaleString("en-US")}%`;
}

/** Returns formatted phone string for LTR representation. */
export function formatPhone(mobile: string | null): string {
  if (!mobile) {
    return "—";
  }
  return mobile.trim();
}

/** Returns formatted form code. */
export function formatFormCode(code: string | null): string {
  if (!code) {
    return "—";
  }
  return code.trim();
}

/** Returns formatted collection code. */
export function formatCollectionCode(code: string | null): string {
  if (!code) {
    return "—";
  }
  return code.trim();
}
