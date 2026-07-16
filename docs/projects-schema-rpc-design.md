# Projects MVP — schema and RPC design

**Status:** DESIGN FROZEN; migration source **written**; DEV/DEMO **applied + corrected + verified PASS**; application **not** implemented

**Task family:** `ZAM-PROJECTS-SCHEMA-RPC-DESIGN-1` → `…-MIGRATION-1` (`1cb9a75`) → apply → verify HOLD → corrections (`dc03784`) → final verify PASS → docs sync

**Authority:** Mozfer-approved role/lifecycle contract; live catalog PASS WITH WARN; installed migrations on DEV/DEMO

**Designated DEV/DEMO:** `gdegnwglakyblnmxgiwx` (PostgreSQL **17.6**)

**Next task:** `ZAM-PROJECTS-APP-CONTRACTS-1`

This document freezes **database, RPC, security, and application-boundary decisions** for the Projects MVP. Implementation status of SQL on DEV/DEMO is recorded in `docs/project-status.md` and `docs/database-migrations.md`. It does **not** claim UI completion or production readiness.

---

## 1. Purpose and scope

Define the complete Projects MVP operational contract:

- unified list/get/create/update RPCs for Owner and Support Helper;
- Owner-only lifecycle transitions;
- soft-deleted Company parent rejection (trigger + RPC);
- optimistic concurrency on write/transition;
- finance-free return shapes and mutation surface.

**Out of scope:** migration SQL; apply; app source; finance/PFS UI; participation/respondent workflows; delete/restore/archive/reopen; Project name uniqueness.

---

## 2. Live catalog evidence and verdict

| Field | Value |
|---|---|
| Project | `gdegnwglakyblnmxgiwx` |
| PostgreSQL | **17.6** |
| Runner | `postgres` |
| Packet | Projects live catalog (post PUBLIC ACL fix `8f45129`) |
| Writes | None |
| Verdict | **PASS WITH WARN** |

### Confirmed live facts

| Fact | Live result |
|---|---|
| `public.projects` | Ordinary table; owner `postgres`; RLS enabled |
| `company_id` | NOT NULL |
| Authenticated relation privileges | **SELECT only** |
| anon / service_role relation privileges | **none** |
| Financial columns on `projects` | **none** |
| Status CHECK | `draft` \| `active` \| `closed` \| `cancelled` |
| Domain CHECK | `telecom` \| `banking` \| `insurance` \| `product` \| `other` |
| Resident CHECK | `any` \| `saudi` \| `non_saudi` \| `unknown` |
| Date / age / quota checks | present |
| Index | `idx_projects_account_company_status_live` on `(account_id, company_id, status) WHERE deleted_at IS NULL` |
| Triggers | `trg_projects_account_consistency`, `trg_projects_updated_at` |
| `check_project_account_consistency()` | SECURITY DEFINER; `search_path=public`; client EXECUTE revoked |
| Missing / cross-account company | fail closed |
| Soft-deleted company | **not** rejected (gap) |
| PFS | separate RLS table; not on `projects` |
| CRUD RPCs | `list_projects` / `get_project` / `create_project` / `update_project` / `transition_project_status` **absent** |
| Name collision | none |

### WARNs carried into design

1. Soft-deleted Company parent gap → **closed by design** (trigger + RPC).
2. Status CHECK only; no transition matrix → **closed by design** (`transition_project_status`).
3. `support_project_directory` is legacy/narrow → **not** the product API.

### Catalog notes (non-incidents)

- Policy role arrays may show OID `0` = **PUBLIC** pseudo-grantee (not an unknown user).
- `set_updated_at()` may be SECURITY INVOKER without fixed `search_path`; it only assigns `now()`. **Non-blocking** for this phase — no mandatory hardening unless a later security review proves need.

---

## 3. Current Projects database shape (baseline)

Keep existing `public.projects` columns. **No new public columns** in MVP.

Operational columns (product surface):
`id`, `account_id`, `company_id`, `name`, `domain`, `status`, `start_date`, `end_date`, `quota`, `min_age`, `max_age`, `required_resident_type`, `eligibility_notes`, `requires_three_month_warning`, `whatsapp_template_ar`, `whatsapp_template_en`, `notes`, `created_by`, `updated_by`, `created_at`, `updated_at`, `deleted_at`.

