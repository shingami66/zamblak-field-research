"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import styles from "@/app/projects/projects-list.module.css";

export interface CompanyFilterOption {
  companyId: string;
  name: string;
}

export interface ProjectsFilterToolbarProps {
  initialSearch?: string | null;
  initialCompanyId?: string | null;
  initialStatus?: string | null;
  companyOptions: CompanyFilterOption[];
  statusOptions: { value: string; label: string }[];
  copy: {
    searchLabel: string;
    searchPlaceholder: string;
    searchAction: string;
    companyFilterLabel: string;
    companyFilterAll: string;
    statusFilterLabel: string;
    statusFilterAll: string;
  };
}

export function ProjectsFilterToolbar({
  initialSearch = null,
  initialCompanyId = null,
  initialStatus = null,
  companyOptions = [],
  statusOptions = [],
  copy,
}: ProjectsFilterToolbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Derive active URL search parameter value
  const urlQ = searchParams.get("q") ?? initialSearch ?? "";
  const activeCompanyId = searchParams.get("company") ?? initialCompanyId ?? "";
  const activeStatus = searchParams.get("status") ?? initialStatus ?? "";

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

  const handleCompanyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    pushUpdatedFilters({ company: e.target.value || undefined });
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    pushUpdatedFilters({ status: e.target.value || undefined });
  };

  return (
    <div className={styles.toolbar}>
      <form onSubmit={handleSearchSubmit} className={styles.filterForm}>
        {/* Text Search Input + attached Submit button */}
        <div className={styles.searchField} style={{ flex: "1 1 240px" }}>
          <label className={styles.searchLabel} htmlFor="project-search">
            {copy.searchLabel}
          </label>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <input
              id="project-search"
              className={styles.searchInput}
              type="search"
              name="q"
              value={searchInput}
              onChange={handleSearchInputChange}
              maxLength={120}
              placeholder={copy.searchPlaceholder}
              autoComplete="off"
            />
            <button
              type="submit"
              className={styles.searchSubmit}
              style={{ minHeight: "3.25rem", paddingInline: "1.25rem", whiteSpace: "nowrap" }}
            >
              {copy.searchAction}
            </button>
          </div>
        </div>

        {/* Company Dropdown (auto-submitting on change) */}
        <div className={styles.searchField} style={{ flex: "1 1 200px" }}>
          <label className={styles.searchLabel} htmlFor="project-company">
            {copy.companyFilterLabel}
          </label>
          <select
            id="project-company"
            className={styles.selectInput}
            name="company"
            value={activeCompanyId}
            onChange={handleCompanyChange}
          >
            <option value="">{copy.companyFilterAll}</option>
            {companyOptions.map((option) => (
              <option key={option.companyId} value={option.companyId}>
                {option.name}
              </option>
            ))}
          </select>
        </div>

        {/* Status Dropdown (auto-submitting on change) */}
        <div className={styles.searchField} style={{ flex: "1 1 200px" }}>
          <label className={styles.searchLabel} htmlFor="project-status">
            {copy.statusFilterLabel}
          </label>
          <select
            id="project-status"
            className={styles.selectInput}
            name="status"
            value={activeStatus}
            onChange={handleStatusChange}
          >
            <option value="">{copy.statusFilterAll}</option>
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </form>
    </div>
  );
}
