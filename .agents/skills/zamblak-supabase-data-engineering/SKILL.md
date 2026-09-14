---
name: zamblak-supabase-data-engineering
description: Runtime Supabase data engineering for Zamblak. Governs browser vs server client usage, SSR cookie sessions, Data API queries, .rpc() contracts, tenant-safe data access, and error handling under AGENTS.md.
---

# Zamblak Supabase Data Engineering

## Purpose & Scope
This skill provides engineering guidance for **runtime** Supabase interactions in Zamblak application code (Next.js App Router, Server Components, Server Actions, Route Handlers, and Client Components).

### Authority Boundaries & Non-Overlap
- **Runtime Data Access Only:** Governs client initialization, querying via Supabase Data API, `.rpc()` execution, and data/error handling.
- **Schema & Migration Exclusion:** This skill does **NOT** authorize schema alterations, table creation, trigger authoring, or migration file drafting.
- **RLS Policy Design Exclusion:** For creating or modifying Row Level Security (RLS) policies, triggers, or database functions, route `zamblak-db-rls-migration-guard`.
- **Database Apply Gate:** This skill does **NOT** authorize applying migrations or executing SQL against Supabase databases (`SUPABASE_APPLY_ONLY` remains separately gated by Owner authorization).
- **Secret Access:** This skill does **NOT** authorize viewing or reading `.env` secrets.

---

## 1. Client Architecture: Browser vs Server

### Server-Side Client (`src/lib/supabase/server.ts`)
- Used in Server Components, Server Actions, and Route Handlers.
- Built with `@supabase/ssr` using `createServerClient`.
- Asynchronous cookie store access: In Next.js 15/16, `cookies()` from `next/headers` is asynchronous and must be awaited (`const cookieStore = await cookies();`).
- Scope: Created per-request. Never cache or share server client instances across requests.
- Cookie management: Cookie setting in Server Components is read-only; session refresh cookie writes are owned by `src/proxy.ts` via `updateSession`.

### Browser-Side Client (`src/lib/supabase/client.ts`)
- Used only in Client Components (`"use client"`) when real-time subscriptions or interactive client queries are strictly necessary.
- Built with `@supabase/ssr` using `createBrowserClient` with public URL and publishable key only.
- Read-only or restricted mutations: Never trust browser clients with privileged mutations, state transitions, or financial calculations.

### Service-Role Trust Boundary
- Service-role credentials (`SUPABASE_SERVICE_ROLE_KEY`) bypass all Row Level Security policies.
- Service-role usage is strictly restricted to trusted server-side administrative utilities or automated background jobs.
- **Never** expose or bundle the service-role key into client bundles, browser components, or public APIs.
- Any service-role operation must explicitly re-verify tenant boundaries (`account_id`) in application code.

---

## 2. Tenant-Safe Runtime Access & Invariants

- **Mandatory Tenant Boundary (`account_id`):**
  - All runtime queries against tenant-scoped tables must respect `account_id`.
  - Even though RLS enforces tenant isolation at the database layer, runtime queries should explicitly filter by `account_id` when known to prevent unintended cross-tenant record lookups and maintain query index selectivity.
- **Authentication Context:**
  - Authenticated user ID is obtained via `supabase.auth.getUser()`, which validates the JWT with the Supabase Auth server. Avoid relying solely on `supabase.auth.getSession()` on the server for sensitive authorization decisions.
- **Roles in Zamblak:**
  - `owner`: Full administrative access within the tenant.
  - `support_helper`: Legacy operational helper; restricted from modifying tenant settings, project deletion, or viewing financial metrics.
- **Zero Browser Pricing Authority:**
  - Pricing, fee calculations, and respondent compensations must be computed server-side (`participation_pricing`, `project_financial_settings`).
  - Client components must never send calculated monetary totals for storage; Server Actions must recalculate totals server-side.

---

## 3. Querying Patterns & RPC Contracts

### Data API Queries (`.from()`)
- Explicit Selects: Prefer selecting only the required columns (`.select('id, title, status')`) instead of `*` to minimize network payload and serialization overhead.
- Single Row Fetches: Use `.single()` when exactly one row must exist, or `.maybeSingle()` when zero or one row is expected without throwing 406 error.
- Pagination: Use `.range(from, to)` for bounded pagination. Avoid unbounded reads.

### Stored Procedure / RPC Contracts (`.rpc()`)
- Complex multi-entity transactions, status state-machine transitions, and financial baselines are executed via PostgreSQL functions using `.rpc('function_name', { params })`.
- Validate RPC input parameters before dispatching.
- Handle RPC error states explicitly.

### Typed Database Interfaces
- Utilize generated or declared database types (`Database['public']['Tables']['...']['Row']`) where available to ensure type-safe property access and prevent runtime typing drift.

---

## 4. Error Handling & Result Validation

- Standard Supabase response pattern:
  ```typescript
  const { data, error } = await supabase.from('projects').select('id, name').eq('account_id', accountId);
  if (error) {
    // Log server-side with structured context; return user-safe diagnostic message
    throw new Error(`Failed to load projects: ${error.message}`);
  }
  ```
- Do not swallow errors into empty arrays or silent nulls without logging.
- Differentiate between "not found" (`PGRST116` with `.single()`) and genuine database execution errors.