Finance remains exclusively in `public.project_financial_settings` (and related finance tables/views) — **never** joined or returned by Projects MVP RPCs.

---

## 4. Confirmed risks and design responses

| Risk | Response |
|---|---|
| Soft-deleted Company accepted by trigger | Harden trigger; RPC validate active company |
| Lifecycle unenforced | Owner-only `transition_project_status` with matrix |
| SH base SELECT blocked | Unified SECURITY DEFINER read RPCs |
| Direct mutation denied | No table INSERT/UPDATE grants; RPCs only |
| Legacy support directory incomplete | Leave in place; product uses `list_projects` / `get_project` |
| Finance leakage | No PFS joins; forbid finance tokens in returns |

---

## 5. Approved role matrix

| Action | Owner | Support Helper |
|---|---|---|
| `list_projects` | Yes | Yes |
| `get_project` | Yes | Yes |
| `create_project` | Yes | Yes |
| `update_project` (operational fields) | Yes (draft/active only) | Yes (draft/active only) |
| `transition_project_status` | **Yes** | **No** (`project_access_denied`) |
| Soft-delete / restore / archive / reopen | No | No |
| PFS / pricing / payments / settlements / wages | **No (this phase)** | **Forbidden** |
| Direct table mutation | No | No |

---

## 6. MVP operational fields

### Returned / editable (as allowed by status)

| Field | Create | Update (draft) | Update (active) | List | Detail |
|---|---|---|---|---|---|
| `project_id` (`id`) | out | out | out | yes | yes |
| `company_id` | in | in (may change) | locked | yes | yes |
| `company_name` | out | out | out | yes | yes |
| `name` | in | in | in | yes | yes |
| `domain` | in | in | in | yes | yes |
| `status` | forced `draft` | never via update | never via update | yes | yes |
| `start_date` / `end_date` | in optional | in optional | in optional | yes | yes |
| `quota` | in optional | in optional | in optional | yes | yes |
| `min_age` / `max_age` | in optional | in optional | in optional | no | yes |
| `required_resident_type` | in (default `any`) | in | in | no | yes |
| `eligibility_notes` | in optional | in optional | in optional | no | yes |
| `requires_three_month_warning` | in (default true) | in | in | no | yes |
| `whatsapp_template_ar` / `_en` | in optional | in optional | in optional | no | yes |
| `notes` | in optional | in optional | in optional | no | yes |
| `created_at` / `updated_at` | out | out | out | list has `updated_at` | yes |

### Internal only (never client-supplied authority)

| Field | Rule |
|---|---|
| `account_id` | Derived from current profile account only |
| `created_by` / `updated_by` | Server-set profile ids |
| `deleted_at` | Foundation only; MVP RPCs never set/clear |

### Name uniqueness

- **No** unique Project-name index in this phase.
- Duplicate names **allowed**.
- Name hygiene = trim + collapse whitespace only (display case preserved).
- Uniqueness may be reconsidered only with explicit product approval later.

---

## 7. Deferred / forbidden finance fields

**Never** in Projects MVP RPC parameters or returns:

- `price_per_accepted_form` or any PFS column
- participant pricing, wages
- accepted/rejected/payable counts
- amount due / paid / remaining
- payments, settlements, financial summaries or statuses
- PFS identifiers

`project_financial_summary` and Owner finance UI remain **outside** this phase.
`project_operational_summary` must **not** become the Support Helper product API (accepted counts are finance-adjacent).

---

## 8. Lifecycle state machine

### Vocabulary (exact)

`draft` | `active` | `closed` | `cancelled`

### Create

- Always **`draft`**.
- `create_project` **must not** accept `p_status`.

### Allowed transitions (`transition_project_status` only)

| From | To |
|---|---|
| `draft` | `active` |
| `draft` | `cancelled` |
| `active` | `closed` |
| `active` | `cancelled` |

### Forbidden transitions

