---
name: zamblak-db-rls-migration-guard
description: Specialist gatekeeper for Supabase migrations, PostgreSQL schemas, RLS policies, views, triggers, and SQL execution gates in Zamblak.
---

# Zamblak DB & RLS Migration Guard

## Purpose & Authority
Guards the database schema, ensures strict Row Level Security (RLS) enforcement, evaluates database grants and views, and prevents destructive or insecure data mutations. This skill is authoritative for all schema changes, migrations, RLS policy design/review, database functions, triggers, and migration application gates.

## SQL_DRAFT_ONLY vs SUPABASE_APPLY_ONLY
- **SQL_DRAFT_ONLY**: Authorizes reading repository files, analyzing schemas, and generating raw `.sql` migration drafts. Strictly prohibits connecting to Supabase or executing migrations.
- **SUPABASE_APPLY_ONLY**: Authorizes executing approved SQL against the database.
- *Explicit Rule*: A SQL review PASS does not grant DB apply authority. Migrations are strictly manual-review-first. Applying a migration requires a task explicitly set to `SUPABASE_APPLY_ONLY` and explicit user/Owner authorization.
- *Advisor Tooling Boundary*: Supabase security or performance advisors may provide useful signals after actual DDL application, but must never cause ordinary read-only migration review to require live database access.

---

## 1. Two-Layer Security Architecture: Grants vs RLS

Database security in Supabase relies on two distinct, complementary layers:
1. **Table/Function Grants (Data API Surface):**
   - Grants determine whether a role (`anon`, `authenticated`, `service_role`) can execute a given SQL operation at all (`SELECT`, `INSERT`, `UPDATE`, `DELETE`, `EXECUTE`).
   - Follow least-privilege grants: Never grant permissions on internal tables, financial records, or privileged functions to `anon` or `PUBLIC`.
2. **Row Level Security (RLS):**
   - RLS filters which specific rows an authorized role can view or modify.
   - **`TO authenticated` Alone is NOT Authorization:** Granting access `TO authenticated` merely establishes that the request possesses a valid session; it does NOT establish tenant isolation or row-level permission. Strict RLS policies must govern every row operation.

---

## 2. Supabase/PostgreSQL RLS Deep Review Standards

For every migration, table, or schema change, verify:
- **RLS Explicitly Enabled:** Every exposed table must execute `ALTER TABLE <table_name> ENABLE ROW LEVEL SECURITY;` and `ALTER TABLE <table_name> FORCE ROW LEVEL SECURITY;` where applicable.
- **No Broad Policies:** Zero tolerance for permissive placeholders (`USING (true)` or `WITH CHECK (true)`).
- **Explicit Operations (No Unsafe `FOR ALL`):** Policies must explicitly define `FOR SELECT`, `FOR INSERT`, `FOR UPDATE`, or `FOR DELETE`. Broad `FOR ALL` policies often unintentionally grant write or delete access.
- **No Direct DELETE:** Direct `DELETE` policies on operational tables are forbidden unless explicitly authorized; implement soft-delete patterns (`deleted_at TIMESTAMPTZ`) instead.
- **No Direct UPDATE on Sensitive Entities:** Direct client `UPDATE` on companies, projects, respondents, and participations is forbidden. State machine transitions must be driven by dedicated RPC functions or trigger constraints.
- **Tenant Isolation (`account_id`):** Policies must enforce `account_id = (SELECT current_account_id())` or match the authenticated user's tenant profile.
- **Avoid Deprecated `auth.role()` Patterns:** Do not rely on deprecated or easily misconfigured `auth.role()` helper calls; evaluate authentication status via explicit `auth.uid()` against validated profile tables.
- **Zero User-Metadata Authorization:** RLS policies must **never** reference `auth.jwt() -> 'user_metadata'` or `raw_user_meta_data`, which are client-editable. Authorization must use database tables or server-controlled `app_metadata`.
- **UPDATE Policy Standards (`USING` vs `WITH CHECK`):**
  - An `UPDATE` operation requires both visibility and mutation integrity.
  - `USING` controls which existing rows are visible for update.
  - `WITH CHECK` controls what the row must look like after the update.
  - Both must be reviewed: omitting `WITH CHECK` allows tenants to smuggle records into invalid states or across tenant boundaries.

