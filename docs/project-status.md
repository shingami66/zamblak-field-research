# Project Status

Current phase: **Companies product phase** after closed Auth, closed core ACL hardening, closed live catalog verification (`DWR-COMP-026` PASS), and **recorded** schema/RPC design (`ZAM-COMPANIES-SCHEMA-RPC-DESIGN-1`). Companies MVP contract is **Mozfer-approved**. Companies UI remains a protected placeholder. **No Companies implementation has begun** (no Companies migration file, no CRUD RPC in database).

Next sequence: independent design review (if required by workflow) → SQL migration draft (`ZAM-COMPANIES-SCHEMA-RPC-MIGRATION-1`) → review → DEV/DEMO apply → verify/smoke → app implementation only after design/migration gates pass.

## Auth (`ZAM-AUTH-001D`) — CLOSED

- **Status:** closed, committed, and pushed.
- **Application commit:** `74ceca7 feat(auth): add protected sessions and role-aware shell`.
- **Documentation commits:** `9a140d8 docs(auth): record protected session milestone`; `ee44d66 docs(auth): sync post-commit milestone state`.
- **Manual runtime evidence:** Mozfer-owned smoke passed for real Owner login, redirects, session persistence after refresh, unauthenticated root protection, responsive login/dashboard layouts, desktop/mobile account menu behavior, logout, and controlled routes. Not agent-performed browser smoke.
- Production readiness is **not** claimed.

Implemented Auth behavior (still current):

- Live email/password login using the request-scoped Supabase server client and sanitized Arabic errors.
- Server-side Auth user validation and database-backed profile/account/role resolution for `owner` and `support_helper` only.
- Next.js Proxy session-cookie refresh.
- Protected `/`; unauthenticated access redirects to `/login`.
- Authenticated `/login` access redirects to `/`.
- Responsive branded login and authenticated dashboard shell; no fake dashboard metrics.
- Accessible desktop/mobile account menu; local-session logout to `/login`.
- Controlled authenticated placeholders for `/companies` and `/projects`.
- Controlled Owner-only `/financials` placeholder; Support Helper direct access redirects to `/` without financial wording or data.

## Security — core database ACL hardening (`ZAM-SEC-ACL-001`) — CLOSED (DEV/DEMO)

- **Status:** designed, SQL-draft reviewed, manually applied to designated DEV/DEMO, post-apply verified, Owner-smoked, committed, and pushed.
- **Migration:** `supabase/migrations/20260715120000_harden_core_acl_defaults.sql`.
- **Commit:** `846894e fix(security): harden core database ACLs` (`846894ed3ccfad21545a5f9e451814dbc8edfa16`).
- **Remote:** local `main` = `origin/main` = actual remote `main` at that SHA.
- **Apply surface:** Supabase SQL Editor on designated DEV/DEMO project `gdegnwglakyblnmxgiwx`, PostgreSQL **17.6**, session `current_user` = `postgres`. `MAINTAIN` privilege vocabulary supported.
- **Issue discovered:** residual client-role non-SELECT privileges (for example `TRUNCATE`, `REFERENCES`, `TRIGGER`, `MAINTAIN`) on core relations and open `postgres` default privileges after `ZAM-WF-001F` SELECT hardening. Classified as **P1** security posture before Companies implementation expanded the write surface.
- **Remediation:** least-privilege ACL hardening only (no RLS/policy rewrites, no Companies schema/RPC, no domain-row mutation).

### Verified post-apply outcomes (DEV/DEMO catalog)

1. **Relations:** 10 core tables and 2 managed views (`project_operational_summary`, `project_financial_summary`): `authenticated` **SELECT only**; `anon` no privileges; `service_role` no privileges; table owner `postgres`; RLS still enabled on all 10 tables.
2. **Trigger functions:** 10 named trigger functions: `PUBLIC` / `anon` / `authenticated` / `service_role` EXECUTE false; explicit ACLs materialized.
3. **Trigger preservation:** expected attachments **22**, actual **22**, missing none, unexpected none.
4. **Approved callable contracts:** nine approved helpers/RPCs remain **authenticated-only** (`resolve_current_profile`, four `support_*` RPCs, `is_owner`, `is_support_helper`, `current_account_matches`, `current_profile_matches`); `anon` / `PUBLIC` / `service_role` EXECUTE false.
5. **Internal functions:** `current_profile_id()`, `current_account_id()`, `current_profile_role()`, and `bootstrap_first_owner(uuid, text, text, text)` remain non-client-callable.
6. **Default privileges:** `postgres` **GLOBAL** and `IN SCHEMA public` defaults hardened for tables, sequences, and functions — no remaining client/`PUBLIC` automatic grants for those object types. **`supabase_admin` default ACLs were intentionally out of scope** and may still exist.

