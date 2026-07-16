# Project Status

Current phase: **Companies MVP CRUD closed on designated DEV/DEMO** after Auth close, core ACL hardening close, live catalog verification (`DWR-COMP-026` PASS), schema/RPC design and migration source, DEV/DEMO apply, application contracts, list/create/detail/edit UI, visual foundation polish, and Mozfer-owned Owner + Support Helper runtime smoke. Production readiness is **not** claimed. Cross-account runtime isolation smoke is **not** claimed (deferred, non-blocking).

Next sequence: Projects MVP scope review (`ZAM-PROJECTS-MVP-SCOPE-REVIEW-1`) and remaining domain sequence. Cross-account Companies runtime security smoke remains a deferred non-blocking follow-up.

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
- Implemented Companies MVP routes under `/companies` (list/create/detail/edit) — see Companies section.
- Controlled authenticated placeholder for `/projects`.
- Controlled Owner-only `/financials` placeholder; Support Helper direct access redirects to `/` without financial wording or data.

## Security — core database ACL hardening (`ZAM-SEC-ACL-001`) — CLOSED (DEV/DEMO)

- **Status:** designed, SQL-draft reviewed, manually applied to designated DEV/DEMO, post-apply verified, Owner-smoked, committed, and pushed.
- **Migration:** `supabase/migrations/20260715120000_harden_core_acl_defaults.sql`.
- **Commit:** `846894e fix(security): harden core database ACLs` (`846894ed3ccfad21545a5f9e451814dbc8edfa16`).
- **Apply surface:** Supabase SQL Editor on designated DEV/DEMO project `gdegnwglakyblnmxgiwx`, PostgreSQL **17.6**, session `current_user` = `postgres`.
- **Remediation:** least-privilege ACL hardening only (no RLS/policy rewrites, no domain-row mutation in that task).

### Verified post-apply outcomes (DEV/DEMO catalog)

1. **Relations:** 10 core tables and 2 managed views: `authenticated` **SELECT only**; `anon` / `service_role` no privileges; RLS still enabled.
2. **Trigger functions:** named trigger functions non-client-callable; attachments preserved.
3. **Approved callable contracts:** approved helpers/RPCs remain authenticated-only.
4. **Default privileges:** `postgres` GLOBAL and `IN SCHEMA public` defaults hardened. **`supabase_admin` default ACLs intentionally out of scope.**

### ACL-milestone runtime smoke (historical)

- Owner login / profile / shell: **PASS**
- Support Helper runtime smoke for the ACL milestone itself: **NOT TESTED** at that time (P2/nonblocking; catalog EXECUTE contracts verified). Later Companies Support Helper smoke is recorded under Companies below and does **not** reopen ACL-era claims.

### Boundaries that remain true

- Evidence is **DEV/DEMO only**, never production readiness.
- Authenticated **SELECT** on core tables remains intentional and RLS-constrained.
- Support Helper domain access remains through **bounded RPCs**, not broad base-table SELECT for support-safe surfaces that require it.
- Normal runtime must not use `service_role` for direct core relation access.
- Future public objects require **explicit** privilege design.

## Companies (`ZAM-COMPANIES-001`) — MVP CRUD CLOSED (DEV/DEMO)

- **Contract:** Mozfer-approved lean Companies MVP (fields, phone, duplicates, lifecycle active-only, roles, RPC read/mutation, pagination, metrics, routes).
- **Deferred register:** `DWR-COMP-001` through `DWR-COMP-028` in `docs/deferred-decisions.md`.
- **Live catalog verification (`DWR-COMP-026`):** **CLOSED — PASS**.
- **ACL remediation:** closed.
- **Database Companies enforcement:** applied on designated DEV/DEMO.
- **Application wiring:** **complete** for MVP list/create/detail/edit (source + automated tests + Mozfer runtime smoke).
- **Visual foundation polish:** **complete** (`aa2f6b4 fix(companies): polish visual foundations`).
- **Production readiness:** **not** claimed.
- **Delete/restore/lifecycle UI or RPC:** **not** in MVP (deferred).
- **Project CRUD:** **not** claimed.

### Milestone status (Companies)

| Milestone | Status |
|---|---|
| Schema/RPC design | **Complete** (`docs/companies-schema-rpc-design.md`) |
| Migration source | **Complete** (`supabase/migrations/20260716120000_companies_mvp_schema_rpc.sql`) |
| DEV/DEMO apply | **Complete** (Mozfer SQL Editor, `postgres`, project `gdegnwglakyblnmxgiwx`, PG 17.6) |
| Catalog/object verification | **PASS** (eight-object query all `true`; in-script postconditions) |
| Application contracts | **Complete** |
| List / create / detail / edit pages | **Complete** |
| Visual foundation polish | **Complete** (`aa2f6b4`) |
| Owner manual smoke | **PASS** (Mozfer; DEV/DEMO) |
| Support Helper runtime smoke | **PASS** (Mozfer; same-account DEV/DEMO) |
| Finance-blind Support Helper UI | **PASS** (Mozfer) |
| Safe duplicate-name handling | **PASS** (Mozfer) |
| Cross-account runtime isolation smoke | **NOT TESTED** — deferred, non-blocking security follow-up |
| Companies MVP CRUD phase | **CLOSED** (DEV/DEMO evidence only) |

### Application commits (selected)

- Application contracts and RPC wrappers (series culminating in contracts commit `37a573e` and follow-ons).
- List: `a6fbe886 feat(companies): add list page`.
- Create: `5ee2727 feat(companies): add create page`; list redirect fix `464489a`.
- Detail: `66b9cef feat(companies): add detail page`.
- Edit: `aec379a feat(companies): add edit page`.
- Visual polish: `aa2f6b4 fix(companies): polish visual foundations`.

