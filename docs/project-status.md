# Project Status

Current phase: Core Schema Applied
Next task: ZAMBLAK-MIGRATION-001-SMOKE-TEST (Post-apply Verification/Smoke Planning)

## Current Activity
- Migration `202607060001_zamblak_core_schema.sql` successfully applied manually to Dev DB.
- Target Dev DB details:
  - Project Ref: `gdegnwglakyblnmxgiwx`
  - Region: `ap-northeast-1` (Northeast Asia / Tokyo)
  - Method: Supabase SQL Editor inside explicit `BEGIN/COMMIT` transaction.
- Verification passed: 10 core tables exist with RLS enabled, key `SECURITY DEFINER` functions exist with `search_path=public`, `current_profile_role` verified, operational/financial views exist, and RLS policies exist.
- Warning: Do not rerun this migration on the same Dev DB. Future CLI-based migrations must account for this manual apply history (i.e. by bootstrapping/marking applied) to avoid conflicts during `db push` or `migration up`.
