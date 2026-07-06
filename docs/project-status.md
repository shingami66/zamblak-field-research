# Project Status

Current phase: Core Schema Applied & LeanCTX Protocol Active
Next task: ZAMBLAK-STITCH-V3-HANDOFF-INVENTORY-1 (Stitch V3 Handoff Inventory)

## Current Activity
- LeanCTX protocol established at [docs/leanctx.md](file:///d:/Zamblak/Zamblak-field-research/docs/leanctx.md) and active for all future agent tasks.
- Future Stitch/UI/frontend tasks must reference and adhere to [docs/leanctx.md](file:///d:/Zamblak/Zamblak-field-research/docs/leanctx.md).
- Stitch output is restricted to a visual reference only; Stitch-generated HTML/CSS must not be copied or imported into the repository source.
- Migration `202607060001_zamblak_core_schema.sql` successfully applied manually to Dev DB.
- Target Dev DB details:
  - Project Ref: `gdegnwglakyblnmxgiwx`
  - Region: `ap-northeast-1` (Northeast Asia / Tokyo)
  - Method: Supabase SQL Editor inside explicit `BEGIN/COMMIT` transaction.
- Verification passed: 10 core tables exist with RLS enabled, key `SECURITY DEFINER` functions exist with `search_path=public`, `current_profile_role` verified, operational/financial views exist, and RLS policies exist.
- Warning: Do not rerun this migration on the same Dev DB. Future CLI-based migrations must account for this manual apply history (i.e. by bootstrapping/marking applied) to avoid conflicts during `db push` or `migration up`.
