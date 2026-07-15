# Project Roadmap

- Phase 0: Bootstrap
- Phase 1: Core Schema
  - Participation project-state enforcement: completed in source, manually applied to designated DEV/DEMO, and post-apply verified.
  - Role-safe Owner / Support Helper read surfaces: migration prepared, manually applied to designated DEV/DEMO, and post-apply verified.
- Phase 2: Auth + Shell
  - Role-aware empty Dashboard Shell slice: completed.
  - Supabase runtime client foundation (`ZAM-AUTH-001A`): closed and pushed.
  - MVP access policy (`ZAM-AUTH-001B`): recorded as `INVITATION_OR_ADMIN_SEED_ONLY`.
  - First-Owner bootstrap (`ZAM-AUTH-001C`): repository complete and verified on designated DEV/DEMO; bootstrap path consumed there. Production readiness is not claimed.
  - Live login, session, and authenticated shell milestone (`ZAM-AUTH-001D`): **CLOSED**. Application committed and pushed as `74ceca7 feat(auth): add protected sessions and role-aware shell`. Documentation committed and pushed as `9a140d8` and `ee44d66`. Local `main` and `origin/main` aligned at `ee44d66`. Controlled `/companies`, `/projects`, and Owner-only `/financials` remain navigation-safety placeholders only (no domain data).
- Phase 3: Companies (**active product phase**)
  - **Status:** Mozfer-approved lean Companies MVP contract and deferred-work register (`DWR-COMP-001`–`DWR-COMP-028`). Documentation sync in progress. **Implementation has not started.**
  - **Approved MVP boundaries (summary):** operational fields only (`name`, `contact_person`, `phone`, `notes`); active-only list (no delete/restore UI); Support Helper finance-blind; SH reads via bounded support-safe RPCs; create/edit via Server Action → authenticated RPC; offset pagination; active project count on list; active/closed project sections on detail; routes `/companies`, `/companies/new`, `/companies/[id]`, `/companies/[id]/edit`.
  - **Required sequence before any Companies implementation:**
    1. Mozfer contract + deferred-register approval (done)
    2. Dedicated Companies contract + deferred-work documentation sync (current)
    3. Independent documentation review
    4. Exact documentation commit
    5. Independent commit review
    6. Graphify refresh
    7. Independent Graphify freshness review
    8. Live DEV/DEMO catalog verification (`ZAM-COMPANIES-001-LIVE-CATALOG-VERIFY-1` / `DWR-COMP-026`)
    9. Schema/RPC design task
    10. Independent schema/RPC design review
    11. Implementation only after design approval
  - Deferred Companies items and permanent non-goals: see `docs/deferred-decisions.md` (Companies register).
- Phase 4: Projects
  - After Companies MVP is implemented and closed under its gates.
- Phase 5: Respondent Registry
- Phase 6: Participation
- Phase 7: Review
- Phase 8: Financials
- Later: WhatsApp workflow, Excel import/export, and UI polish.

Required product sequence: **Company → Project → Respondent → Participation → Review → Financials**.

Completed database enforcement milestones:

- `ZAM-WF-001E-PARTICIPATION-PROJECT-STATE-ENFORCEMENT`: active, non-deleted project guard applied and verified in designated DEV/DEMO. Migration-history registration, live concurrency testing, and production readiness remain unclaimed.
- `ZAM-WF-001F-RLS-READ-SURFACE`: role-safe read surfaces manually applied and post-apply verified in designated DEV/DEMO (11 managed functions, 2 managed views, 23 managed policies; manifest MD5 `f950c7ec5024dcf907d36f02df8c78b4`). Customer production readiness and migration-history registration remain unclaimed. Residual non-SELECT privilege cleanup remains deferred.
