"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { DashboardRole } from "@/lib/auth/dashboard-role";
import styles from "@/components/dashboard/authenticated-shell.module.css";

const NAV_ITEMS: Array<{ name: string; href: string; roles: DashboardRole[] }> = [
  { name: "الرئيسية", href: "/", roles: ["owner", "support_helper"] },
  { name: "الشركات", href: "/companies", roles: ["owner", "support_helper"] },
  { name: "المشاريع", href: "/projects", roles: ["owner", "support_helper"] },
  { name: "المستحقات", href: "/financials", roles: ["owner"] },
];

type NavigationProps = {
  role: DashboardRole;
};

export function Navigation({ role }: NavigationProps) {
  const pathname = usePathname();

  const visibleItems = NAV_ITEMS.filter((item) => item.roles.includes(role));

  return (
    <nav className={styles.navigation} aria-label="التنقل الرئيسي">
      {visibleItems.map((item) => {
        const isActive =
          pathname === item.href ||
          (item.href !== "/" && pathname.startsWith(`${item.href}/`));

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={`${styles.navigationLink} ${
              isActive ? styles.navigationLinkActive : ""
            }`}
          >
            {item.name}
          </Link>
        );
      })}
    </nav>
  );
}