---

## 3. Database Views & RLS Bypass Defense

- **Security Invoker Views:**
  - PostgreSQL views run with the permissions of the view owner by default (`SECURITY DEFINER`), which bypasses RLS policies on underlying tables.
  - Views exposed via the Supabase Data API must specify `WITH (security_invoker = true)` where supported (PostgreSQL 15+), ensuring queries against the view respect the calling user's RLS policies.
- **Exposed vs Internal Views:**
  - If a view aggregates or joins sensitive tables (especially financial or audit tables), ensure it is not exposed to `anon` or unauthorized `authenticated` roles.

---

## 4. `SECURITY DEFINER` Functions & RPC API Review

`SECURITY DEFINER` functions run with superuser/owner privileges and represent an elevated attack surface. Every `SECURITY DEFINER` function requires exceptional scrutiny:
- **Never a Workaround:** Never use `SECURITY DEFINER` merely to silence permission or RLS errors; fix the policy or grant structure instead.
- **Safe Explicit Search Path:** Must always specify `SET search_path = public, pg_temp;` (or explicit schema) to prevent search-path hijacking.
- **Strict Authorization & Fail-Closed Checks:**
  - Must begin with explicit authentication checks (`IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;`).
  - Must independently verify tenant boundary (`account_id`) and user role (`owner` vs `support_helper`).
- **Least-Privilege `EXECUTE` Grants:**
  - Revoke default public execution: `REVOKE EXECUTE ON FUNCTION <func> FROM PUBLIC, anon;`.
  - Grant execution only to intended roles (`GRANT EXECUTE ON FUNCTION <func> TO authenticated;`).
  - Treat all RPC functions as public HTTP endpoints exposed via the Supabase Data API.
- **Schema Isolation:** Prefer placing internal or privileged helper functions in non-exposed schemas (e.g. `private` or `internal`) rather than `public` when architectural conventions permit.

---

## 5. Cross-Account Parent/Child Integrity & NULL-Safety

- **Fail-Closed Parent/Child Verification:**
  - Triggers and validation functions checking relationships (e.g., ensuring a respondent or form belongs to the active project) must fail closed if the parent row is missing or invisible due to RLS.
- **NULL-Safe Equality:**
  - In PostgreSQL, `NULL = NULL` yields `NULL` (falsy in booleans).
  - Use NULL-safe comparisons (`IS NOT DISTINCT FROM` or `IS DISTINCT FROM`) when comparing nullable columns such as `account_id`, `deleted_at`, or status flags to prevent unintended bypasses.
- **Consistency Triggers:**
  - Enforce `account_id` consistency across parent and child tables via BEFORE INSERT/UPDATE triggers.

---

## 6. Financial & Role Invariants in Zamblak

- **Financial Isolation:** Tables `project_financial_settings`, `participation_pricing`, and payment logs are strictly restricted to `owner`.
- **Support Helper Restriction:** The `support_helper` role must never read or write financial data, whether directly, via views, RPCs, or audit logs.
- **Price Snapshot Rule:** Once recorded, `price_snapshot` must never be altered upon re-acceptance of a participation.
- **Accepted-Only Billing:** Participation billing counts only records with `status = 'accepted'`.
- **Audit Log Immutability:** The `audit_log` table is append-only and trigger-driven. Direct INSERT, UPDATE, or DELETE policies are strictly forbidden.

---

## 7. Migration Review Protocol & Report Contract

Every database migration review must produce a structured report containing:
1. **Migration File Inspected:** Path and filename.
2. **Schema Objects Reviewed:** Tables, columns, views, functions, triggers, constraints.
3. **Grants & API Surface:** Evaluation of table grants and RPC execution permissions.
4. **RLS Policies Evaluated:** Explicit evaluation of `USING` and `WITH CHECK` clauses, tenant filters, and role restrictions.
5. **Security Definer Audit:** Scrutiny of `search_path`, authorization checks, and execution grants.
6. **Trigger & Integrity Audit:** Recursion safety, NULL-safe comparisons, and fail-closed parent checks.
7. **Severity Classification:** Any blocking issues flagged by severity (P0 Blocker / P1 Major / P2 Minor).
8. **Verdict:** `PASS` or `HOLD` (with exact remediation instructions).
