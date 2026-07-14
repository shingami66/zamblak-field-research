# Project Roadmap

- Phase 0: Bootstrap
- Phase 1: Core Schema
  - Participation project-state enforcement: completed in source, manually applied to designated DEV/DEMO, and post-apply verified
  - Role-safe owner / support-helper read surfaces: migration prepared, manually applied to designated DEV/DEMO, and post-apply verified
- Phase 2: Auth + Shell
  - Role-aware Dashboard Shell slice: completed
  - Supabase runtime client foundation (`@supabase/ssr` browser + request-scoped server factories, public env contract): **CLOSED** — implementation, docs correction, push, and final verification PASS (`567c021` → `130637e` → `8da92f7`). Provides only environment validation and browser/server client factories; live authentication has not started
  - Next bounded auth activity: `ZAM-AUTH-001B-AUTH-ACCESS-POLICY-DECISION-1` (not started) — decide whether MVP allows any self-service registration, or Owner and Support Helper access is invitation-or-admin-seed only
  - Live auth, session refresh (Next.js Proxy), mockRole replacement, login/logout, protected routes, and runtime role enforcement: deferred
- Phase 3: Respondent Registry
- Phase 4: Projects + Participations
- Phase 5: WhatsApp workflow
- Phase 6: Review + Billing
- Phase 7: Excel import/export
- Phase 8: Stitch UI polish

Completed UI slice:
- `ZAMBLAK-UI-DASHBOARDS-SHELL-1` - role-aware empty Dashboard Shell with static owner/support_helper navigation split.

Completed database enforcement milestones:
- `ZAM-WF-001E-PARTICIPATION-PROJECT-STATE-ENFORCEMENT` - active, non-deleted project guard applied and verified in the designated DEV/DEMO database. Migration history registration, live application authorization, live concurrency testing, and production readiness remain unclaimed.
- `ZAM-WF-001F-RLS-READ-SURFACE` - role-safe read surfaces (11 managed functions, 2 managed views, 23 managed policies) manually applied and post-apply verified in the designated DEV/DEMO database. Evidence-exact managed manifest MD5 `f950c7ec5024dcf907d36f02df8c78b4` (8238 octets). Browser smoke, live application authorization, customer production readiness, and Supabase migration-history registration remain unclaimed. Residual non-SELECT privilege cleanup (for example `MAINTAIN` / `REFERENCES` / `TRIGGER` / `TRUNCATE`) remains a separate future security follow-up.
