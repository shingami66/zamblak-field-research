# Project Roadmap

- Phase 0: Bootstrap
- Phase 1: Core Schema
  - Participation project-state enforcement: completed in source, manually applied to designated DEV/DEMO, and post-apply verified
  - Role-safe owner / support-helper read surfaces: migration prepared, manually applied to designated DEV/DEMO, and post-apply verified
- Phase 2: Auth + Shell
  - Role-aware Dashboard Shell slice: completed
  - Supabase runtime client foundation (`@supabase/ssr` browser + request-scoped server factories, public env contract): **CLOSED** — implementation, docs correction, push, and final verification PASS (`567c021` → `130637e` → `8da92f7`). Provides only environment validation and browser/server client factories; live authentication has not started
  - MVP access policy decision (`ZAM-AUTH-001B`): **RECORDED** — binding policy `INVITATION_OR_ADMIN_SEED_ONLY`. Public self-service signup and arbitrary account creation are disabled for MVP. User-selected role and user-created Owner are prohibited. First Owner is one-time controlled administrative bootstrap only (not via public/normal app routes; disabled or unusable after first active Owner). Support Helper onboarding is authorized Owner or controlled administrative creation only; self-registration and role escalation are prohibited. Runtime role authority is server-resolved profile/account membership under RLS; `mockRole` has no authority. Service-role never in browser or normal user-session paths. Sole-Owner recovery remains a deferred separate design.
  - Long-term product direction (not MVP; not implemented; not approved for implementation): a future separately approved program may allow a verified new researcher to create a brand-new tenant/account and become its initial Owner via controlled server-side atomic provisioning, with email verification, abuse controls, recovery design, and rate limiting. Existing-account self-join without invitation, Owner creation inside an existing account, and arbitrary role selection remain prohibited.
  - Next bounded auth activity: `ZAM-AUTH-001C-FIRST-OWNER-BOOTSTRAP-DESIGN-1` (not started) — design the one-time controlled administrative first-Owner bootstrap; do not select or implement the mechanism until that design task
  - Live auth, session refresh (Next.js Proxy), mockRole replacement, login/logout, protected routes, invitation flow, bootstrap implementation, and runtime role enforcement: deferred
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
