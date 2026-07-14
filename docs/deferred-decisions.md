# Deferred Decisions

- PDF reports
- WhatsApp Business API
- FCM (Firebase Cloud Messaging)
- Offline mode
- Mobile app
- Advanced analytics
- SaaS billing
- Complex rules engine
- Refunds/adjustments
- Residual non-SELECT privilege cleanup after role-safe read surfaces (`ZAM-WF-001F`): privileges such as `MAINTAIN`, `REFERENCES`, `TRIGGER`, and `TRUNCATE` that may remain on residual catalog surfaces (including anon/service_role patterns) are intentionally out of scope for the completed read-surface program and require a separate future security follow-up. Do not fold this cleanup into completed 001F apply/verification claims.
- Live authentication follow-ups after the Supabase runtime client foundation (`ZAM-AUTH-001A`) and the recorded MVP access policy (`ZAM-AUTH-001B`, `INVITATION_OR_ADMIN_SEED_ONLY`): session refresh via Next.js 16 `proxy.ts`; login/logout; auth UX method confirmation before login implementation; fail-closed missing/inactive/deleted profile UX; replacement of `mockRole`; protected routes; invitation flow implementation; generated Supabase Database TypeScript types; first domain slice; Support Helper RPC application integration; Mozfer-owned browser smoke. Do not treat client-factory presence, access-policy documentation, or bootstrap **design** documentation as authentication complete.
- First-owner bootstrap **design** (`ZAM-AUTH-001C`): **APPROVED** (design-only). Canonical detail: `docs/first-owner-bootstrap-design.md`. Globally one-time deployment initialization (one account, one active Owner); privileged SQL-owner-only `SECURITY DEFINER` function; mandatory fixed transaction-scoped advisory lock; mandatory schema-qualified `auth.users` check; not public/app/`service_role` paths. **Implementation, SQL draft, migration, and DEV/DEMO apply are not started.** Exact advisory-lock form and numeric constants remain a mandatory SQL-draft requirement. Actual function-owner identity and authoritative `auth.users` read privilege must be verified at implement/apply. Post-success invocations must return `bootstrap_already_completed` only.
- Sole-Owner recovery: deferred separate design (not part of the approved bootstrap; historical Owner profiles fail closed and must not re-open bootstrap).
- Future controlled new-tenant self-provisioning (long-term product direction only): a separately approved future onboarding program may allow a verified new researcher to create a brand-new tenant/account and become its initial Owner through controlled server-side atomic provisioning, with email verification, abuse controls, recovery design, and explicit rate limiting. **Not** current MVP. **Not** implemented. **Not** approved for implementation. Outside the approved global one-time bootstrap. Must never allow joining an existing account without invitation, creating an Owner inside an existing account, arbitrary role selection, or browser exposure of service-role credentials.
