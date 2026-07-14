# Database Migrations

- Manual review-first migration policy.
- Plan → SQL Draft → Schema Review → Apply Dev DB → Verify → Implement → Smoke → Audit → Commit.
- No migration apply without explicit approval.

## Migration History
- `202607060001_zamblak_core_schema.sql` (Applied): Core schema foundation containing 10 tables, triggers, helper functions, and views. Applied manually on target `gdegnwglakyblnmxgiwx` via Supabase SQL Editor inside explicit `BEGIN/COMMIT`. Hardened via ZAMBLAK-MIGRATION-001-SQL-FIX-2, FIX-3, FIX-4 (fail-closed SECURITY DEFINER triggers), FIX-5 (safeguarded OLD.review_status trigger evaluation), and FIX-6 (current_profile_role renaming).
- `202607130001_participation_project_state_guard.sql` (Applied): Participation membership project-state guard. Committed/pushed in `0d48fe8ed2d67b2f923a44b59f52a6dab0010577`, manually applied to designated DEV/DEMO `gdegnwglakyblnmxgiwx`, and post-apply verified. Supabase migration-history registration is not claimed.
- `202607130002_role_safe_read_surfaces.sql` (Applied, DEV/DEMO): Role-safe owner and support-helper read surfaces under program `ZAM-WF-001F-RLS-READ-SURFACE`. Frozen snapshot SHA-256 `AE01C67A188E188533769E946C4965878975381B0E5CB1AF750431028F56EC8D` was manually applied once by Mozfer to designated DEV/DEMO `gdegnwglakyblnmxgiwx` with no SQL error. Read-only post-apply verification passed (`overall_verdict = PASS`) for 11 managed functions, 2 managed views, 23 managed policies, core-table SELECT ACLs, preserved project-state guard, unique respondent-per-project index, and expected RLS state. Managed manifest MD5 `f950c7ec5024dcf907d36f02df8c78b4` (8238 octets). Local verification-packet formatting corrections were required before the final evidence-exact PASS; those were packet issues, not database defects. Supabase migration-history registration, browser smoke, live application authorization, and customer production readiness remain unclaimed.
