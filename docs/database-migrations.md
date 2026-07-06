# Database Migrations

- Manual review-first migration policy.
- Plan → SQL Draft → Schema Review → Apply Dev DB → Verify → Implement → Smoke → Audit → Commit.
- No migration apply without explicit approval.

## Migration History
- `202607060001_zamblak_core_schema.sql` (Draft only): Core schema foundation containing 10 tables, triggers, helper functions, and views. Not applied. Hardened via ZAMBLAK-MIGRATION-001-SQL-FIX-2, FIX-3, FIX-4 (fail-closed SECURITY DEFINER triggers), FIX-5 (safeguarded OLD.review_status trigger evaluation), and FIX-6 (current_profile_role renaming).
