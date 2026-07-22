# Project Status

Current phase: **Forms & Collections Backend Schema Foundation Complete & History-Registered (Pushed)**.
The Forms & Collections backend database schema, RLS policies, security-invoker read views, transactional mutation RPCs, and active-revision view correction are implemented, catalog-verified, registered in remote migration history (`gdegnwglakyblnmxgiwx`), and pushed to `main` at commit [`5c390947c9869928917ebd235356ca91f1a02ccd`](file:///D:/Zamblak/Zamblak-field-research/supabase/migrations/20260723140000_forms_collections_rpcs.sql). 472 automated tests pass (445 Node + 27 Vitest UI). TypeScript, ESLint, production build, and git diff checks pass with 0 errors. Business tables currently contain 0 runtime rows in DEV/DEMO (structural, security, and catalog validation passed; application UI integration and representative DEV/DEMO runtime smoke are pending). Production readiness is **not** claimed.

Next product sequence: **Forms & Collections Application Integration & UI Wiring** (following backend schema delivery). Product order remains Company → Project → Respondent → Participation → Review → Financials.

## Forms & Collections Backend Schema Delivery (`ZAM-FORMS-COLLECTIONS-BACKEND`) — CLOSED & REGISTERED

- **Status:** **Backend Foundation Complete, Registered & Pushed** (Commit `5c390947c9869928917ebd235356ca91f1a02ccd` on `main`, divergence 0/0).
- **Target Environment:** Designated DEV/DEMO Supabase project `gdegnwglakyblnmxgiwx` (PostgreSQL 17.6).
- **Delivered Migrations (4 Files):**
  1. [`20260723120000_forms_collections_schema.sql`](file:///D:/Zamblak/Zamblak-field-research/supabase/migrations/20260723120000_forms_collections_schema.sql) (Slice 1: 5 core tables, constraints, indexes, version progression, contiguous revision sequence invariants, idempotency protection, audit triggers - SHA256 `b401c15dac48267fffd1bcc436c781df7d374f66bc393dee4c5c732c36fc8172`).
  2. [`20260723130000_forms_collections_rls_views.sql`](file:///D:/Zamblak/Zamblak-field-research/supabase/migrations/20260723130000_forms_collections_rls_views.sql) (Slice 2: 5 FORCE RLS enablements, 4 Owner SELECT policies, 17 function EXECUTE revokes, 2 security-invoker read views - SHA256 `251722c7a583d71bbd06563546c7ab7c76bbe24ee47b3143b18677d701a4b8f0`).
  3. [`20260723140000_forms_collections_rpcs.sql`](file:///D:/Zamblak/Zamblak-field-research/supabase/migrations/20260723140000_forms_collections_rpcs.sql) (Slice 3: 7 Owner-gated mutation RPCs, 3 internal helpers, atomic idempotency claim/completion, concurrency-safe code generation, per-form balance exposure enforcement - SHA256 `5859834dd212bd15964d4ba2e54c9423cb9beb7ee67f7f6b3291eb965b2c1647`).
  4. [`20260723150000_fix_form_financial_summary_active_allocations.sql`](file:///D:/Zamblak/Zamblak-field-research/supabase/migrations/20260723150000_fix_form_financial_summary_active_allocations.sql) (Corrective View Fix: active collection revision filter `COALESCE(SUM(ca.amount) FILTER (WHERE c.id IS NOT NULL), 0.00)` across `allocated_amount`, `outstanding_amount`, and `settlement_state` - SHA256 `737ed57c8c6144b81ef723e037ca3fcd94cf5513377224f9166c09369c5f18ee`).

### Implemented Backend Capabilities
- **Research Forms Lifecycle**: Submission with sequential per-participation attempt numbering & account-scoped daily form code (`RF-YYYYMMDD-NNN`); review (accept with price snapshot & server-side quota check, reject with mandatory reason, cancel); accepted-form correction to rejected/cancelled (enforces zero active allocations & clears `accepted_at` while preserving historical `accepted_price_snapshot`).
- **Collections & Allocations Workflow**: Company collection receipt creation (v1 + revision 1); optimistic allocation revisions (v $\rightarrow$ v+1 header creation & new line item set, satisfying two-sided deferred contiguous-revision invariants); voiding active receipts with mandatory reason; replacement receipt creation referencing voided target.
- **Idempotency & Concurrency Protections**: Permanent `idempotency_keys` lineage store with deterministic SHA-256 request payload hashing (`pg_catalog.sha256`); atomic claim (`INSERT ... ON CONFLICT DO NOTHING RETURNING`) and completion (`UPDATE ... WHERE status = 'processing' RETURNING`); deterministic lock orders (`accounts` `FOR UPDATE` $\rightarrow$ `participations` `FOR UPDATE` $\rightarrow$ `projects` `FOR UPDATE` $\rightarrow$ `research_forms` `ORDER BY id ASC FOR UPDATE`).
- **Financial Summary Views**: `form_financial_summary` (receivables, 40-day due-date fallback, filtered by active collections & current revisions) and `collection_summary` (receipt totals & allocation progress).

### Security Posture
- **FORCE RLS**: Enabled and forced on all 5 tables (`research_forms`, `collections`, `collection_allocation_revisions`, `collection_allocations`, `idempotency_keys`).
- **Direct DML Blocked**: 0 client DML policies exist. Direct client `INSERT`/`UPDATE`/`DELETE` is blocked at RLS and ACL layers.
- **Role Isolation**: 3 internal helper functions are non-client-callable (0 EXECUTE grants); 7 mutation RPCs are executable ONLY by `authenticated` users and internally Owner-gated (`is_owner() = true`). `anon` and `service_role` execution is explicitly revoked. `support_helper` receives `forbidden` before financial state disclosure.

### Validation Evidence & Remote Alignment
- **Remote Migration History**: Registered 16/16 migrations as applied 1-to-1 in DEV/DEMO project `gdegnwglakyblnmxgiwx`.
- **Dry-Run Check**: `npx supabase db push --dry-run --linked` returned `Remote database is up to date.` with 0 pending migrations.
- **Automated Validation**: 445 Node tests passed, 27 Vitest UI tests passed (472 total). TypeScript clean (0 errors), ESLint clean (0 warnings), production build succeeded.
- **Git State**: Clean working tree, 0 untracked files, commit `5c390947c9869928917ebd235356ca91f1a02ccd` aligned 0/0 with `origin/main`.

### Current Limitations & Next Ordered Sequence
- **Current Limitation**: Forms & Collections business tables currently contain `0` runtime rows in DEV/DEMO. Catalog, schema, security, and automated tests passed, but end-to-end runtime behavior with representative DEV/DEMO fixtures remains unexercised.
- **Ordered Next Task Sequence**:
  1. Application integration design and contract audit for the 7 RPCs and 2 read views (`ZAM-FORMS-COLLECTIONS-APP-CONTRACTS`).
  2. Forms list / detail / submission / review UI integration with Server Actions.
  3. Collections receipt / allocation / revision / void / replacement UI integration with Server Actions.
  4. Representative DEV/DEMO runtime smoke with safe fixtures.
  5. Documentation and acceptance closeout.

## Frontend Milestone Closure Summary (`ZAM-FRONTEND-MILESTONE`) — CLOSED (PASS)

- **Status:** **Complete & Validated** (Ready for single milestone commit).
- **Completed Frontend Flows:**
  - **Companies**: list, create, detail, edit (Server Actions → RPCs).
  - **Projects**: list, create, detail, edit, lifecycle management (Server Actions → RPCs).
  - **Respondents / Participants**: list, create, detail, edit, duplicate mobile check, stale recovery.
  - **Participation Assignment Flow**: respondent search, three-month warning check, assignment RPC integration, list assignment history.
  - **Free-Text Project Domain Contract**: 1–120 trimmed characters, supports Arabic, English, or mixed text.
  - **Owner-Only Forms & Collections Browser Prototype**: `/forms` and `/collections` workflows, allocation workspace reflow, responsive desktop/mobile views, date formatting, and success notices.

### Owner-Only Forms & Collections Browser Prototype Contract
- **Storage Scope**: Browser `sessionStorage` ONLY under exact namespace `zamblak.forms-prototype.v1`.
- **Database Boundary**: Zero production or live database table mutations. All prototype state lives in client-side memory/sessionStorage.
- **Role Isolation**: `/forms/**` and `/collections/**` routes are Owner-only and fail closed for `support_helper` (`redirect("/forbidden")`). Support Helper remains strictly finance-blind.
- **Backend Status**: Backend database schema, RPCs, RLS, and persistence for Forms, quotas, receivables, and collections remain **explicitly deferred**.

### DEV/DEMO Manual Migration Apply Status
1. **`20260718120000_participation_assign_rpcs.sql`**:
   - Manually applied to designated DEV/DEMO instance `gdegnwglakyblnmxgiwx` (PostgreSQL 17.6).
   - Installs `create_participation`, `check_respondent_three_month_warning`, `list_project_participations`, and internal warning helper.
   - Forward-only, strict `SECURITY DEFINER` posture, postgres owner, authenticated-only EXECUTE.
2. **`20260719120000_projects_free_text_domain.sql`**:
   - Manually applied to designated DEV/DEMO instance `gdegnwglakyblnmxgiwx`.
   - Installs `chk_projects_domain` constraint (1..120 chars, trimmed) and updated `create_project` / `update_project` RPCs.
   - Forward-only, strict check constraint, authenticated-only EXECUTE.

### Automated Validation Evidence
- **Node Tests (`npm run test:node`)**: 445 passed, 0 failed.
- **Vitest UI Tests (`npm run test:ui`)**: 27 passed (2 test suites), 0 failed.
- **Total Test Suite (`npm run test`)**: 472 passed, 0 failed.
- **TypeScript (`npx tsc --noEmit`)**: 0 errors.
- **ESLint (`npx eslint src/`)**: 0 errors, 0 warnings.
- **Production Build (`npm run build`)**: Succeeded cleanly (24 routes built).
- **Whitespace / Diff Check (`git diff --check`)**: 0 whitespace errors, 0 conflict markers.
- **Impeccable Visual Quality Detector**: `[]` (0 findings).

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
- Projects MVP routes implemented: `/projects`, `/projects/new`, `/projects/[projectId]`, `/projects/[projectId]/edit` (finance-blind; Owner-only lifecycle on detail).
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

## Projects (`ZAM-PROJECTS-001`) — MVP runtime acceptance CLOSED (PASS)

| Milestone | Status |
|---|---|
| Scope review | **PASS WITH WARN** (`ZAM-PROJECTS-MVP-SCOPE-REVIEW-1`) |
| Live catalog run / review | **PASS WITH WARN** (Mozfer; PG **17.6**; `gdegnwglakyblnmxgiwx`) |
| Schema/RPC design | **Complete** (`docs/projects-schema-rpc-design.md`) |
| Migration source (initial) | **Complete** — `supabase/migrations/20260716160000_projects_mvp_schema_rpc.sql` — commit `1cb9a75e3eb5ee9d88dbf3e59011a1bf2b12d9f5` |
| Initial DEV/DEMO apply | **Complete** — Mozfer SQL Editor as `postgres`; **Success. No rows returned** (in-script postconditions) |
| Initial post-apply verification | **HOLD** — (1) `list_projects` search `>120` raised `invalid_project_pagination`; (2) `transition_project_status` company check without row lock |
| Correction migration source | **Complete** — `supabase/migrations/20260716170000_projects_mvp_rpc_corrections.sql` — commit `dc03784d2822a642de00af2df8481ccd1c792b0e` |
| Correction DEV/DEMO apply | **Complete** — Mozfer; **Success. No rows returned** |
| Final narrow live verification | **PASS** |
| Soft-deleted Company parent gap | **Closed live** (hardened `check_project_account_consistency` + RPC company checks) |
| Transition Company-lock race | **Closed live** (`FOR SHARE` on parent company) |
| Search error-token defect | **Closed live** (`invalid_project_text_length` for search bound) |
| Lifecycle matrix | **Installed** (Owner-only `transition_project_status`) |
| Finance separation / RLS-ACL posture | **Preserved** (authenticated SELECT-only; no finance on Projects RPCs) |
| Application contracts | **Complete** (`src/lib/projects/**`) |
| List UI | **Complete** — `/projects` (`86f898f`) |
| Create UI | **Complete** — `/projects/new` (`65db22f`) + error-state preservation fix (`7cb47d90`) |
| Detail UI | **Complete** — `/projects/[projectId]` (`50f4272` + presentation align `d6677fe`) |
| Edit UI | **Complete** — `/projects/[projectId]/edit` (`9a00108`) |
| UI Stitch polish | **Complete** — RTL dates + lifecycle colors (`fc13d92`) |
| Automated validation | **Complete** (unit tests / typecheck for contracts + pages as committed) |
| Manual smoke plan | **Prepared** — `docs/projects-manual-smoke-plan.md` |
| Browser / app smoke (overall) | **PASS** (Mozfer; DEV/DEMO) — `docs/projects-manual-smoke-result.md` |
| Runtime acceptance closed | **Yes** |
| WARN-1 RTL date text display | **Closed — PASS** (Mozfer polish re-smoke) |
| WARN-2 Lifecycle button colors | **Closed — PASS** (Mozfer polish re-smoke) |
| Create-form error-state preservation | **Closed — PASS** (Mozfer; after `7cb47d90`) |
| Production readiness | **Not claimed** |

### Manual DEV/DEMO smoke series — CLOSED (overall PASS)

#### Original MVP smoke (`ZAM-PROJECTS-MANUAL-SMOKE-CLOSE-1`) — historical PASS WITH WARN

- **Environment:** designated DEV/DEMO `gdegnwglakyblnmxgiwx`.
- **Performer:** Mozfer (not agent browser automation).
- **Agent role:** plan author / docs closeout only.
- **Credentials / Auth UUIDs / profile UUIDs / screenshots:** not recorded in repository documentation.
- **Result at that time:** **PASS WITH WARN** — no HOLD.
- **PASS:** list; Owner create/detail/edit; Owner draft→active→closed; terminal read-only; SH list/detail/edit operational; SH no lifecycle; finance-blind; no raw SQL errors; no cross-account disclosure observed.
- **Then-open WARNs:** RTL date text BiDi; lifecycle semantic colors → later polish task.

#### UI polish re-smoke (Mozfer after `fc13d92`) — PASS

- Dates display as readable isolated **DD/MM/YYYY** tokens; BiDi reorder warning **closed**.
- Activate Project visually green; Cancel Project visually red; lifecycle labels/behavior unchanged.
- No behavior or data-boundary change.

#### Create-form error-state smoke (`ZAM-PROJECTS-CREATE-FORM-ERROR-STATE-SMOKE-CLOSE-1`, Mozfer after `7cb47d90`) — PASS

- Full form filled; invalid end-before-start date submitted → safe date error.
- **All** submitted values remained populated (Company, domain, dates, numbers, text, resident, warning checkbox).
- Corrected only the invalid date; resubmit succeeded; created Project; returned to `/projects`.
- No repeated Company/domain reselection required; no raw database errors; server validation remained authoritative.
- Agent did **not** run browser automation or SQL for this smoke.

#### Overall Projects MVP browser acceptance

- **Result:** **PASS**
- **Not claimed:** production readiness; branded loader implemented; cross-account destructive probing PASS.

## Brand — loading mark — CLOSED (smoke PASS WITH WARN)

| Milestone | Status |
|---|---|
| Design documentation | **CLOSED** — `docs/brand-loading-mark-design.md` (`ZAM-BRAND-LOADING-MARK-DESIGN-1`) |
| Original stopwatch / seconds-hand concept | **Approved** |
| Animation contract (≈0.9–1.2s + rebound) | **Implemented** (CSS ~1.05s) |
| Full-page / compact / reduced-motion variants | **Implemented** |
| Token/color + accessibility contracts | **Implemented** |
| Implementation (SVG/CSS/React) | **CLOSED** — `ZAM-BRAND-LOADING-MARK-IMPLEMENT-1` |
| Implementation commit | `96505757f444c20ad0b8331b681a221bf2ea4935` |
| Source surface | `src/components/brand/ZamblakLoadingMark.tsx` + CSS module; Projects loading/pending + root `loading.tsx` |
| Manual smoke | **PASS WITH WARN** (Mozfer; `ZAM-BRAND-LOADING-MARK-SMOKE-CLOSE-1`) |
| Production readiness | **Not claimed** |

### Manual smoke summary (`ZAM-BRAND-LOADING-MARK-SMOKE-CLOSE-1`)

- **Runner:** Mozfer (not agent browser automation).
- **Verdict:** **PASS WITH WARN** — no application HOLD.
- **Conditional appearance:** loader shown on some slower route waits; **not** every transition (fast/prefetched absence **expected**).
- **Lifecycle:** appears while waiting; disappears when destination completes; no stuck loader reported.
- **Performance policy:** no minimum forced display duration; no artificial delay; no fake progress.
- **Skeletons:** remain complementary; not replaced solely to increase brand exposure.
- **Hydration warning:** `data-immersive-translate-page-theme` attributed to a **browser translation extension**, not Zamblak source or the branded loader. No `suppressHydrationWarning` and no `layout.tsx` change approved. Verify with extension off / clean profile.
- **Unrelated console noise:** Chrome Built-In AI info and React DevTools messages are not product defects.
- **Nonblocking coverage not exhaustively manual:** spring/rebound timing detail; every compact pending button; reduced-motion; dark surfaces (source + automated tests remain).

### Installed product RPCs (DEV/DEMO, after correction)

- `list_projects(text, uuid, text, integer, integer)`
- `get_project(uuid)`
- `create_project(text, uuid, text, date, date, integer, integer, integer, text, text, boolean, text, text, text)`
- `update_project(uuid, timestamptz, text, uuid, text, date, date, integer, integer, integer, text, text, boolean, text, text, text)`
- `transition_project_status(uuid, timestamptz, text)` — **Owner only**

### Final verified live behavior (metadata + definition review)

- Search length `> 120` → `invalid_project_text_length`; pagination errors remain `invalid_project_pagination`.
- Transition: Project `FOR UPDATE`; Company `FOR SHARE`; same-account non-deleted company; exact lifecycle matrix; Owner-only.
- EXECUTE: authenticated true; PUBLIC / anon / service_role false.
- Exact list (10) / detail (19) return shapes; no finance; no overload collisions.
- Relation ACL/RLS non-regression: authenticated SELECT-only; no Projects UPDATE/DELETE policies.

### Apply boundary

- Designated DEV/DEMO only: `gdegnwglakyblnmxgiwx`, PostgreSQL **17.6**.
- Supabase migration-history registration **not** claimed.
- No business-row smoke; no production readiness.

## Respondents (`ZAM-RESPONDENTS-*`) — DEV/DEMO runtime CLOSED (PASS WITH WARN)

| Milestone | Status |
|---|---|
| Scope review | **PASS WITH WARN** (`ZAM-RESPONDENTS-MVP-SCOPE-REVIEW-1`) |
| Live catalog | **PASS WITH WARN** — `docs/respondents-live-catalog-verification.md` |
| Schema/RPC design | **Frozen** — `docs/respondents-schema-rpc-design.md` |
| Migration source | **Complete** — `20260717120000_respondents_mvp_schema_rpc.sql` (`e6061af` lineage) |
| DEV/DEMO migration apply | **Applied** — packet `docs/respondents-schema-rpc-dev-apply.md`; project `gdegnwglakyblnmxgiwx`; PG **17.6** |
| Application contracts + UI | **Implemented in source** — list/create/detail/edit under `/respondents*`; HEAD `22cfa8fab680943e8250926e962f9c458e7e9f50` includes stale-edit recovery harden |
| Create runtime blocker repair | **Applied + catalog-verified** — `ZAM-RESPONDENTS-CREATE-TRIGGER-AUDIT-FUNCTION-APPLY-1` **PASSED** |
| Agent browser create smoke | **PASSED** — `ZAM-RESPONDENTS-CREATE-TRIGGER-POST-APPLY-UI-SMOKE-RETRY-1` (Support Helper) |
| Agent browser CRUD + stale resume | **PASSED WITH WARN** — `ZAM-RESPONDENTS-AGENT-BROWSER-SMOKE-RESUME-1` |
| Independent review closure | **PASSED WITH WARN** — stale recovery P1 closed; revalidate/edit-error copy closed; deferred P2 remain (below) |
| Production readiness | **Not claimed** |
| Participation | **Not started** |

### Create-blocker repair (`audit_trigger_func`) — DEV/DEMO only

- **Symptom:** valid UI create returned safe `unexpected_respondent_error`; diagnostic **`42703`**: `record "new" has no field "review_correction_reason"`.
- **Chain:** `create_respondent` → `INSERT public.respondents` → `audit_trg_respondents` → `public.audit_trigger_func()` → unsafe composite access.
- **Repair (authorized live function replace only):**
  `NEW.review_correction_reason` → `(v_new ->> 'review_correction_reason')`
  still gated by `TG_TABLE_NAME = 'participations' AND TG_OP = 'UPDATE'`.
- **Post-apply catalog:** OID **17919** retained; owner `postgres`; SECURITY DEFINER; `search_path=public`; ACL `postgres` EXECUTE only; five audit trigger attachments unchanged; Respondent RPCs/ACLs unchanged; no Respondents table column added.
- **No** repository migration file for this one-line live repair yet; DEV/DEMO runtime evidence is recorded here. Migration-history registration still **not** claimed.

### Application surface (static + runtime)

- **Routes:** `/respondents`, `/respondents/new`, `/respondents/[respondentId]`, `/respondents/[respondentId]/edit`.
- **Roles:** Owner and Support Helper may list/create/detail/edit via authenticated RPCs; Support Helper has **no** financial navigation.
- **Stale recovery UI:** native full-document `<a href={editHref}>` reload control after `stale_respondent_version`; submit disabled while stale; no automatic retry.
- **Success navigation:** create → `/respondents`; update → detail; revalidate paths include list, detail, and edit.

### Runtime smoke evidence (agent browser; DEV/DEMO; Support Helper)

| Check | Result |
|---|---|
| Create | **PASS** — synthetic fixture created; redirect list; name search hit |
| Detail | **PASS** — approved fields only; no finance/Participation/internal IDs |
| First edit | **PASS** — name update succeeded |
| Duplicate mobile | **PASS** — safe Arabic block; no second row; no raw SQL |
| Two-tab stale | **PASS** — Tab B did **not** overwrite Tab A |
| Stale UI | **PASS** — submitted values retained; save disabled; recovery control present |
| Full-document recovery | **PASS** — fresh server value loaded; stale cleared |
| Post-recovery save | **PASS** — final name `ZAM UI SMOKE 20260718A RECOVERED` (synthetic) |
| Invalid / not-found routes | **PASS** — safe Arabic not-found; no stack/SQL |
| Finance blindness (SH) | **PASS** — no المستحقات nav; no prices/amounts on Respondents surfaces |
| Raw DB/framework errors | **None observed** |
| PostgreSQL **42703** after repair | **Not observed** on successful create/edit path |

### Nonblocking warnings (runtime / review)

1. **Pending-state capture (P2 evidence):** submit pending/disabled often completes within one browser wait cycle — nonblocking; do not change product solely for smoke timing.
2. **R-LIST-ERROR-COPY-1 (P2 deferred):** list general `ErrorPanel` CTA may use search-reset copy (**مسح البحث**).
3. **R-TEST-ACTION-GAP-1 (P2 deferred):** Server Actions covered mainly via helpers + source-boundary tests, not full mocked action execution.
4. Migration-history registration unavailable / unclaimed (historical catalog WARN).
5. Cross-account isolation smoke deferred (nonblocking).

### Design summary (still current)

- **Table:** 14-column `public.respondents`; no delete/restore RPCs; no `review_correction_reason` on Respondents (Participation-only product field).
- **RPCs:** `list_respondents`, `get_respondent`, `create_respondent`, `update_respondent`.
- **Concurrency:** `p_expected_updated_at` → `stale_respondent_version`.
- **Exclusions:** Participation assignment, three-month eligibility UI, finance, Project history on master row.
- **Authorities:** `docs/respondents-schema-rpc-design.md`; apply packet `docs/respondents-schema-rpc-dev-apply.md`; pre-apply catalog `docs/respondents-live-catalog-verification.md`.

## Open work

- **Next product task:** **Phase 6 Participation** (Respondent Registry DEV/DEMO runtime closed; optional deferred Respondent P2 cleanup may precede Participation if prioritized).
- Deferred Respondent P2: **R-LIST-ERROR-COPY-1**, **R-TEST-ACTION-GAP-1**, pending-state evidence capture.
- Deferred **cross-account** Companies/Projects/Respondents runtime isolation smoke (second account) — **non-blocking**; not marked PASS.
- Deferred Companies lifecycle/metrics/import items: `docs/deferred-decisions.md`.
- Deferred Auth admin: password recovery/change, invitation and Support Helper administration, Auth-user/profile relinking, account/profile settings, multi-device session controls, sole-Owner recovery.
- Residual platform note: `supabase_admin`-owned default ACLs remain intentionally out of scope (hosted project-owner limitation).
