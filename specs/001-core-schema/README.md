# 001 Core Schema

## Migration Draft Summary
The core schema draft has been created in `supabase/migrations/202607060001_zamblak_core_schema.sql`.

### Table Summary
1. `accounts` - Tenant base table.
2. `profiles` - Account users with roles (`owner`, `support_helper`). Unique active owner restriction per account.
3. `companies` - Client list.
4. `projects` - Study configurations. Strictly operational; no pricing or payout fields.
5. `project_financial_settings` - Owner-only price settings per project.
6. `respondents` - Core registry. Unique `normalized_mobile` per account.
7. `participations` - Respondent's link to project. Operational only. No direct client updates permitted.
8. `participation_pricing` - Owner-only participation price snapshot (immutable on status changes unless explicitly reset).
9. `payments` - Owner-only payouts.
10. `audit_log` - Immutable trigger-driven history log.

### Core Safeguards Implemented
- **Financial Isolation**: Separate financial settings and transaction pricings.
- **Account Consistency Triggers**: Ensures all child records (companies, projects, settings, participations, pricing, payments) share the identical `account_id` as their parents.
- **Review Status Transition Logic**: Lock mechanisms when payments exist, automatic creation of payable transaction pricings on acceptance, and status date markers.
- **Row Level Security (RLS)**: Policies mapping to `is_owner()` and `is_support_helper()`. Support helpers are prevented from viewing or modifying financial tables and views.
- **Client Immutability**: Direct client updates to `participations` are rejected. Write access to `audit_log` is denied for client queries and handled by triggers.

## Unresolved Review Notes
- **Initial Profile Bootstrap**: How will the first account and owner profile be registered? (Likely via database triggers off `auth.users`).
- **Archive Policy Details**: Clarification on archiving rules/triggers for respondents when `deleted_at` is set.

## Update (ZAMBLAK-MIGRATION-001-SQL-FIX-4)
- SQL draft fixed after Cloud Team Lead returned HOLD due to trigger fail-open security issues (SECURITY INVOKER triggers querying RLS-protected tables).
- All 7 trigger functions updated to `SECURITY DEFINER SET search_path = public`.
- Account consistency triggers updated to implement fail-closed validations checking if parent keys exist and performing NULL-safe `IS DISTINCT FROM` comparisons.
- Restored additional neutral field assertions in `ins_participations` policy.
- Added explicit trigger execution ordering documentation for `BEFORE` triggers on `participations`.
- The core migration was manually applied to the designated DEV/DEMO database. The later participation project-state enforcement migration `supabase/migrations/202607130001_participation_project_state_guard.sql` was also manually applied and post-apply verified.
- The project-state guard requires active, non-deleted projects for participation membership-creating writes and preserves the existing partial unique index and account-consistency trigger.
- A controlled missing-project dry-run produced the expected failure and persisted no test row.
- Supabase migration-history registration is not claimed because the migration was applied manually.
- Bootstrap/auth trigger for first account/profile remains deferred to a future auth/bootstrap migration or manual dev SQL.