| From | To | Notes |
|---|---|---|
| `active` | `draft` | reopen forbidden |
| `closed` | any | terminal |
| `cancelled` | any | terminal |
| any | same status | `invalid_project_status_transition` |
| any unlisted edge | — | `invalid_project_status_transition` |

### Terminal states

- `closed`, `cancelled` — no further transitions; no operational edit.

### Role

- **Owner only** for `transition_project_status`.
- Support Helper → `project_access_denied`.

### Side effects (MVP)

- **No** automatic `start_date` / `end_date` changes.
- **No** automatic PFS creation.
- **No** auto-retry on stale concurrency.

---

## 9. Editability by status

| Status | Operational update | Company change | Status via update |
|---|---|---|---|
| `draft` | Owner + SH | Yes (active same-account non-deleted company) | No |
| `active` | Owner + SH | **Locked** (`project_company_locked` if changed) | No |
| `closed` | **Read-only** (`project_not_editable`) | — | No |
| `cancelled` | **Read-only** (`project_not_editable`) | — | No |

Delete / restore / archive / reopen: **out of MVP**.

---

## 10. Soft-deleted Company hardening (defense in depth)

### 10.1 Trigger: `check_project_account_consistency()`

Migration **must** rewrite function body to:

1. Look up company with
   `id = NEW.company_id` **AND** `deleted_at IS NULL`.
2. If not found → fail closed (missing **or** soft-deleted treated the same at DB layer).
3. If `NEW.account_id IS DISTINCT FROM company.account_id` → fail closed.
4. Keep **SECURITY DEFINER** with **explicit fixed** `search_path` (`public` or `pg_catalog, public` — freeze one in migration; prefer `SET search_path = pg_catalog, public` for new/changed DEFINER objects).
5. Remain non-client-callable (no EXECUTE to PUBLIC/anon/authenticated/service_role).
6. Remain attached BEFORE INSERT OR UPDATE on `projects`.

### 10.2 RPC layer

- `create_project` / `update_project` (when company is set or changed): require company in **current account**, `deleted_at IS NULL`.
- Prefer `SELECT … FOR SHARE` (or equivalent row lock) on company during create / company change to reduce races; trigger remains final backstop.
- Raise **stable tokens** only (`project_company_not_found` / `project_company_unavailable` as frozen below) — never raw exception text to clients.
- Application must **not** query `public.companies` directly for SH; use `list_companies` / `get_company`.

### 10.3 Application mapping

| Situation | Token |
|---|---|
| Company missing, wrong account, or soft-deleted (user-facing) | `project_company_not_found` (no existence leak across accounts) |
| Optional internal distinction when same-account deleted company proven | may map to `project_company_unavailable` only if it does **not** leak cross-account existence; default preference: **same external token** `project_company_not_found` for all unavailable company cases |

**Frozen external default:** use **`project_company_not_found`** for all unavailable company parents (missing / deleted / cross-account). Reserve `project_company_unavailable` only if a later product decision needs same-account soft-delete messaging without leakage — not required for MVP if single token is clearer.

**MVP freeze:** external token for unavailable company = **`project_company_not_found`**. Document `project_company_unavailable` as reserved, not required for first migration.

---

## 11. Exact RPC signatures

All five are **new**. Parameter order freezes **required before DEFAULT** (avoid 42P13).

### 11.1 `public.list_projects`

```text
public.list_projects(
  p_search text DEFAULT NULL,
  p_company_id uuid DEFAULT NULL,
  p_status text DEFAULT NULL,
  p_limit integer DEFAULT 25,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  project_id uuid,
  project_name text,
  company_id uuid,
  company_name text,
  domain text,
  status text,
  start_date date,
  end_date date,
  quota integer,
  updated_at timestamptz
)
```

### 11.2 `public.get_project`

```text
public.get_project(
  p_project_id uuid
)
RETURNS TABLE (
  project_id uuid,
  project_name text,
  company_id uuid,
  company_name text,
  domain text,
  status text,
  start_date date,
  end_date date,
  quota integer,
  min_age integer,
  max_age integer,
  required_resident_type text,
  eligibility_notes text,
  requires_three_month_warning boolean,
  whatsapp_template_ar text,
  whatsapp_template_en text,
  notes text,
  created_at timestamptz,
  updated_at timestamptz
)
```