### Runtime smoke (Mozfer)

- Owner login: **PASS**
- Profile/session resolution (`resolve_current_profile`): **PASS**
- Dashboard/app shell: **PASS**
- Companies / Projects / Financials placeholders: **PASS**
- Support Helper runtime smoke: **NOT TESTED** (no Support Helper account available). Classified **deferred P2 / nonblocking** because the four support-safe RPC EXECUTE contracts were catalog-verified as authenticated-only.
- No business-row INSERT/UPDATE/DELETE smoke was performed for this milestone.

### Boundaries that remain true

- Evidence is **DEV/DEMO only**, never production readiness.
- Authenticated **SELECT** on core tables remains intentional and RLS-constrained.
- Support Helper domain access remains through **bounded support-safe RPCs**, not broad base-table SELECT.
- Normal runtime must not use `service_role` for direct core relation access.
- Future public objects require **explicit** privilege design (defaults no longer auto-expose client roles).
- No rollback or corrective migration was required after apply.

## Companies (`ZAM-COMPANIES-001`) — contract approved; catalog gate PASS; implementation not started

- **Contract:** Mozfer-approved lean Companies MVP (fields, phone, duplicates, lifecycle active-only, roles, RPC read/mutation, pagination, metrics, routes).
- **Deferred register:** `DWR-COMP-001` through `DWR-COMP-028` recorded in `docs/deferred-decisions.md`.
- **Application today:** `/companies` remains a protected placeholder (`requireAppSession` + empty pending module). No list, detail, create, edit, query, server action, Companies domain RPC, or fake company data.
- **Live catalog verification (`DWR-COMP-026`):** **CLOSED — PASS.** Mozfer manually ran the metadata-only packet in `docs/companies-live-catalog-verification.md` on designated DEV/DEMO `gdegnwglakyblnmxgiwx` (PostgreSQL **17.6**, session `postgres`). Reviewed: no HOLD conditions. Raw export reviewed, not claimed as a repository migration artifact. DEV/DEMO only; production readiness not claimed. No row counts, business data, runtime smoke, or Support Helper login evidence invented for this gate.
- **ACL remediation is closed.** Catalog gate closed. **Schema/RPC design is recorded** in `docs/companies-schema-rpc-design.md` (not implemented). Companies **implementation** still requires migration draft, review, DEV/DEMO apply, and app work under separate tasks.

### Schema/RPC design (`ZAM-COMPANIES-SCHEMA-RPC-DESIGN-1`) — RECORDED

- **Design doc:** `docs/companies-schema-rpc-design.md`.
- **Status:** implementation-ready design frozen in documentation only. **No migration created. No SQL applied. No app RPC wiring.**
- **Enforcement choices:** IMMUTABLE `normalize_company_name` + partial unique expression index; IMMUTABLE `normalize_company_phone` + phone CHECK; no new public columns.
- **RPCs (planned names):** `list_companies`, `get_company`, `create_company`, `update_company` — SECURITY DEFINER, `search_path=pg_catalog, public`, authenticated EXECUTE only; both Owner and Support Helper; finance-free return shape with active/completed project counts.
- **Concurrency:** required `p_expected_updated_at` on update → `stale_company_version`.
- **ACL:** keep authenticated SELECT-only; keep `sel_companies` Owner-only; no direct client mutation grants; SH reads via RPCs only.
- **Indexes (planned):** `idx_companies_account_norm_name_active`; `idx_projects_account_company_status_live`.
- **Next implementation task:** `ZAM-COMPANIES-SCHEMA-RPC-MIGRATION-1`.

### Live catalog highlights (DEV/DEMO; full detail in verification doc)

- `public.companies`: RLS on; authenticated **SELECT only**; columns match core set (no financial columns); PK only index; `trg_companies_updated_at` present; audit trigger absent.
- `projects.company_id` NOT NULL FK → `companies(id)` NO ACTION; status `draft|active|closed|cancelled`; account-consistency trigger/function present (SECURITY DEFINER, non-client-callable).
- `sel_companies` Owner-only non-deleted; `ins_companies` policy exists but authenticated has **no** INSERT privilege — policies alone do not authorize direct client mutation.
- No Companies CRUD RPC collision; support RPCs remain finance-blind, authenticated EXECUTE only.
- **Expected absences:** normalized active name uniqueness, phone norm/validation (future migration work).
- **Nonblocking design requirement:** project lookup/count index for company-scoped reads (none returned by packet).

