import Image from "next/image";
import Link from "next/link";
import { AccountMenu } from "./AccountMenu";
import { Navigation } from "./Navigation";
import type { DashboardRole } from "@/lib/auth/dashboard-role";
import styles from "@/components/dashboard/authenticated-shell.module.css";

type HeaderProps = {
  role?: DashboardRole | null;
  displayName?: string | null;
};

export function Header({ role = null, displayName = null }: HeaderProps) {
  if (!role) {
    return null;
  }

  const normalizedDisplayName = displayName?.trim() || null;
  const roleLabel = role === "owner" ? "مالك الحساب" : "مساعد الدعم";
  const avatarLabel =
    normalizedDisplayName?.charAt(0) ?? (role === "owner" ? "م" : "د");

  return (
    <header className={styles.header}>
      <div className={styles.headerInner}>
        <div className={styles.headerPrimaryRow}>
          <Link
            href="/"
            className={styles.brandLink}
            aria-label="زمبلك للأبحاث الميدانية — الرئيسية"
          >
            <span className={styles.brandMarkPlate}>
              <Image
                src="/brand/zamblak-mark.svg"
                alt=""
                width={48}
                height={48}
                priority
                className={styles.brandMark}
              />
            </span>
            <span className={styles.brandText}>
              <span className={styles.brandName}>زمبلك للأبحاث الميدانية</span>
              <span className={styles.brandDescriptor}>مساحة العمل الميداني</span>
            </span>
          </Link>

          <div className={styles.desktopNavigation}>
            <Navigation role={role} />
          </div>

          <AccountMenu
            displayName={normalizedDisplayName ?? roleLabel}
            roleLabel={roleLabel}
            avatarLabel={avatarLabel}
          />
        </div>

        <div className={styles.compactNavigation}>
          <Navigation role={role} />
        </div>
      </div>
    </header>
  );
}