### 11.3 `public.create_project`

```text
public.create_project(
  p_name text,
  p_company_id uuid,
  p_domain text,
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL,
  p_quota integer DEFAULT NULL,
  p_min_age integer DEFAULT NULL,
  p_max_age integer DEFAULT NULL,
  p_required_resident_type text DEFAULT 'any',
  p_eligibility_notes text DEFAULT NULL,
  p_requires_three_month_warning boolean DEFAULT true,
  p_whatsapp_template_ar text DEFAULT NULL,
  p_whatsapp_template_en text DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS TABLE ( … same columns and order as get_project … )
```

### 11.4 `public.update_project`

```text
public.update_project(
  p_project_id uuid,
  p_expected_updated_at timestamptz,
  p_name text,
  p_company_id uuid,
  p_domain text,
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL,
  p_quota integer DEFAULT NULL,
  p_min_age integer DEFAULT NULL,
  p_max_age integer DEFAULT NULL,
  p_required_resident_type text DEFAULT 'any',
  p_eligibility_notes text DEFAULT NULL,
  p_requires_three_month_warning boolean DEFAULT true,
  p_whatsapp_template_ar text DEFAULT NULL,
  p_whatsapp_template_en text DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS TABLE ( … same columns and order as get_project … )
```

### 11.5 `public.transition_project_status`

```text
public.transition_project_status(
  p_project_id uuid,
  p_expected_updated_at timestamptz,
  p_target_status text
)
RETURNS TABLE ( … same columns and order as get_project … )
```

**Identity signatures (for collision checks / grants):**

| Function | Identity args |
|---|---|
| `list_projects` | `text, uuid, text, integer, integer` |
| `get_project` | `uuid` |
| `create_project` | `text, uuid, text, date, date, integer, integer, integer, text, text, boolean, text, text, text` |
| `update_project` | `uuid, timestamptz, text, uuid, text, date, date, integer, integer, integer, text, text, boolean, text, text, text` |
| `transition_project_status` | `uuid, timestamptz, text` |

---

## 12. Exact return shapes

### List row order (frozen)

1. `project_id` uuid
2. `project_name` text
3. `company_id` uuid
4. `company_name` text
5. `domain` text
6. `status` text
7. `start_date` date
8. `end_date` date
9. `quota` integer
10. `updated_at` timestamptz

### Detail / create / update / transition row order (frozen)

1. `project_id` uuid
2. `project_name` text
3. `company_id` uuid
4. `company_name` text
5. `domain` text
6. `status` text
7. `start_date` date
8. `end_date` date
9. `quota` integer
10. `min_age` integer
11. `max_age` integer
12. `required_resident_type` text
13. `eligibility_notes` text
14. `requires_three_month_warning` boolean
15. `whatsapp_template_ar` text
16. `whatsapp_template_en` text
17. `notes` text
18. `created_at` timestamptz
19. `updated_at` timestamptz

No additional columns. No finance. No participation counts.

---

## 13. RPC authorization and behavior

### Common security envelope (all five)

| Requirement | Freeze |
|---|---|
| Language | `plpgsql` |
| Security | **SECURITY DEFINER** |
| search_path | `SET search_path = pg_catalog, public` |
| Owner | `postgres` |
| EXECUTE | GRANT to `authenticated` only; REVOKE from `PUBLIC`, `anon`, `service_role` |
| Profile | Require active non-deleted profile; else `project_profile_unavailable` or `project_access_denied` (freeze: **`project_access_denied`** for inactive/missing profile unless profile-specific messaging needed — use **`project_profile_unavailable`** when profile resolution fails distinctly) |
| Account | `current_account_id()`; all rows scoped to that account |
| Roles | `is_owner() OR is_support_helper()` for list/get/create/update; **Owner only** for transition |
| Deleted projects | Always exclude `projects.deleted_at IS NOT NULL` |
| Deleted companies | Exclude joins / parent checks where `companies.deleted_at IS NOT NULL` |
| Errors | `RAISE EXCEPTION … MESSAGE = '<token>'` with stable tokens only |

