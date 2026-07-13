"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { mockRole, type DashboardRole } from "@/lib/auth/mock-role";

const NAV_ITEMS: Array<{ name: string; href: string; roles: DashboardRole[] }> = [
  { name: "الرئيسية", href: "/", roles: ["owner", "support_helper"] },
  { name: "الشركات", href: "/companies", roles: ["owner", "support_helper"] },
  { name: "المشاريع", href: "/projects", roles: ["owner", "support_helper"] },
  { name: "المستحقات", href: "/financials", roles: ["owner"] }, // Strict owner only
];

export function Navigation() {
  const pathname = usePathname();

  // Filter items based on the current user role
  const visibleItems = NAV_ITEMS.filter((item) =>
    item.roles.includes(mockRole)
  );

  return (
    <nav className="flex items-center gap-6 ms-8">
      {visibleItems.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`text-lg font-medium transition-colors ${
              isActive
                ? "text-primary border-b-2 border-primary pb-1"
                : "text-foreground/80 hover:text-primary"
            }`}
          >
            {item.name}
          </Link>
        );
      })}
    </nav>
  );
}
