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
- Live authentication follow-ups after the Supabase runtime client foundation (`ZAM-AUTH-001A`) and the recorded MVP access policy (`ZAM-AUTH-001B`, `INVITATION_OR_ADMIN_SEED_ONLY`): session refresh via Next.js 16 `proxy.ts`; login/logout; auth UX method confirmation before login implementation; fail-closed missing/inactive/deleted profile UX; replacement of `mockRole`; protected routes; invitation flow implementation; generated Supabase Database TypeScript types; first domain slice; Support Helper RPC application integration; Mozfer-owned browser smoke. Do not treat client-factory presence or access-policy documentation as authentication complete.
- First-owner bootstrap **design** is the next auth task (`ZAM-AUTH-001C-FIRST-OWNER-BOOTSTRAP-DESIGN-1`, not started). Bootstrap **implementation**, mechanism selection, and exposure surface remain deferred until design approval. Binding constraints already recorded: one-time controlled administrative bootstrap only; not available through public or normal application routes; disabled or unusable after the first active Owner.
- Sole-Owner recovery: deferred separate design (not part of MVP access policy recording).
- Future controlled new-tenant self-provisioning (long-term product direction only): a separately approved future onboarding program may allow a verified new researcher to create a brand-new tenant/account and become its initial Owner through controlled server-side atomic provisioning, with email verification, abuse controls, recovery design, and explicit rate limiting. **Not** current MVP. **Not** implemented. **Not** approved for implementation. Must never allow joining an existing account without invitation, creating an Owner inside an existing account, arbitrary role selection, or browser exposure of service-role credentials.