### `list_projects`

| Rule | Behavior |
|---|---|
| Access | Owner or Support Helper |
| Filters | `deleted_at IS NULL` project; company `deleted_at IS NULL` |
| Search | optional `p_search`: match project name **or** company name (case-insensitive substring after trim); empty → null |
| `p_company_id` | optional exact company filter (must be same account if provided; invalid/missing company filter → empty list or `invalid_company_id` if non-null malformed UUID) |
| `p_status` | optional exact status; if non-null must be valid enum else `invalid_project_status` |
| Pagination | `p_limit` default 25, min 1, max **50**; `p_offset` default 0, `>= 0`; else `invalid_project_pagination` |
| Order | **`updated_at DESC, id DESC`** |
| Joins | `companies` for name only; no finance tables |

### `get_project`

| Rule | Behavior |
|---|---|
| Access | Owner or Support Helper |
| Not found | missing, deleted, wrong account, or company deleted → **`project_not_found`** (no leak) |
| Null id | `invalid_project_id` |

### `create_project`

| Rule | Behavior |
|---|---|
| Access | Owner or Support Helper |
| `account_id` | from current profile only |
| `created_by` | current profile id |
| `updated_by` | **NULL** on create (frozen) |
| `status` | force **`draft`** |
| Company | same account, `deleted_at IS NULL`; else `project_company_not_found` |
| Return | full detail shape |

### `update_project`

| Rule | Behavior |
|---|---|
| Access | Owner or Support Helper |
| Lock | `SELECT … FOR UPDATE` target project |
| Concurrency | `p_expected_updated_at` **required**; compare exact `updated_at`; mismatch → `stale_project_version` |
| Status filter | `closed` / `cancelled` → `project_not_editable` |
| Company | if `status = active` and `p_company_id` ≠ current → `project_company_locked`; if draft, re-validate company active/same-account |
| Status field | **never** updated by this RPC |
| `updated_by` | current profile |
| Return | full detail shape |

### `transition_project_status`

| Rule | Behavior |
|---|---|
| Access | **Owner only**; SH → `project_access_denied` |
| Lock | `SELECT … FOR UPDATE` |
| Concurrency | mandatory `p_expected_updated_at` |
| Matrix | enforce §8 exactly |
| Return | full detail shape |

---

## 14. Input validation and bounds

### Text hygiene

| Field | Transform | Max length | Error |
|---|---|---|---|
| `name` / list search | trim + collapse whitespace | name **120**; search **120** | `invalid_project_name` / `invalid_project_pagination` or search as empty |
| `eligibility_notes` | trim; empty → NULL | **2000** | `invalid_project_text_length` |
| `notes` | trim; empty → NULL | **2000** | `invalid_project_text_length` |
| `whatsapp_template_ar` / `_en` | trim; empty → NULL | **2000** each | `invalid_project_text_length` |

Name after hygiene must be non-empty and `char_length <= 120`.

### Enums

| Field | Allowed | Error |
|---|---|---|
| `domain` | telecom, banking, insurance, product, other | `invalid_project_domain` |
| `status` (filters/transition target) | draft, active, closed, cancelled | `invalid_project_status` |
| `required_resident_type` | any, saudi, non_saudi, unknown | `invalid_project_resident_type` |

### Numeric / dates

| Rule | Error |
|---|---|
| `quota` NULL or integer `>= 0` | `invalid_project_quota` |
| `min_age` / `max_age` NULL or `>= 0`; if both set `max_age >= min_age` | `invalid_project_age_range` |
| if both dates set `end_date >= start_date` | `invalid_project_dates` |

DB CHECKs remain backstop; RPCs validate first for stable tokens.

### UUID

Malformed / null required uuid → `invalid_project_id` or `invalid_company_id`.

---

## 15. Stable error contract

