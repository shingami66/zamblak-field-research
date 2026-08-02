# Database Migrations Ledger

- Manual review-first migration policy.
- Workflow: Plan → SQL Draft → Schema Review → Apply Dev DB → Verify → Implement → Smoke → Audit → Commit.
- No migration apply without explicit authorization.

## Status Vocabulary & Classification Criteria

Every migration entry in this ledger is classified across four distinct verification dimensions:

1. **Local Source:** `PRESENT` (file exists in `supabase/migrations/`) | `ABSENT`.
2. **DEV/DEMO Apply:** `VERIFIED APPLIED` (applied to designated DEV/DEMO database) | `FAILED / ROLLED BACK` | `NOT CLAIMED` | `UNKNOWN`.
3. **Verification:** `CATALOG VERIFIED` (database catalog objects verified via SQL queries) | `RUNTIME SMOKED` (end-to-end application/UI runtime verified) | `PARTIALLY VERIFIED` | `NOT CLAIMED` | `UNKNOWN`.
4. **Remote Migration History:** `VERIFIED REGISTERED` (registered in remote `supabase_migrations.schema_migrations` table) | `VERIFIED MISSING` | `NOT CLAIMED` | `UNKNOWN`.
5. **Production Readiness:** `UNCLAIMED` (DEV/DEMO evidence must **NEVER** be inferred as customer production readiness).

---

## Local Migration Inventory & Ledger (19 SQL Files)

### 1. `202607060001_zamblak_core_schema.sql`
- **Local Source:** PRESENT
- **DEV/DEMO Apply:** VERIFIED APPLIED (applied manually via Supabase SQL Editor on target `gdegnwglakyblnmxgiwx` inside explicit `BEGIN/COMMIT`)
- **Verification:** CATALOG VERIFIED (10 core tables, triggers, views; hardened under FIX-5 and FIX-6)
- **Remote History:** NOT CLAIMED
- **Details:** Initial core schema foundation (`accounts`, `profiles`, `companies`, `projects`, `project_financial_settings`, `respondents`, `participations`, `participation_pricing`, `payments`, `audit_log`).

### 2. `202607130001_participation_project_state_guard.sql`
- **Local Source:** PRESENT
- **DEV/DEMO Apply:** VERIFIED APPLIED (committed in `0d48fe8ed2`, applied manually to DEV/DEMO `gdegnwglakyblnmxgiwx`)
- **Verification:** CATALOG VERIFIED (`trg_participation_00_project_state_guard` and `public.enforce_participation_project_state()` verified via dry-run)
- **Remote History:** NOT CLAIMED
- **Details:** Enforces project state rules for participation membership writes (`active` project required).

### 3. `202607130002_role_safe_read_surfaces.sql`
- **Local Source:** PRESENT
- **DEV/DEMO Apply:** VERIFIED APPLIED (SHA-256 `AE01C67A18...` applied manually under `ZAM-WF-001F-RLS-READ-SURFACE`)
- **Verification:** CATALOG VERIFIED (11 managed functions, 2 views, 23 policies, manifest MD5 `f950c7ec...`)
- **Remote History:** NOT CLAIMED
- **Details:** Installs role-safe read surfaces and SECURITY DEFINER support RPCs for non-owner operational queries.

### 4. `20260714114814_first_owner_bootstrap.sql`
- **Local Source:** PRESENT
- **DEV/DEMO Apply:** VERIFIED APPLIED (applied manually via SQL Editor under `ZAM-AUTH-001C`)
- **Verification:** CATALOG VERIFIED (first-owner bootstrap executed; initial account `Zamblak Field Research` created)
- **Remote History:** NOT CLAIMED
- **Details:** One-time bootstrap function for creating initial account and active Owner user.

### 5. `20260714201500_self_profile_resolution_rpc.sql`
- **Local Source:** PRESENT
- **DEV/DEMO Apply:** VERIFIED APPLIED (applied manually on DEV/DEMO)
- **Verification:** CATALOG VERIFIED (`public.get_current_profile()` RPC verified)
- **Remote History:** NOT CLAIMED
- **Details:** Security definer helper RPC for resolving authenticated user profile context safely.

