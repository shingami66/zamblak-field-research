# Project Status

Current phase: **Companies product phase** after closed Auth, closed core ACL hardening, closed live catalog verification (`DWR-COMP-026` PASS), complete schema/RPC design, complete migration source, and **successful DEV/DEMO apply** of Companies schema/RPC objects. Companies MVP contract is **Mozfer-approved**. Companies **UI remains a protected placeholder** — application wiring and Owner/Support Helper runtime smoke are **not** done. Production readiness is **not** claimed.

Next sequence: application-layer contracts and Server Actions/UI (`ZAM-COMPANIES-APP-CONTRACTS-1` and follow-ons) → Owner/Support Helper runtime smoke → close Companies MVP only after app gates pass.

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

## Companies (`ZAM-COMPANIES-001`) — DB schema/RPC applied on DEV/DEMO; app not started

- **Contract:** Mozfer-approved lean Companies MVP (fields, phone, duplicates, lifecycle active-only, roles, RPC read/mutation, pagination, metrics, routes).
- **Deferred register:** `DWR-COMP-001` through `DWR-COMP-028` recorded in `docs/deferred-decisions.md`.
- **Application today:** `/companies` remains a protected placeholder (`requireAppSession` + empty pending module). No list/detail/create/edit UI, Server Action wiring, or fake company data. **Application contracts and runtime smoke are pending.**
- **Live catalog verification (`DWR-COMP-026`):** **CLOSED — PASS** (pre-design gate).
- **ACL remediation:** closed. **Database Companies enforcement:** applied on designated DEV/DEMO (see below).

### Milestone status (Companies)

| Milestone | Status |
|---|---|
| Schema/RPC design | **Complete** (`docs/companies-schema-rpc-design.md`) |
| Migration source | **Complete** (`supabase/migrations/20260716120000_companies_mvp_schema_rpc.sql`) |
| DEV/DEMO apply | **Complete** (Mozfer SQL Editor, `postgres`, project `gdegnwglakyblnmxgiwx`, PG 17.6) |
| Catalog/object verification | **PASS** (eight-object query all `true`; in-script postconditions) |
| Application wiring | **Not started** |
| Owner / Support Helper runtime smoke | **Pending** (not claimed) |

### Schema/RPC migration apply (`ZAM-COMPANIES-SCHEMA-RPC`) — DEV/DEMO CLOSED

- **Migration file:** `supabase/migrations/20260716120000_companies_mvp_schema_rpc.sql` (unchanged filename; no corrective migration).
- **Source commits:** `f503c7ef feat(companies): add schema enforcement and RPCs`; parameter-order fix `6acc2e34 fix(companies): correct update RPC parameter order` (`6acc2e346ab0f3314f928ed1e5c3cef24462daab`).
- **First apply attempt:** failed with PostgreSQL **42P13** (`input parameters after one with a default value must also have defaults`) while defining `public.update_company(...)`. Failure was **before COMMIT**; transaction **rolled back**; no partial apply retained.
- **Source fix:** required `p_expected_updated_at` moved before defaulted optional parameters (mandatory concurrency retained; no `DEFAULT` on the concurrency token).
- **Successful retry:** full corrected script run **BEGIN → COMMIT** as `postgres` on DEV/DEMO. No SQL error. Result grid showed `pg_advisory_xact_lock` (expected; lock function returns void). In-script postconditions completed without exception; transaction committed.
- **Manual verification query (all true):** `name_helper`, `phone_helper`, `list_rpc`, `get_rpc`, `create_rpc`, `update_rpc`, `name_index`, `projects_index`.
- **Verified objects:** `normalize_company_name(text)`, `normalize_company_phone(text)`, `list_companies(text,integer,integer)`, `get_company(uuid)`, `create_company(text,text,text,text)`, `update_company(uuid,text,timestamp with time zone,text,text,text)`, `idx_companies_account_norm_name_active`, `idx_projects_account_company_status_live`.
- **Applied content:** name/phone helpers; active normalized-name unique index; phone CHECK; projects live company/status index; four RPCs with optimistic concurrency; authenticated EXECUTE only on RPCs; helpers non-client-callable; authenticated table SELECT-only preserved; RLS preserved; no table mutation grants; no lifecycle/delete/restore; no financial fields.
- **Not claimed:** UI completion; Owner/Support Helper runtime RPC smoke; browser smoke; business-row functional tests; production readiness; Supabase migration-history registration.

### Schema/RPC design reference

- Canonical design: `docs/companies-schema-rpc-design.md` (parameter order for `update_company` matches applied signature).
- Concurrency: required `p_expected_updated_at` → `stale_company_version`.
- Next application task: `ZAM-COMPANIES-APP-CONTRACTS-1`.

### Live catalog highlights (pre-apply baseline; full detail in verification doc)

- Catalog gate confirmed companies/projects shape and ACL posture before design/migration.
- Post-apply: uniqueness, phone CHECK, company-scoped project index, and Companies RPCs now exist on DEV/DEMO (see apply section above).

### Approved Companies MVP summary (app not runtime)

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
- Boundaries: DEV/DEMO database evidence only. Domain Companies RPCs are **applied on DEV/DEMO** under `20260716120000_companies_mvp_schema_rpc.sql`; application wiring remains separate.
- Residual non-SELECT privilege cleanup on the **core public tables, managed views, named trigger functions, and postgres default privileges** was completed later under `ZAM-SEC-ACL-001` (see above). That residual item is **closed** for those surfaces.

### `ZAM-SEC-ACL-001` — Core ACL and default-privilege hardening

- See **Security — core database ACL hardening** section above for full evidence and boundaries.

## Open work

- Companies application contracts / Server Actions / UI (`ZAM-COMPANIES-APP-CONTRACTS-1` and follow-ons).
- Owner and Support Helper **runtime** smoke against applied Companies RPCs (pending; not performed in apply closeout).
- Then Projects and remaining domain sequence.
- Deferred Support Helper **runtime** smoke for ACL milestone (P2/nonblocking; catalog EXECUTE contracts already verified).
- Deferred Auth admin: password recovery/change, invitation and Support Helper administration, Auth-user/profile relinking, account/profile settings, multi-device session controls, sole-Owner recovery.
- Residual platform note: `supabase_admin`-owned default ACLs remain intentionally out of scope (hosted project-owner limitation).
