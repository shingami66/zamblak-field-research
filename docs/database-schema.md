# Database Schema Direction

- `accounts` is tenant root
- `account_id` is tenant boundary
- all business tables reference `accounts(id)`
- `projects` is operational only
- `project_financial_settings` is Owner-only
- `participations` is operational only
- `participation_pricing` is Owner-only
- `payments` is Owner-only
- `audit_log` is trigger-backed and client-immutable
- `account_id` consistency triggers are required
- direct client UPDATE on `participations`, `companies`, `projects`, and `respondents` must be denied to prevent state-smuggling
- operational updates must go through controlled RPC/server actions
- `price_snapshot` should not be overwritten on re-acceptance unless Owner runs a separate repricing action with reason and audit
- changing accepted to non-accepted after payments exist requires `review_correction_reason`
- respondents unique mobile index must be partial where `deleted_at` is null
- normalized mobile format is 9665xxxxxxxx
- data retained indefinitely by default, with soft delete/archive

## Status
- **Initial Core Schema Applied**: Defined in `supabase/migrations/202607060001_zamblak_core_schema.sql`. Contains 10 base tables, triggers, helper functions, and two security-invoker views (`project_operational_summary` and `project_financial_summary`). RLS is enabled on all tables. Hardened under FIX-5 and FIX-6. Applied manually via Supabase SQL Editor on target `gdegnwglakyblnmxgiwx` in Northeast Asia (ap-northeast-1).
- **Participation Project-State Enforcement Applied**: `supabase/migrations/202607130001_participation_project_state_guard.sql` was committed and pushed in `0d48fe8ed2d67b2f923a44b59f52a6dab0010577`, then manually applied by Mozfer to the designated currently empty DEV/DEMO database for project `gdegnwglakyblnmxgiwx`. Post-apply verification confirmed `public.enforce_participation_project_state()`, trigger `trg_participation_00_project_state_guard`, `SECURITY DEFINER SET search_path = public`, revoked direct execution for `PUBLIC`, `anon`, and `authenticated`, and preservation of the existing unique index and account-consistency trigger.
- **Participation Membership Write Invariant**: `INSERT`, project reassignment, respondent reassignment creating a new membership, and soft-delete restore require an existing `active`, non-deleted project. Missing, deleted, draft, closed, and cancelled projects fail closed. The guard uses a `FOR SHARE` project-row lock and stable errors `project_not_found`, `project_deleted`, and `project_not_active`. Ordinary non-membership updates and soft deletion remain outside this guard.
- **Verification Boundary**: A controlled zero-UUID missing-project dry-run failed through the expected `project_not_found` path and persisted no test row; no cleanup was required. This records manual database evidence only. It does not claim browser smoke, live application authorization, live concurrency testing, customer production readiness, or Supabase migration-history registration.
- **Role-Safe Read Surfaces Applied (ZAM-WF-001F)**: `supabase/migrations/202607130002_role_safe_read_surfaces.sql` (SHA-256 `AE01C67A188E188533769E946C4965878975381B0E5CB1AF750431028F56EC8D`) was prepared, frozen, and manually applied by Mozfer to designated DEV/DEMO project `gdegnwglakyblnmxgiwx`. Read-only post-apply verification passed for **11** managed functions, **2** managed views, and **23** managed policies.
- **Read-Surface Contract**: Owner base-table SELECT remains owner-only for current permitted rows. Support Helper database access is limited to four support-safe `SECURITY DEFINER` RPCs (`support_participation_operational_rows`, `support_profile_directory`, `support_project_participation_summary`, `support_project_directory`) and must not receive broad base-table reads, pricing, payments, financial-summary visibility, or unapproved sensitive fields.
- **Managed Manifest Evidence**: Final DEV/DEMO managed-manifest MD5 `f950c7ec5024dcf907d36f02df8c78b4`, octets `8238`. Post-apply verification also confirmed fixed `search_path`, EXECUTE ACLs, view structure/dependencies/ACLs, policy identities/expressions, core-table SELECT ACL contract, preserved project-state guard and unique respondent-per-project index, and expected RLS state.
- **Read-Surface Boundary**: DEV/DEMO database evidence only. No browser smoke, live application authorization, customer production readiness, or Supabase migration-history registration is claimed. Residual non-SELECT privileges (for example `MAINTAIN`, `REFERENCES`, `TRIGGER`, `TRUNCATE`) remain a separate deferred security follow-up.