### 6. `20260715120000_harden_core_acl_defaults.sql`
- **Local Source:** PRESENT
- **DEV/DEMO Apply:** VERIFIED APPLIED (committed as `846894e`, applied manually under `ZAM-SEC-ACL-001`)
- **Verification:** CATALOG VERIFIED (authenticated SELECT-only posture on core tables, trigger function EXECUTE revoked)
- **Remote History:** NOT CLAIMED
- **Details:** Core table/view ACL least-privilege hardening and default privilege revocation for public/anon roles.

### 7. `20260716120000_companies_mvp_schema_rpc.sql`
- **Local Source:** PRESENT
- **DEV/DEMO Apply:** VERIFIED APPLIED (first apply failed with 42P13 parameter order defect; transaction rolled back; corrected script `6acc2e34` re-applied successfully)
- **Verification:** RUNTIME SMOKED (8 catalog objects verified; application list/create/detail/edit wired; Owner + Support Helper runtime smoke PASSED)
- **Remote History:** NOT CLAIMED
- **Details:** Companies MVP schema enforcement (`chk_companies_phone_normalized`, `idx_companies_account_norm_name_active`) and RPCs (`list_companies`, `get_company`, `create_company`, `update_company`).

### 8. `20260716160000_projects_mvp_schema_rpc.sql`
- **Local Source:** PRESENT
- **DEV/DEMO Apply:** VERIFIED APPLIED (applied manually under `ZAM-PROJECTS-001`)
- **Verification:** PARTIALLY VERIFIED (installed 5 Projects RPCs; search-length and Company locking defects resolved in follow-up migration)
- **Remote History:** NOT CLAIMED
- **Details:** Projects MVP consistency hardening and RPCs (`list_projects`, `get_project`, `create_project`, `update_project`, `transition_project_status`).

### 9. `20260716170000_projects_mvp_rpc_corrections.sql`
- **Local Source:** PRESENT
- **DEV/DEMO Apply:** VERIFIED APPLIED (applied manually under commit `dc03784d`)
- **Verification:** CATALOG VERIFIED (search length token bound fixed; Company `FOR SHARE` and Project `FOR UPDATE` locks verified)
- **Remote History:** NOT CLAIMED
- **Details:** Corrects search-length validation and parent company concurrency locking in Projects RPCs.

### 10. `20260717120000_respondents_mvp_schema_rpc.sql`
- **Local Source:** PRESENT
- **DEV/DEMO Apply:** VERIFIED APPLIED (applied manually under `ZAM-RESPONDENTS-*`)
- **Verification:** RUNTIME SMOKED (Respondents schema and RPCs verified; application CRUD wired under `/respondents*`; Support Helper UI smoke PASSED)
- **Remote History:** NOT CLAIMED
- **Details:** Respondents MVP schema enforcement (unique mobile partial index) and product RPCs.

### 11. `20260718120000_participation_assign_rpcs.sql`
- **Local Source:** PRESENT
- **DEV/DEMO Apply:** VERIFIED APPLIED (applied manually under `ZAM-PARTICIPATION-ASSIGN-SCHEMA-RPC-MIGRATION-1`)
- **Verification:** CATALOG VERIFIED (`create_participation`, `check_respondent_three_month_warning`, `list_project_participations` RPCs verified)
- **Remote History:** NOT CLAIMED
- **Details:** Participation assignment RPCs with 3-month warning checks and non-blocking duplicate alerts.

### 12. `20260719120000_projects_free_text_domain.sql`
- **Local Source:** PRESENT
- **DEV/DEMO Apply:** VERIFIED APPLIED (applied manually under `ZAM-PROJECT-FREE-TEXT-DOMAIN-1`)
- **Verification:** CATALOG VERIFIED (`chk_projects_domain` constraint 1..120 trimmed chars & RPC updates verified)
- **Remote History:** NOT CLAIMED
- **Details:** Replaces structured project domain constraint with arbitrary trimmed nonblank free-text contract (1..120 chars).

### 13. `20260723120000_forms_collections_schema.sql`
- **Local Source:** PRESENT
- **DEV/DEMO Apply:** VERIFIED APPLIED (applied manually under `ZAM-FORMS-COLLECTIONS-BACKEND`)
- **Verification:** CATALOG VERIFIED (5 core tables: `research_forms`, `collections`, `collection_allocation_revisions`, `collection_allocations`, `idempotency_keys`)
- **Remote History:** VERIFIED REGISTERED (registered in remote `supabase_migrations` history via `npx supabase migration repair`; commit `5c390947`)
- **Details:** Forms & Collections Backend Schema Slice 1.

