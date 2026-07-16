# Project Roadmap

- Phase 0: Bootstrap
- Phase 1: Core Schema
  - Participation project-state enforcement: completed in source, manually applied to designated DEV/DEMO, and post-apply verified.
  - Role-safe Owner / Support Helper read surfaces: migration prepared, manually applied to designated DEV/DEMO, and post-apply verified.
  - Core database ACL and default-privilege hardening (`ZAM-SEC-ACL-001`): **CLOSED** for designated DEV/DEMO. Migration `20260715120000_harden_core_acl_defaults.sql` committed/pushed as `846894e`, manually applied, catalog-verified, Owner-smoked. Residual non-SELECT client privileges on core tables/views and open `postgres` defaults are no longer pending for those surfaces.
- Phase 2: Auth + Shell
  - Role-aware empty Dashboard Shell slice: completed.
  - Supabase runtime client foundation (`ZAM-AUTH-001A`): closed and pushed.
  - MVP access policy (`ZAM-AUTH-001B`): recorded as `INVITATION_OR_ADMIN_SEED_ONLY`.
  - First-Owner bootstrap (`ZAM-AUTH-001C`): repository complete and verified on designated DEV/DEMO; bootstrap path consumed there. Production readiness is not claimed.
  - Live login, session, and authenticated shell milestone (`ZAM-AUTH-001D`): **CLOSED**. Application committed and pushed as `74ceca7 feat(auth): add protected sessions and role-aware shell`. Documentation committed and pushed as `9a140d8` and `ee44d66`. `/projects` and Owner-only `/financials` remain navigation-safety placeholders only (no domain data). **Companies** is no longer a placeholder — see Phase 3.
- Phase 3: Companies (**MVP CRUD CLOSED on DEV/DEMO**)
  - **Status:** Mozfer-approved lean Companies MVP contract and deferred-work register (`DWR-COMP-001`–`DWR-COMP-028`). Live catalog (`DWR-COMP-026`) **PASS**. Schema/RPC design complete. Migration source complete. **DEV/DEMO database apply complete**. **Application contracts complete**. **List / create / detail / edit pages complete**. **Visual foundation polish complete** (`aa2f6b4`). **Owner manual smoke PASS**. **Support Helper same-account runtime smoke PASS**. **Finance-blind Support Helper UI PASS**. **Safe duplicate-name handling PASS**. **Companies MVP CRUD phase closed** for designated DEV/DEMO evidence only.
  - **Not claimed:** production readiness; cross-account runtime isolation PASS; delete/restore/lifecycle; project CRUD.
  - **Approved MVP boundaries (summary):** operational fields only (`name`, `contact_person`, `phone`, `notes`); active-only list (no delete/restore UI); Support Helper finance-blind; create/edit via Server Action → authenticated RPC; offset pagination; operational project counts; routes `/companies`, `/companies/new`, `/companies/[id]`, `/companies/[id]/edit`.
  - **Completed sequence:**
    1. Mozfer contract + deferred-register approval (done)
    2. Companies contract + deferred-work documentation sync (done)
    3. Graphify refresh + freshness review as part of authorized closeouts (done)
    4. Core ACL hardening (`ZAM-SEC-ACL-001`) (done)
    5. Live DEV/DEMO catalog verification (`DWR-COMP-026`) — **done (PASS)**
    6. Schema/RPC design — **done**
    7. Migration draft + param-order fix (`f503c7ef`, `6acc2e34`) — **done**
    8. DEV/DEMO apply + object verification — **done (PASS)**
    9. Application contracts / Server Actions / UI (list, create, detail, edit) — **done**
    10. Visual foundation polish (`aa2f6b4`) — **done**
    11. Owner + Support Helper runtime smoke + docs closeout (`ZAM-COMPANIES-MANUAL-SMOKE-CLOSE-1`) — **done (PASS / closed)**
  - Deferred Companies items and permanent non-goals: see `docs/deferred-decisions.md` (Companies register). Cross-account runtime security smoke remains deferred and non-blocking.
- Phase 4: Projects (**schema/RPC verified; contracts complete; list page complete; create not started**)
  - Design: `docs/projects-schema-rpc-design.md`.
  - Source: `20260716160000_projects_mvp_schema_rpc.sql` (`1cb9a75`) + corrections `20260716170000_projects_mvp_rpc_corrections.sql` (`dc03784`).
  - DEV/DEMO apply (Mozfer, `gdegnwglakyblnmxgiwx`, PG 17.6): initial apply success → verification **HOLD** → correction apply success → final verify **PASS**.
  - Application contracts complete; list UI complete (`86f898f feat(projects): add list page`).
  - Soft-deleted Company gap, transition Company lock, and search token defect **closed live**.
  - **Next product task:** `ZAM-PROJECTS-CREATE-PAGE-1` → detail/edit → smoke.
  - Production readiness not claimed.
- Brand / loading mark (cross-cutting, design only)
  - Design freeze: `docs/brand-loading-mark-design.md` (`ZAM-BRAND-LOADING-MARK-DESIGN-1`).
  - Implementation **not** started (`ZAM-BRAND-LOADING-MARK-IMPLEMENT-1` later).
  - Does **not** replace the next Projects product task.
- Phase 5: Respondent Registry
- Phase 6: Participation
- Phase 7: Review
- Phase 8: Financials
- Later: WhatsApp workflow, Excel import/export, and further UI polish.

Required product sequence: **Company → Project → Respondent → Participation → Review → Financials**.

Completed database enforcement milestones:

- `ZAM-WF-001E-PARTICIPATION-PROJECT-STATE-ENFORCEMENT`: active, non-deleted project guard applied and verified in designated DEV/DEMO. Migration-history registration, live concurrency testing, and production readiness remain unclaimed.
- `ZAM-WF-001F-RLS-READ-SURFACE`: role-safe read surfaces manually applied and post-apply verified in designated DEV/DEMO (11 managed functions, 2 managed views, 23 managed policies; manifest MD5 `f950c7ec5024dcf907d36f02df8c78b4`). Customer production readiness and migration-history registration remain unclaimed.
- `ZAM-SEC-ACL-001-HARDENING`: core table/view least-privilege ACLs, named trigger-function EXECUTE revoke, and `postgres` GLOBAL + public default-privilege hardening applied and verified in designated DEV/DEMO (`20260715120000_harden_core_acl_defaults.sql`, commit `846894e`). Authenticated SELECT remains intentional; support access remains via bounded RPCs where designed; `service_role` has no direct core relation privileges; `supabase_admin` defaults intentionally out of scope. Migration-history registration and production readiness remain unclaimed.
- `ZAM-COMPANIES-001` schema/RPC apply: `20260716120000_companies_mvp_schema_rpc.sql` applied and object-verified on designated DEV/DEMO; application MVP CRUD wired and Mozfer-smoked (DEV/DEMO only). Production readiness unclaimed.