### Schema/RPC migration apply (`ZAM-COMPANIES-SCHEMA-RPC`) — DEV/DEMO CLOSED

- **Migration file:** `supabase/migrations/20260716120000_companies_mvp_schema_rpc.sql`.
- **Source commits:** `f503c7ef feat(companies): add schema enforcement and RPCs`; parameter-order fix `6acc2e34 fix(companies): correct update RPC parameter order`.
- **First apply attempt:** failed with PostgreSQL **42P13** before COMMIT; rolled back cleanly.
- **Successful retry:** full corrected script **BEGIN → COMMIT** as `postgres` on DEV/DEMO.
- **Verified objects include:** `normalize_company_name`, `normalize_company_phone`, `list_companies`, `get_company`, `create_company`, `update_company` (required `p_expected_updated_at`), active normalized-name unique index, projects live company/status index.
- **Applied posture:** authenticated EXECUTE only on RPCs; helpers non-client-callable; authenticated table SELECT-only preserved; RLS preserved; no table mutation grants; no lifecycle/delete/restore; no financial fields on companies.
- **Not claimed:** production readiness; Supabase migration-history registration; cross-account runtime isolation PASS.

### Manual DEV/DEMO smoke (`ZAM-COMPANIES-MANUAL-SMOKE-CLOSE-1`) — CLOSED

- **Environment:** designated DEV/DEMO Supabase project `gdegnwglakyblnmxgiwx`; local runtime `localhost:3002`.
- **Performer:** Mozfer (not agent browser automation).
- **Credentials / Auth UUIDs / profile UUIDs:** not recorded in repository documentation.

#### Owner smoke — PASS

- Companies list loaded.
- Company creation succeeded.
- Saudi `05` phone normalized to `9665` format.
- Created company appeared on list.
- Company detail loaded.
- Edit page prefilled.
- Company update succeeded; updated data appeared on detail/list.
- Duplicate company name produced safe Arabic validation.
- No raw SQLSTATE, constraint, Supabase, or PostgreSQL details rendered.

#### Visual review — PASS

- Phone inputs retain LTR digit order and align correctly in RTL forms.
- Phone display remains grouped under its Arabic label.
- Create/edit forms centered on wide screens.
- Detail/list metadata visually grouped.
- Timestamps readable and isolated.
- Mobile-responsive foundation accepted.
- Visual polish commit: `aa2f6b4be2ff7ab20d769289a9034d5e8739e9ea`.

#### Support Helper smoke — PASS (same account)

- A DEV/DEMO Auth user was linked to the **same account** with `role = support_helper`, `active = true`, `deleted_at = null` (no email, password, Auth UUID, or profile UUID documented).
- Login/profile resolution succeeded; role displayed as Arabic Support Helper.
- Finance-blind dashboard loaded; navigation exposed only permitted operational sections.
- Companies list, detail, create, and update succeeded.
- Duplicate-name error remained safe and Arabic.
- Projects section contained no prices, dues, payments, settlements, participant wages, or other finance data.
- No service-role key or finance information visible in UI.

#### Security summary (Companies smoke)

| Surface | Result |
|---|---|
| Same-account Owner behavior | **PASS** |
| Same-account Support Helper behavior | **PASS** |
| Finance-blind Support Helper UI | **PASS** |
| Cross-account isolation with a separate second account | **NOT TESTED** (deferred, non-blocking) |
| Production readiness | **Not claimed** |

### Approved Companies MVP summary (implemented app on DEV/DEMO evidence)

- Fields: `name` (required), `contact_person`, `phone`, `notes` (optional).
- Mutations: **Server Action → authenticated RPC** for create and edit only; no lifecycle RPC; no direct base-table UPDATE.
- Owner and Support Helper use Companies routes under the approved contract; Support Helper remains **finance-blind**.
- Metrics: active/completed project counts as implemented on list/detail (operational only).
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
- Owner base-table SELECT remains Owner-scoped. Support Helper limited to four support-safe `SECURITY DEFINER` RPCs for those surfaces (no broad base-table, pricing, payment, or financial-summary access).
- Domain Companies RPCs are **applied on DEV/DEMO** under `20260716120000_companies_mvp_schema_rpc.sql` and **wired in the application** for MVP CRUD (see Companies section).
- Residual non-SELECT privilege cleanup on core public tables/views/trigger functions/`postgres` defaults was completed under `ZAM-SEC-ACL-001`.

### `ZAM-SEC-ACL-001` — Core ACL and default-privilege hardening

- See **Security — core database ACL hardening** section above for full evidence and boundaries.

## Open work

- **Projects** MVP scope review and implementation sequence (`ZAM-PROJECTS-MVP-SCOPE-REVIEW-1` next).
- Deferred **cross-account** Companies runtime isolation smoke (second account) — **non-blocking** security follow-up; not marked PASS.
- Deferred Companies lifecycle/metrics/import items: `docs/deferred-decisions.md`.
- Deferred Support Helper **ACL-era** runtime smoke note remains historical P2 for that milestone only; Companies same-account SH smoke is closed above.
- Deferred Auth admin: password recovery/change, invitation and Support Helper administration, Auth-user/profile relinking, account/profile settings, multi-device session controls, sole-Owner recovery.
- Residual platform note: `supabase_admin`-owned default ACLs remain intentionally out of scope (hosted project-owner limitation).