### 14. `20260723130000_forms_collections_rls_views.sql`
- **Local Source:** PRESENT
- **DEV/DEMO Apply:** VERIFIED APPLIED (applied manually)
- **Verification:** CATALOG VERIFIED (FORCE RLS, 4 Owner policies, 2 security-invoker views `form_financial_summary`, `collection_summary`)
- **Remote History:** VERIFIED REGISTERED (registered in remote `supabase_migrations` history via `npx supabase migration repair`)
- **Details:** Forms & Collections Backend Schema Slice 2.

### 15. `20260723140000_forms_collections_rpcs.sql`
- **Local Source:** PRESENT
- **DEV/DEMO Apply:** VERIFIED APPLIED (applied manually)
- **Verification:** CATALOG VERIFIED (7 Owner-gated mutation RPCs including `submit_research_form`, `review_research_form`, `create_collection_receipt`)
- **Remote History:** VERIFIED REGISTERED (registered in remote `supabase_migrations` history via `npx supabase migration repair`)
- **Details:** Forms & Collections Backend Schema Slice 3.

### 16. `20260723150000_fix_form_financial_summary_active_allocations.sql`
- **Local Source:** PRESENT
- **DEV/DEMO Apply:** VERIFIED APPLIED (applied manually)
- **Verification:** CATALOG VERIFIED (corrective view fix filtering active collection allocations)
- **Remote History:** VERIFIED REGISTERED (registered in remote `supabase_migrations` history via `npx supabase migration repair`)
- **Details:** Fixes `form_financial_summary` to filter active allocations and exclude voided receipts from receivables.

### 17. `20260723160000_restore_authenticated_current_account_id_execute.sql`
- **Local Source:** PRESENT
- **DEV/DEMO Apply:** VERIFIED APPLIED (applied manually on DEV/DEMO)
- **Verification:** CATALOG VERIFIED (`GRANT EXECUTE ON FUNCTION public.current_account_id() TO authenticated` verified)
- **Remote History:** NOT CLAIMED
- **Details:** Restores authenticated EXECUTE grant on `public.current_account_id()` to allow RLS policy evaluation during queries.

### 18. `20260723170000_enforce_one_research_form_per_participation.sql`
- **Local Source:** PRESENT
- **DEV/DEMO Apply:** VERIFIED APPLIED (applied manually on DEV/DEMO)
- **Verification:** CATALOG VERIFIED (unique partial index `idx_rf_unique_participation` verified; `submit_research_form` hardcodes `attempt_number = 1`)
- **Remote History:** NOT CLAIMED
- **Details:** Enforces strict 1:1 data invariant between participations and research forms across all review statuses (`idx_rf_unique_participation`). Includes data-safety abort guard checking for duplicate forms prior to index creation.

### 19. `20260730102500_fix_review_form_price_lookup.sql`
- **Local Source:** PRESENT
- **DEV/DEMO Apply:** VERIFIED APPLIED (applied manually on DEV/DEMO)
- **Verification:** CATALOG VERIFIED (`review_research_form` RPC definition updated to use `participation_pricing.price_snapshot` and `project_financial_settings.price_per_accepted_form`; missing-column error 42703 resolved)
- **Remote History:** VERIFIED REGISTERED (registered as applied via `npx supabase migration repair 20260730102500 --status applied --linked`)
- **Details:** Corrects price lookup column identifiers in form review RPC. During verification testing, form acceptance returned `accepted_price_unavailable` because the tested participation lacked configured pricing setup. Full manual form-acceptance runtime is not claimed.

---

## Non-Migration Live Database Repairs (DEV/DEMO Only)

- **`public.audit_trigger_func()` Live Repair:**
  - **Type:** Live database function patch (Not a repository migration SQL file).
  - **DEV/DEMO Apply:** VERIFIED APPLIED (authorized apply under `ZAM-RESPONDENTS-CREATE-TRIGGER-AUDIT-FUNCTION-APPLY-1`).
  - **Verification:** CATALOG VERIFIED & RUNTIME SMOKED (audit `reason` CASE uses `v_new ->> 'review_correction_reason'`; OID 17919, SECURITY DEFINER; UI respondent create smoke PASSED).
  - **Boundary:** DEV/DEMO live catalog patch only. A future repository migration file may capture this function for version-controlled portability.
