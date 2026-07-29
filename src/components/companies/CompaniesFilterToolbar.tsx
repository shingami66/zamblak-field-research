"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import styles from "@/app/companies/companies-list.module.css";

export interface CompaniesFilterToolbarProps {
  name?: string;
  initialSearch?: string | null;
  copy: {
    searchLabel: string;
    searchPlaceholder: string;
    searchAction: string;
  };
}

export function CompaniesFilterToolbar({
  initialSearch = null,
  copy,
}: CompaniesFilterToolbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Derive active URL search parameter value
  const urlQ = searchParams.get("q") ?? initialSearch ?? "";

  const [prevUrlQ, setPrevUrlQ] = useState(urlQ);
  const [searchInput, setSearchInput] = useState(urlQ);

  // Synchronize local input state during rendering when URL parameter changes (e.g. navigation, back/forward)
  if (urlQ !== prevUrlQ) {
    setPrevUrlQ(urlQ);
    setSearchInput(urlQ);
  }

  const pushUpdatedFilters = (updates: Record<string, string | undefined>) => {
    const params = new URLSearchParams(searchParams.toString());

    // Reset pagination to page 1 whenever filters change
    params.delete("page");

    // Apply explicit updates
    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined && value.trim() !== "") {
        params.set(key, value.trim());
      } else {
        params.delete(key);
      }
    });

    // Sweep and purge any remaining empty or whitespace parameters
    Array.from(params.keys()).forEach((key) => {
      const val = params.get(key);
      if (!val || val.trim() === "") {
        params.delete(key);
      }
    });

    const queryString = params.toString();
    router.push(queryString ? `${pathname}?${queryString}` : pathname);
  };

  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchInput(val);

    // If changing to empty and URL currently has an active q filter, automatically remove q
    if (val.trim() === "" && Boolean(searchParams.get("q"))) {
      pushUpdatedFilters({ q: undefined });
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    pushUpdatedFilters({ q: searchInput.trim() || undefined });
  };

  return (
    <div className={styles.toolbar}>
      <form onSubmit={handleSearchSubmit} className={styles.searchForm}>
        <div className={styles.searchField}>
          <label className={styles.searchLabel} htmlFor="company-search">
            {copy.searchLabel}
          </label>
          <input
            id="company-search"
            className={styles.searchInput}
            type="search"
            name="q"
            value={searchInput}
            onChange={handleSearchInputChange}
            maxLength={120}
            placeholder={copy.searchPlaceholder}
            autoComplete="off"
          />
        </div>
        <button type="submit" className={styles.searchSubmit}>
          {copy.searchAction}
        </button>
      </form>
    </div>
  );
}
