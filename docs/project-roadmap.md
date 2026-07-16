# Project Roadmap

- Phase 0: Bootstrap
- Phase 1: Core Schema
  - Participation project-state enforcement: completed in source, manually applied to designated DEV/DEMO, and post-apply verified.
  - Role-safe Owner / Support Helper read surfaces: migration prepared, manually applied to designated DEV/DEMO, and post-apply verified.
  - Core database ACL and default-privilege hardening (`ZAM-SEC-ACL-001`): **CLOSED** for designated DEV/DEMO. Migration `20260715120000_harden_core_acl_defaults.sql` committed/pushed as `846894e`, manually applied, six-section catalog-verified, Owner-smoked. Residual non-SELECT client privileges on core tables/views and open `postgres` defaults are no longer pending for those surfaces.
- Phase 2: Auth + Shell
  - Role-aware empty Dashboard Shell slice: completed.
  - Supabase runtime client foundation (`ZAM-AUTH-001A`): closed and pushed.
  - MVP access policy (`ZAM-AUTH-001B`): recorded as `INVITATION_OR_ADMIN_SEED_ONLY`.
  - First-Owner bootstrap (`ZAM-AUTH-001C`): repository complete and verified on designated DEV/DEMO; bootstrap path consumed there. Production readiness is not claimed.
  - Live login, session, and authenticated shell milestone (`ZAM-AUTH-001D`): **CLOSED**. Application committed and pushed as `74ceca7 feat(auth): add protected sessions and role-aware shell`. Documentation committed and pushed as `9a140d8` and `ee44d66`. Controlled `/companies`, `/projects`, and Owner-only `/financials` remain navigation-safety placeholders only (no domain data).
- Phase 3: Companies (**active product phase**)
  - **Status:** Mozfer-approved lean Companies MVP contract and deferred-work register (`DWR-COMP-001`–`DWR-COMP-028`). Contract documentation is on remote main. Live DEV/DEMO catalog verification (`DWR-COMP-026`) is **CLOSED (PASS)**. **Implementation has not started** (no Companies migration or domain RPC). Core ACL hardening is closed.
  - **Approved MVP boundaries (summary):** operational fields only (`name`, `contact_person`, `phone`, `notes`); active-only list (no delete/restore UI); Support Helper finance-blind; SH reads via bounded support-safe RPCs; create/edit via Server Action → authenticated RPC; offset pagination; active project count on list; active/closed project sections on detail; routes `/companies`, `/companies/new`, `/companies/[id]`, `/companies/[id]/edit`.
  - **Required sequence before any Companies implementation:**
    1. Mozfer contract + deferred-register approval (done)
    2. Companies contract + deferred-work documentation sync, review, commit, push (done)
    3. Graphify refresh + freshness review after Companies docs / ACL commits (done for ACL-era HEADs through `846894ed` / docs-close `9083d3e7` / later docs commits)
    4. Core ACL hardening design → SQL draft → DEV/DEMO apply → verify → commit → push (`ZAM-SEC-ACL-001`) (done)
    5. Live DEV/DEMO catalog verification (`docs/companies-live-catalog-verification.md` / `DWR-COMP-026`) — **done (PASS)**
    6. Schema/RPC design (`docs/companies-schema-rpc-design.md` / `ZAM-COMPANIES-SCHEMA-RPC-DESIGN-1`) — **recorded** (docs only; not implemented)
    7. Independent schema/RPC design review (if required) → migration draft (`ZAM-COMPANIES-SCHEMA-RPC-MIGRATION-1`) — **next**
    8. Migration review → DEV/DEMO apply/verify → app implementation only after gates pass
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
- `ZAM-WF-001F-RLS-READ-SURFACE`: role-safe read surfaces manually applied and post-apply verified in designated DEV/DEMO (11 managed functions, 2 managed views, 23 managed policies; manifest MD5 `f950c7ec5024dcf907d36f02df8c78b4`). Customer production readiness and migration-history registration remain unclaimed.
- `ZAM-SEC-ACL-001-HARDENING`: core table/view least-privilege ACLs, named trigger-function EXECUTE revoke, and `postgres` GLOBAL + public default-privilege hardening applied and verified in designated DEV/DEMO (`20260715120000_harden_core_acl_defaults.sql`, commit `846894e`). Authenticated SELECT remains intentional; support access remains via bounded RPCs; `service_role` has no direct core relation privileges; `supabase_admin` defaults intentionally out of scope. Migration-history registration and production readiness remain unclaimed.
