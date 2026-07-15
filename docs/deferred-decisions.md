# Deferred Decisions

## Product and platform

- PDF reports.
- WhatsApp Business API.
- FCM (Firebase Cloud Messaging).
- Offline mode and a mobile app.
- Advanced analytics.
- SaaS billing.
- Complex rules engine.
- Refunds/adjustments.
- Generated Supabase Database TypeScript types.
- Residual non-SELECT privilege cleanup after `ZAM-WF-001F`, including any remaining `MAINTAIN`, `REFERENCES`, `TRIGGER`, or `TRUNCATE` grants on residual catalog surfaces.

## Auth and account administration after `ZAM-AUTH-001D`

- Password recovery.
- Authenticated password change.
- Invitation and Support Helper administration.
- Controlled Auth-user/profile relinking administration.
- Account and profile settings.
- Broader multi-device session viewing and revocation controls. Current logout intentionally ends only the current browser session.
- Sole-Owner recovery as a separately designed, fail-closed administrative workflow.

Deleting and recreating Auth users is **not** an approved recovery or relinking procedure. Any future recovery/relinking capability must be a controlled administrative design that preserves tenant, profile, audit, and authorization integrity.

## Domain modules after the controlled placeholders

- Replace `/companies` with the real Companies module; this is the next product milestone after Auth commit closure.
- Replace `/projects` with the real Projects module.
- Replace Owner-only `/financials` with the real Financials module and server-authorized data integration.
- Implement the remaining sequence: Company → Project → Respondent → Participation → Review → Financials.

The current `/companies`, `/projects`, and `/financials` pages are navigation-safety placeholders with no fake data. They are not completed domain pages or final domain permission implementations.

## Preserved onboarding deferrals

- First-Owner bootstrap (`ZAM-AUTH-001C`) is complete for repository and designated DEV/DEMO; the path is consumed there and must not be re-run.
- Customer production bootstrap/apply remains a separately authorized action when needed.
- Future controlled new-tenant self-provisioning is not MVP, not implemented, and not approved for implementation. It must never permit existing-account self-join, Owner creation in an existing account, arbitrary role selection, or browser service-role exposure.
