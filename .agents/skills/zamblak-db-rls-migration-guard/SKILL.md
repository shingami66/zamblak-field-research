---
name: zamblak-db-rls-migration-guard
description: Specialist gatekeeper for Supabase migrations, PostgreSQL schemas, RLS policies, and triggers in Zamblak.
---

# Zamblak DB & RLS Migration Guard

## Purpose
Guards the database schema, ensures strict Row Level Security (RLS) enforcement, and prevents destructive or insecure data mutations.

## When to Use
Use this skill for any task involving PostgreSQL schema changes, Supabase migrations, RLS policies, triggers, or database security reviews.

## SQL_DRAFT_ONLY vs SUPABASE_APPLY_ONLY
- **SQL_DRAFT_ONLY**: Can only read files and generate raw `.sql` drafts. Cannot connect to Supabase or run migrations.
- **SUPABASE_APPLY_ONLY**: Can execute approved SQL against the database.
- *Explicit Rule*: A SQL review PASS does not mean DB apply. Migrations are strictly manual-review-first. Applying a migration requires a task explicitly set to `SUPABASE_APPLY_ONLY` and explicit user approval.

## Supabase/PostgreSQL RLS Checklist
For every migration or schema change, verify:
- **RLS Enabled**: RLS must be explicitly enabled on all protected tables.
- **No Broad Policies**: No `USING (true)` or `WITH CHECK (true)`.
- **No Unsafe FOR ALL**: Policies should explicitly define `SELECT`, `INSERT`, `UPDATE`, or `DELETE`.
- **No Direct DELETE**: Direct `DELETE` policies are forbidden unless explicitly approved (use soft-delete `deleted_at` instead).
- **No Direct UPDATE on Sensitive Tables**: Direct `UPDATE` on operational tables (companies, projects, respondents, participations) is forbidden unless explicitly reviewed and safe. Future state transitions use RPCs.
- **Tenant Boundary**: `account_id` is the strict tenant boundary.
- **Consistency Triggers**: `account_id` consistency triggers must exist for related entities.
- **SECURITY DEFINER**: Functions using `SECURITY DEFINER` must include `SET search_path = public`.
- **Helper Functions**: RLS helper functions (e.g., `current_profile_id()`) must filter by `active = true` AND `deleted_at IS NULL`.
- **Audit Log Immutability**: `audit_log` inserts must be trigger-driven only. Clients cannot INSERT/UPDATE/DELETE.
- **Financial Isolation**: Financial tables (`project_financial_settings`, `participation_pricing`, `payments`) are strictly owner-only.
- **No Support Helper Leaks**: `support_helper` roles must not read financial data directly, through views, or through audit logs.
- **State-Smuggling Checks**: `INSERT`/`UPDATE` policies must enforce strict neutral initial states via `WITH CHECK`.
- **Constraints & Indexes**: Validate required `CHECK` constraints and partial indexes.
- **Price Snapshot Rule**: `price_snapshot` must never be overwritten on re-acceptance.
- **Accepted-Only Billing**: Financial calculations only count `accepted` participation forms.

## Trigger Safety Checklist
- **No Generic Column Access**: Triggers must safely check for columns that may not exist in all tables (e.g., using JSONB `OLD` / `NEW` inspection like `to_jsonb(OLD)->>'deleted_at'`).
- **No Recursion**: Triggers and RLS policies must not infinitely recurse.
- **No Hidden Financial Mutation**: Operational triggers must not silently alter financial baselines without audit trails.
- **SECURITY DEFINER Requirement**: Any trigger function that SELECTs from RLS-protected tables for integrity, tenant-boundary, financial, or audit correctness must be `SECURITY DEFINER SET search_path = public`, or the task must explicitly justify why not.
- **Fail-Open Warning**: Without `SECURITY DEFINER`, RLS may hide parent rows and cause NULL/UNKNOWN comparisons, allowing cross-tenant or financial integrity checks to fail open.

## Evidence Requirements
Review reports must explicitly list:
1. Migration file inspected.
2. Objects (tables, views, functions) verified.
3. RLS Policies verified.
4. Triggers verified.
5. Migration-blocking issues listed by severity (P0/P1/P2).
6. Trigger functions that SELECT from other tables identified, verified to be `SECURITY DEFINER SET search_path = public`, with fail-closed missing-parent checks and NULL-safe `IS DISTINCT FROM` comparisons where applicable.

## PASS/HOLD Output Format
All migration reviews must conclude with a structured `PASS/HOLD` report detailing the evidence and validation of the above checklists.