### Approved Companies MVP summary (not runtime)

- Fields: `name` (required), `contact_person`, `phone`, `notes` (optional).
- Errors: `duplicate_company_name`, `invalid_company_phone`.
- Mutations: **Server Action → authenticated RPC** for create and edit only; no lifecycle RPC; no direct base-table UPDATE.
- Owner: server query helpers + RLS. Support Helper: bounded support-safe list/detail RPCs; finance-blind; no broad base-table SELECT.
- Metrics: active project count on list; active (`status = active`) and completed (`status = closed`, Arabic `مكتمل`) project sections on detail.
- Routes: `/companies`, `/companies/new`, `/companies/[id]`, `/companies/[id]/edit`.

## Auth security and authority boundary

- Role authority comes from the authenticated user's active, non-deleted database profile/account context, resolved server-side through the argument-free `resolve_current_profile()` RPC.
- Browser-supplied roles, account IDs, profile IDs, Auth UUIDs, and redirect targets are not accepted as authority.
- Missing, inactive, deleted, malformed, or unsupported profiles fail closed.
- The former `mockRole` source has been removed.
- No service-role client is used in browser or normal user-session paths.
- User-initiated logout uses explicit local scope. Financial route authorization is checked on the server.
- MVP onboarding remains `INVITATION_OR_ADMIN_SEED_ONLY`; public signup, arbitrary account creation, user-selected roles, and user-created Owners remain prohibited.

## Earlier Auth milestones

### `ZAM-AUTH-001A` — Supabase runtime client foundation (closed)

- Committed/pushed foundation introduced environment-name validation and browser/request-scoped SSR client factories using `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- Superseded for login/session by `ZAM-AUTH-001D`.

### `ZAM-AUTH-001B` — MVP access policy (recorded)

- Binding policy: `INVITATION_OR_ADMIN_SEED_ONLY`.
- Support Helper onboarding is authorized Owner or controlled administration only.

### `ZAM-AUTH-001C` — First-Owner bootstrap (repository + DEV/DEMO complete)

- Design: `docs/first-owner-bootstrap-design.md`.
- Migration applied and path consumed on designated DEV/DEMO. Production readiness unclaimed.

## Database enforcement status

### `ZAM-WF-001E` — Participation project-state enforcement

- Migration committed/pushed, manually applied by Mozfer to designated DEV/DEMO, and structurally verified.
- Participation creation and relevant membership/restore changes fail closed unless the project is active and non-deleted.

### `ZAM-WF-001F` — Role-safe read surface

- Mozfer manually applied the frozen migration to designated DEV/DEMO; post-apply packet passed.
- Verified inventory: 11 functions, 2 views, and 23 policies; managed manifest MD5 `f950c7ec5024dcf907d36f02df8c78b4` (8238 octets).
- Owner base-table SELECT remains Owner-scoped. Support Helper limited to four support-safe `SECURITY DEFINER` RPCs (no broad base-table, pricing, payment, or financial-summary access).
- Boundaries: DEV/DEMO database evidence only. Domain Companies RPCs are **planned under the approved contract**, not yet implemented.
- Residual non-SELECT privilege cleanup on the **core public tables, managed views, named trigger functions, and postgres default privileges** was completed later under `ZAM-SEC-ACL-001` (see above). That residual item is **closed** for those surfaces.

### `ZAM-SEC-ACL-001` — Core ACL and default-privilege hardening

- See **Security — core database ACL hardening** section above for full evidence and boundaries.

## Open work

- Independent design review of `docs/companies-schema-rpc-design.md` if required, then SQL migration draft (`ZAM-COMPANIES-SCHEMA-RPC-MIGRATION-1`).
- After migration review/apply/verify: implement Companies UI/Server Actions only under separate authorized tasks.
- Then Projects and remaining domain sequence.
- Deferred Support Helper **runtime** smoke for ACL milestone (P2/nonblocking; catalog EXECUTE contracts already verified).
- Deferred Auth admin: password recovery/change, invitation and Support Helper administration, Auth-user/profile relinking, account/profile settings, multi-device session controls, sole-Owner recovery.
- Residual platform note: `supabase_admin`-owned default ACLs remain intentionally out of scope (hosted project-owner limitation).
