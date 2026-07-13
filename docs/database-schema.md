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
