/**
 * Neutral dashboard role type only.
 * Runtime role authority comes from server profile resolution, never from client stubs.
 */
export type DashboardRole = "owner" | "support_helper";

export function isDashboardRole(value: string): value is DashboardRole {
  return value === "owner" || value === "support_helper";
}
