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
- **Initial Core Schema Draft**: Created in `supabase/migrations/202607060001_zamblak_core_schema.sql`. Contains 10 base tables, triggers, helper functions, and two security-invoker views (`project_operational_summary` and `project_financial_summary`). RLS is enabled on all tables. Hardened under FIX-5 to resolve INSERT-time OLD.review_status trigger evaluation hazards. Applied state is currently blocked pending Dev DB Apply Precheck.