| Token | Condition | Raised by |
|---|---|---|
| `project_access_denied` | not Owner/SH; SH calling transition; profile not authorized | RPC |
| `project_profile_unavailable` | cannot resolve active profile/account | RPC |
| `invalid_project_id` | null/malformed project id | RPC / app |
| `invalid_company_id` | null/malformed company id on write | RPC / app |
| `invalid_project_name` | empty/overlong name | RPC / app |
| `invalid_project_domain` | bad domain | RPC / app |
| `invalid_project_status` | bad status filter/target vocabulary | RPC / app |
| `invalid_project_dates` | end before start | RPC / app |
| `invalid_project_quota` | negative quota | RPC / app |
| `invalid_project_age_range` | negative ages or max < min | RPC / app |
| `invalid_project_resident_type` | bad resident enum | RPC / app |
| `invalid_project_pagination` | limit/offset out of range | RPC / app |
| `invalid_project_text_length` | notes/templates/eligibility over bound | RPC / app |
| `project_not_found` | missing/deleted/cross-account/unavailable company parent on get | RPC |
| `project_company_not_found` | company missing/deleted/cross-account on create/update | RPC |
| `project_company_unavailable` | **reserved** (not required MVP external); prefer `project_company_not_found` | — |
| `project_not_editable` | update on closed/cancelled | RPC |
| `project_company_locked` | company change on active | RPC |
| `invalid_project_status_transition` | forbidden or same-status transition | RPC |
| `stale_project_version` | expected_updated_at mismatch | RPC |
| `unexpected_project_error` | unknown / fail-closed | app map |

**Rules:** never return PostgreSQL detail, SQLSTATE, constraint names, or stack to browsers. App maps MESSAGE tokens only.

---

## 16. Optimistic concurrency

| Surface | Rule |
|---|---|
| `update_project` | `p_expected_updated_at` **required** (no default) |
| `transition_project_status` | same |
| Comparison | exact equality to row `updated_at` after lock |
| Stale | `stale_project_version`; no auto-retry; no replace with `now()` as expected input |
| Success | `updated_at` advanced by `set_updated_at` trigger; return new value |
| Client | expected timestamp from loaded record only (hidden form field); never browser clock |

---

## 17. Transaction and locking

| Step | Behavior |
|---|---|
| Create | validate profile → lock/share company row (active) → INSERT project draft → RETURNING detail join company |
| Update | lock project FOR UPDATE → stale check → status editability → company rules → UPDATE → return detail |
| Transition | lock project FOR UPDATE → stale check → role Owner → matrix → UPDATE status → return detail |
| Race | company deleted between check and write fails at hardened trigger |
| Fail-closed order | auth → lock → concurrency → business rules → write |

---

## 18. RLS and ACL posture (non-changes)

| Object | Decision |
|---|---|
| `sel_projects` | **Unchanged** — Owner-only base SELECT |
| `ins_projects` | **Unchanged** — not a client write path (no INSERT privilege) |
| UPDATE/DELETE policies on `projects` | **Remain absent** |
| Authenticated table privileges | **SELECT only** — do **not** grant INSERT/UPDATE/DELETE |
| anon / service_role | **no** relation privileges |
| Product writes | **only** via SECURITY DEFINER RPCs |

Do **not** loosen RLS for Support Helper base reads.

---

## 19. Company selector dependency

Use existing Companies RPCs:

| RPC | Use |
|---|---|
| `list_companies` | searchable active companies for create/edit (draft) |
| `get_company` | verify selected company before submit |

Both are active-company-only and finance-free. **No** new Company selector RPC. **No** direct `public.companies` access from app for SH.

---

## 20. Legacy support RPC treatment

| Surface | Treatment |
|---|---|
| `support_project_directory` | **Leave installed**; not product list API |
| `support_project_participation_summary` | Leave; participation domain |
| `support_participation_operational_rows` | Leave |
| `enforce_participation_project_state` | Leave; still requires `active` + non-deleted project for membership writes |

Projects MVP UI/app must call **only** the five new RPCs for Projects product surfaces.

---

## 21. Migration implementation plan

Ordered steps for `ZAM-PROJECTS-SCHEMA-RPC-MIGRATION-1` (not executed here):

