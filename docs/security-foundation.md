# Security Foundation

## 1. Security authority and evidence boundary

- `account_id` is the mandatory tenant boundary.
- Row Level Security (RLS) remains mandatory; where established, RLS/FORCE RLS is authoritative.
- Browser-supplied account, role, ownership, pricing, or financial authority is **never** trusted.
- Server Actions and authenticated RPCs are the mutation boundaries where implemented.
- DEV/DEMO verification is **not** production readiness.
- Current security truth is governed by source, migrations, and the canonical documents:
  - [roles-permissions.md](./roles-permissions.md)
  - [product-requirements.md](./product-requirements.md)
  - [database-schema.md](./database-schema.md)
  - [database-migrations.md](./database-migrations.md)
  - [project-roadmap.md](./project-roadmap.md)
  - [deferred-decisions.md](./deferred-decisions.md)
- Historical milestone reports (e.g. [project-status.md](./project-status.md)) are evidence only, not current authority.

## 2. Authentication and session boundary

- Supabase Auth login route: `/login`.
- Session and authorization resolution are server-side; the Next.js Proxy refreshes Auth cookies and validates the user through `getUser()` on matched requests.
- Application profile/account authority is resolved through `public.resolve_current_profile()` via the `resolveCurrentProfile()` application helper.
- Missing, inactive, deleted, malformed, or unsupported profiles fail closed.
- Browser role labels, account IDs, profile IDs, redirects, and URL parameters are not authority.
- No service-role client is used in normal application flows (publishable credentials only).
- Logout ends only the current browser session (`signOut({ scope: "local" })`) and redirects to the fixed `/login` destination.
- Redirect destinations are server-controlled and fixed; no browser-supplied redirect authority is accepted.
- Multi-device session revocation and recovery workflows are not claimed beyond current-session logout.

## 3. Route and role boundary

- Current code recognizes `owner` and `support_helper`.
- `support_helper` is **legacy compatibility** and does not define future product design.
- The next V1 product-design direction is **Owner-first**.
- Future multi-researcher role names and permission matrices remain unresolved; no future roles are invented.
- `/financials` is Owner-only; non-Owner access redirects to `/forbidden`.
- `/financials` currently renders mock/demo data; it is not a live financial ledger or completed payment workflow.
- Support Helper remains finance-blind (no financial wording, route, or data exposure).

## 4. Current operational module boundaries

- Companies list/create/detail/edit are implemented through authenticated server/RPC boundaries.
- Projects list/create/detail/edit are implemented.
- Project lifecycle transitions (`transition_project_status`) remain Owner-only.
- Respondent Registry list/create/detail/edit are implemented.
- Participation assignment and three-month eligibility warning foundations exist.
- Account consistency and tenant scoping remain mandatory.
- Support Helper operational access remains bounded and finance-blind.

## 5. Research Form security and integrity

- Only Owner may submit live Research Forms (`submit_research_form`; Owner-gated).
- Exactly one persisted Research Form per Participation is enforced across all statuses through `idx_rf_unique_participation`.
- `submit_research_form` uses `attempt_number = 1`; duplicate insertion maps to `duplicate_participation`.
- Owner review foundations permit Accept and Reject in the visible UI.
- Browser-supplied price is forbidden.
- Accepted pricing is resolved authoritatively from server/database sources (`participation_pricing.price_snapshot`, then `project_financial_settings.price_per_accepted_form`).
- Acceptance fails closed with `accepted_price_unavailable` when usable pricing is absent; no silent `0.00` fallback.
- Successful acceptance writes `accepted_price_snapshot` as immutable historical evidence.
- No successful manual acceptance is claimed without valid pricing evidence.

## 6. Financial and Collections boundary

- Form financial-summary and Collections database/RPC foundations exist (Owner-gated).
- Owner holds exclusive financial authority.
- The Collections application UI remains prototype-only and `sessionStorage`-backed (namespace `zamblak.forms-prototype.v1`); it is not proof of server-backed payment recording.
- Live payment-recording UI and financial-report export are not fully implemented or runtime-accepted.
- No browser-supplied pricing or financial totals are authoritative.
- No silent `0.00` fallback is permitted for missing accepted-form pricing.

## 7. Database, RLS, ACL, and RPC boundary

- RLS/FORCE RLS where established remains authoritative; authenticated relation mutation privileges are not broadened.
- Sensitive writes use bounded RPCs; direct base-table mutation is denied by design.
- `SECURITY DEFINER` functions require safe `search_path` and explicit EXECUTE boundaries (authenticated-only; `PUBLIC`, `anon`, and `service_role` revoked where established).
- Account/profile authority is derived server-side (`current_account_id()`, `current_account_matches()`, `is_owner()`).
- Tenant/account consistency guards remain mandatory.
- Audit history is trigger-backed and client-immutable where established.
- Core ACL/default-privilege hardening under `20260715120000_harden_core_acl_defaults.sql` is **closed** for the designated DEV/DEMO evidence; residual non-SELECT core privilege cleanup is **not** deferred.
- `supabase_admin`-owned hosted default ACL limitations remain out of scope where documented (hosted project-owner limitation).
- Local migration source and remote migration-history registration are distinguished; registration is claimed only where documented. DEV/DEMO apply and catalog verification never imply production readiness.

## 8. Onboarding and account creation

- MVP access policy: `INVITATION_OR_ADMIN_SEED_ONLY`.
- Public signup and arbitrary account creation are prohibited; user-selected roles and user-created Owners are prohibited.
- The first-Owner bootstrap (`ZAM-AUTH-001C`) was a globally one-time, privileged (SQL-owner-only) operation consumed on the designated DEV/DEMO environment. It is not a browser path, recovery mechanism, or repeatable onboarding flow.
- Future tenant provisioning, invitation administration, and recovery remain separately designed work.

## 9. Current limitations and unverified security work

- Production readiness is not claimed.
- Cross-account runtime isolation acceptance is not claimed where evidence is incomplete.
- Full automated tenant-isolation coverage is not claimed.
- Collections and `/financials` application workflows are incomplete as noted above.
- Future multi-researcher role architecture remains unresolved.
- A physical Project Sample security model does not exist because Sample is not implemented.
