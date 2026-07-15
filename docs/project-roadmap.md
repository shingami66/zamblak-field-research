# Project Roadmap

- Phase 0: Bootstrap
- Phase 1: Core Schema
  - Participation project-state enforcement: completed in source, manually applied to designated DEV/DEMO, and post-apply verified.
  - Role-safe Owner / Support Helper read surfaces: migration prepared, manually applied to designated DEV/DEMO, and post-apply verified.
- Phase 2: Auth + Shell
  - Role-aware empty Dashboard Shell slice: completed.
  - Supabase runtime client foundation (`ZAM-AUTH-001A`): closed and pushed. It established the public-environment contract and browser/request-scoped server client factories.
  - MVP access policy (`ZAM-AUTH-001B`): recorded as `INVITATION_OR_ADMIN_SEED_ONLY`; public signup, user-selected roles, and user-created Owners remain prohibited.
  - First-Owner bootstrap (`ZAM-AUTH-001C`): repository complete and verified on designated DEV/DEMO; the one-time bootstrap path is consumed there. Production readiness is not claimed.
  - Live login, session, and authenticated shell milestone (`ZAM-AUTH-001D`): **implementation complete; source/static reviews passed; Mozfer-owned manual smoke passed; application committed locally as `74ceca7 feat(auth): add protected sessions and role-aware shell`; documentation committed locally as `9a140d8 docs(auth): record protected session milestone`.** Local `main` is ahead of `origin/main` by two commits; no push has occurred. This milestone provides live email/password login, server-side Auth/session/profile/role resolution, Proxy cookie refresh, protected root access, authenticated `/login` redirect, the responsive branded login and shell, account menu, current-session local logout, and controlled `/companies`, `/projects`, and Owner-only `/financials` routes.
  - The controlled routes are navigation-safety placeholders only. They contain no fake domain data and do not complete Companies, Projects, or Financials permissions, workflows, or data integration.
  - Auth closure sequence: post-commit documentation-state correction, independent review, exact correction commit if approved, then push-only after explicit approval.
- Phase 3: Companies
  - **Next product milestone after Auth commit closure:** replace the controlled `/companies` placeholder with the real Companies domain slice.
- Phase 4: Projects
- Phase 5: Respondent Registry
- Phase 6: Participation
- Phase 7: Review
- Phase 8: Financials
- Later: WhatsApp workflow, Excel import/export, and UI polish.

Required product sequence: **Company → Project → Respondent → Participation → Review → Financials**.

Completed database enforcement milestones:

- `ZAM-WF-001E-PARTICIPATION-PROJECT-STATE-ENFORCEMENT`: active, non-deleted project guard applied and verified in designated DEV/DEMO. Migration-history registration, live concurrency testing, and production readiness remain unclaimed.
- `ZAM-WF-001F-RLS-READ-SURFACE`: role-safe read surfaces manually applied and post-apply verified in designated DEV/DEMO (11 managed functions, 2 managed views, 23 managed policies; manifest MD5 `f950c7ec5024dcf907d36f02df8c78b4`). Customer production readiness and migration-history registration remain unclaimed. Residual non-SELECT privilege cleanup remains deferred.