1. Preconditions: `projects`, companies FK, existing trigger function present.
2. Replace `check_project_account_consistency()` body with soft-delete-aware lookup + fixed search_path.
3. Create five RPCs with frozen signatures, DEFINER, search_path, grants/revokes.
4. No new table columns; no PFS auto-create; no unique name index.
5. No changes to relation ACLs/RLS policies unless a proven defect blocks DEFINER writes (prefer none).
6. In-script postconditions: function identities exist; EXECUTE matrix; trigger still attached; soft-delete company rejected in definition text / optional catalog checks.
7. **Do not** broaden `set_updated_at` hardening unless required.

---

## 22. Application contract plan

After migration apply + verify:

1. `ZAM-PROJECTS-APP-CONTRACTS-1` — types, parse bounds, map rows, error map, RPC wrappers, tests.
2. `ZAM-PROJECTS-LIST-PAGE-1`
3. `ZAM-PROJECTS-CREATE-PAGE-1`
4. `ZAM-PROJECTS-DETAIL-PAGE-1`
5. `ZAM-PROJECTS-EDIT-PAGE-1` (concurrency + draft company change)
6. Lifecycle control on detail (Owner-only) may ship with detail or a thin follow-on; transitions use `transition_project_status` only.
7. Manual smoke + docs closeout.

Patterns: mirror Companies Server Action → RPC, Arabic fail-closed errors, no service-role, no direct table writes.

---

## 23. Automated test plan

| Area | Cases |
|---|---|
| Input bounds | name/search/notes/templates lengths; enums; dates; ages; quota |
| RPC arg builders | exact parameter names/order; expected_updated_at always on update/transition |
| Map rows | detail/list shapes; reject finance keys |
| Errors | all tokens; fail-closed unknown |
| Security | no `.from('projects').update/insert`; no service-role |
| Lifecycle | matrix allowed/forbidden; SH denied transition |
| Company | locked when active; draft may change; deleted company rejected at contract level |

---

## 24. Manual smoke plan (later)

**Owner:** list/create/detail/edit; draft→active; active company lock; stale concurrency; closed read-only.
**Support Helper:** list/create/detail/edit operational; **cannot** transition; **no** finance.
**Negative:** soft-deleted company select/create fails safely; cross-account not found; invalid transition.
**No** participation/payment smoke in Projects closeout.

---

## 25. Deferred / out of scope

- Migration apply claims / production readiness
- UI implementation
- PFS / financials / payments / settlements / wages
- Respondent / participation product workflows
- Project name uniqueness
- Delete/restore/archive/reopen
- Company reassignment beyond draft company_id change
- Broad support RPC refactor
- Cross-account second-account architecture

---

## 26. HOLD conditions (for migration/implementation)

HOLD if:

- lifecycle matrix or role rules are altered without product approval;
- finance fields appear in RPC returns;
- soft-delete company check omitted from trigger or create/update;
- SH gains transition or finance;
- expected_updated_at optional or client-generated;
- parameter order introduces 42P13;
- direct table grants added for mutation;
- production readiness claimed without evidence.

---

## 27. Exact next task

**`ZAM-PROJECTS-APP-CONTRACTS-1`**

Implement application types, parsers, mappers, error mapping, and RPC wrappers against the installed five Projects RPCs (after corrections). UI and browser smoke remain later tasks.

### DEV/DEMO install note (not a migration step)

| Artifact | Commit | Apply | Verify |
|---|---|---|---|
| `20260716160000_projects_mvp_schema_rpc.sql` | `1cb9a75e3eb5ee9d88dbf3e59011a1bf2b12d9f5` | Success. No rows returned | Initial **HOLD** (search token + transition company lock) |
| `20260716170000_projects_mvp_rpc_corrections.sql` | `dc03784d2822a642de00af2df8481ccd1c792b0e` | Success. No rows returned | Final **PASS** |

---

## Explicit non-claims

- Application contracts / UI **not** implemented.
- Browser / manual application smoke **not** performed.
- Production readiness **not** claimed.
- Supabase migration-history registration **not** claimed.
- UI placeholder remains until later tasks.
