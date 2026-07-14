# Project Roadmap

- Phase 0: Bootstrap
- Phase 1: Core Schema
  - Participation project-state enforcement: completed in source, manually applied to designated DEV/DEMO, and post-apply verified
  - Role-safe owner / support-helper read surfaces: migration prepared, manually applied to designated DEV/DEMO, and post-apply verified
- Phase 2: Auth + Shell
  - Role-aware Dashboard Shell slice: completed
  - Live auth, Supabase integration, and runtime role enforcement: deferred
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
