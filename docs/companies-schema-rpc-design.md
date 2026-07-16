# Companies MVP — schema and RPC design

**Status:** DESIGN RECORDED (implementation not started)
**Task:** `ZAM-COMPANIES-SCHEMA-RPC-DESIGN-1`
**Authority:** Mozfer-approved Companies MVP contract; live DEV/DEMO catalog PASS (`DWR-COMP-026`); `docs/roles-permissions.md`; `docs/database-schema.md`
**Designated DEV/DEMO:** `gdegnwglakyblnmxgiwx` (PostgreSQL 17.6)
**Next task after design review:** `ZAM-COMPANIES-SCHEMA-RPC-MIGRATION-1` (SQL draft only; not this task)

This document freezes implementation-ready database and RPC decisions. It does **not** create migrations, apply SQL, or implement application code.

---

## 1. Baseline (verified)

| Fact | Evidence |
|---|---|
| `public.companies` exists with columns `id`, `account_id`, `name`, `contact_person`, `phone`, `notes`, `created_by`, `updated_by`, `created_at`, `updated_at`, `deleted_at` | Live catalog PASS |
| Authenticated relation privilege | **SELECT only** |
| `anon` / `PUBLIC` / `service_role` table privileges | **none** |
| RLS | enabled; not forced |
| Indexes on companies | `companies_pkey` only |
| Triggers | `trg_companies_updated_at` → `set_updated_at()`; no audit trigger |
| Name uniqueness / phone norm | **absent** |
| Companies CRUD RPCs | **absent** (no name collision) |
| `projects.company_id` | `NOT NULL` FK → `companies(id)` NO ACTION |
| Account consistency | `trg_projects_account_consistency` / `check_project_account_consistency()` present |
| Project company-scoped index | **absent** (nonblocking design requirement) |

**Table shape decision:** keep existing `companies` columns. **No** new public columns (no `normalized_name` storage column, no status column). Normalization is expression/function-based.

---

## 2. Resolved product and technical decisions

| Decision | Resolution | Justification |
|---|---|---|
| Mutation path | Server Action → authenticated RPC only | Contract; no direct base-table mutation |
| List/detail path | Unified RPCs for **both** `owner` and `support_helper` | SH must not get broad table SELECT; Owner gains consistent counts/search; optional Owner direct SELECT remains via existing RLS for non-RPC helpers |
| `sel_companies` | **Remains Owner-only** | Catalog + role matrix; do not broaden SH base reads |
| `ins_companies` policy | Leave as-is; not a client write path | Authenticated has no INSERT privilege post-ACL hardening; DEFINER RPCs write as function owner |
| Lifecycle | No delete/restore/status RPCs or UI | MVP contract |
| `deleted_at` | Foundation only; RPCs never set/clear it | Soft-delete deferred (`DWR-COMP-001`+) |
| Finance | No financial columns/joins/return fields | Permanent Companies boundary |
| Concurrency | **Required** `p_expected_updated_at` on update | Multi-user Owner/SH edits; fail closed with `stale_company_version` |
| List search | `name` + `contact_person` only | Contract; phone search not justified for MVP |
| List page size | default **25**, max **50** | Aligns with UI roadmap; stricter than support RPC max 200 |
| Order | `normalize_company_name(name) ASC`, `id ASC` | Deterministic; matches UI roadmap |
| Recent projects in get RPC | **Not included** | Detail UI can load projects later; keeps RPC finance-free and bounded |
| Audit trigger on companies | **Not added** in this MVP migration | Out of scope; not required by contract |
| Duplicate enforcement | Partial unique **expression** index + RPC mapping of `23505` | Race-safe; deleted rows excluded |

---

## 3. Database enforcement

### 3.1 Name normalization (DB-authoritative)

**Helper (internal):**

```text
public.normalize_company_name(p_name text) RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
STRICT behavior: NULL input → NULL
```

**Exact algorithm (frozen):**

1. If `p_name` is NULL → return NULL.
2. Collapse internal Unicode whitespace runs to a single ASCII space:
   `regexp_replace(p_name, '[[:space:]]+', ' ', 'g')`
3. Outer trim: `btrim(...)`.
4. Case-fold: `lower(...)` (deterministic for Latin; Arabic unchanged by `lower`).
5. Result is the uniqueness key. Empty string is not a valid active name (rejected before insert).

**Stored `name` column:** store **display** value = step 2–3 only (**trim + collapse spaces**, **preserve original case**). Uniqueness always compares via `normalize_company_name(name)`.

**Validation (RPC, before write):**

| Rule | Error |
|---|---|
| NULL or empty after collapse+trim | `invalid_company_name` |
| `char_length(display_name) > 120` | `invalid_company_name` |

**Unique partial index (exact):**

```sql
CREATE UNIQUE INDEX idx_companies_account_norm_name_active
ON public.companies (
  account_id,
  (public.normalize_company_name(name))
)
WHERE deleted_at IS NULL;
```

- Scope: one active normalized name per account.
- Deleted rows (`deleted_at IS NOT NULL`) do **not** participate → name reuse allowed after future soft-delete.
- Race-safe: concurrent inserts/updates that collide raise unique_violation → map to `duplicate_company_name`.

**No generated column.** Expression index + IMMUTABLE function is sufficient and avoids unnecessary public columns.

### 3.2 Phone normalization and validation

**Helper (internal):**

```text
public.normalize_company_phone(p_phone text) RETURNS text
LANGUAGE plpgsql
IMMUTABLE
PARALLEL SAFE
```

**Exact algorithm (frozen):**

1. If `p_phone` IS NULL → return NULL.
2. `v := btrim(p_phone)`.
3. If `v = ''` → return NULL (optional field).
4. Strip formatting only: remove spaces, `+`, `-`, `(`, `)`:
   `regexp_replace(v, '[[:space:]\+\-\(\)]', '', 'g')`.
5. If remaining string is **not** all digits (`!~ '^[0-9]+$'`) → raise `invalid_company_phone`.
6. Saudi local mobile: if value matches `^05[0-9]{8}$` (exactly 10 digits, prefix `05`) → replace leading `05` with `9665` (result length 12).
7. Final length must be between **8** and **15** inclusive; else `invalid_company_phone`.
8. Do **not** invent other country-code rewrites (no silent `0`→`966`, no `5xxxxxxxx` guessing).
9. Return digit string; store only this form (or NULL).

**CHECK constraint (defense in depth, exact):**

```sql
ALTER TABLE public.companies
  ADD CONSTRAINT chk_companies_phone_normalized
  CHECK (
    phone IS NULL
    OR phone ~ '^[0-9]{8,15}$'
  );
```

Phone is **not** unique.

**Optional fields empty → NULL:** blank `contact_person` / `notes` after trim → NULL.

| Field | Max after trim | Empty after trim | Error MESSAGE |
|---|---|---|---|
| `name` | 120 | reject | `invalid_company_name` |
| `contact_person` | 80 | → NULL | over max → `invalid_company_contact_person` |
| `notes` | 2000 | → NULL | over max → `invalid_company_notes` |
| `phone` | 8–15 digits after norm | → NULL | `invalid_company_phone` |

`invalid_company_contact_person` and `invalid_company_notes` are design-approved stable extensions of the contract error set (name/phone codes remain mandatory).

### 3.3 No unnecessary public columns

No new columns on `companies` or `projects`. Helpers + indexes + RPCs only.

---

## 4. Indexes

| Name | Definition | Supports |
|---|---|---|
| `idx_companies_account_norm_name_active` | `UNIQUE (account_id, normalize_company_name(name)) WHERE deleted_at IS NULL` | Active duplicate enforcement; list order by normalized name within account |
| `idx_projects_account_company_status_live` | `(account_id, company_id, status) WHERE deleted_at IS NULL` | Active/completed project counts per company; company-scoped project listing later |

**Companies list search:** MVP uses `ILIKE` on `name` / `contact_person` with account filter + `deleted_at IS NULL`. No additional trigram index in MVP (scale small). Order uses expression already covered by unique index leading columns for full-account ordered scans.

**Exact projects index SQL:**

```sql
CREATE INDEX idx_projects_account_company_status_live
ON public.projects (account_id, company_id, status)
WHERE deleted_at IS NULL;
```

Column order: `account_id` (tenant), `company_id` (group), `status` (filter active/closed). Partial predicate excludes deleted projects from the index.

---

## 5. RPC contracts

All four RPCs:

- `LANGUAGE plpgsql`
- `SECURITY DEFINER`
- `SET search_path = pg_catalog, public`
- Owner role of functions: `postgres` (migration owner)
- `GRANT EXECUTE … TO authenticated` only
- `REVOKE EXECUTE … FROM PUBLIC, anon, service_role`
- No dynamic SQL
- Active profile required via `current_account_id()` / role helpers (`active = true AND deleted_at IS NULL` already inside helpers)
- Authorize: `is_owner() OR is_support_helper()`; else `company_access_denied` (`ERRCODE = '42501'`)
- Account scope: always `current_account_id()`; never trust client `account_id`
- Deleted companies: treat as not found (`company_not_found`) for get/update; excluded from list

### 5.1 Common return shape (operational only)

```text
company_id              uuid
account_id              uuid
name                    text
contact_person          text
phone                   text
notes                   text
created_by              uuid
updated_by              uuid
created_at              timestamptz
updated_at              timestamptz
active_projects_count   integer
completed_projects_count integer
```

**Metrics (exact):**

```sql
active_projects_count := count(*) FILTER (
  WHERE projects.deleted_at IS NULL AND projects.status = 'active'
)
completed_projects_count := count(*) FILTER (
  WHERE projects.deleted_at IS NULL AND projects.status = 'closed'
)
```

Scoped to `projects.account_id = v_account_id` and `projects.company_id = company.id`.
Never join financial tables. Never return price, payment, or financial summary fields.

### 5.2 `list_companies`

```text
public.list_companies(
  p_search text DEFAULT NULL,
  p_limit integer DEFAULT 25,
  p_offset integer DEFAULT 0
)
RETURNS TABLE ( … common shape … )
STABLE
```

| Rule | Detail |
|---|---|
| Pagination | `p_limit` ∈ [1, 50]; `p_offset` ≥ 0; else `invalid_pagination` (`22023`) |
| Search | If `p_search` NULL or `btrim(p_search) = ''` → no text filter. Else trim; if length > 120 → `invalid_pagination` |
| Match | Case-insensitive substring on `name` OR `contact_person` only (`ILIKE` with escape of `%`, `_`, `\`) |
| Filter | `account_id = v_account_id AND deleted_at IS NULL` |
| Order | `normalize_company_name(name) ASC, id ASC` |
| Counts | Include both active and completed counts per row (UI may display only active on list) |

### 5.3 `get_company`

```text
public.get_company(p_company_id uuid)
RETURNS TABLE ( … common shape … )
STABLE
```

| Rule | Detail |
|---|---|
| Missing / deleted / other account | `company_not_found` (`ERRCODE` `P0002`, MESSAGE `company_not_found`) |
| Unauthorized role | `company_access_denied` |
| Preview projects | **None** in this RPC |

### 5.4 `create_company`

```text
public.create_company(
  p_name text,
  p_contact_person text DEFAULT NULL,
  p_phone text DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS TABLE ( … common shape … )
VOLATILE
```

**Sequence (single transaction):**

1. Authorize role + resolve `v_account_id`, `v_profile_id` (`current_profile_id()`); if either NULL → `company_access_denied`.
2. Normalize/validate name → display name; reject invalid.
3. Normalize contact_person / notes (trim; empty → NULL; length checks).
4. `v_phone := normalize_company_phone(p_phone)`.
5. `INSERT INTO companies (account_id, name, contact_person, phone, notes, created_by, updated_by)`
   values `(v_account_id, display_name, …, v_profile_id, v_profile_id)`.
6. On unique_violation → `duplicate_company_name` (`23505` mapped; MESSAGE exact).
7. Return row via same shape as `get_company` (counts = 0 for new company).

### 5.5 `update_company`

```text
public.update_company(
  p_company_id uuid,
  p_name text,
  p_expected_updated_at timestamptz,
  p_contact_person text DEFAULT NULL,
  p_phone text DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS TABLE ( … common shape … )
VOLATILE
```

**Parameter order (PostgreSQL):** required inputs (`p_company_id`, `p_name`, `p_expected_updated_at`) precede defaulted optional fields. Identity: `update_company(uuid, text, timestamptz, text, text, text)`.

**Concurrency:** `p_expected_updated_at` is **required** (NOT NULL; no DEFAULT). UI supplies `updated_at` from last read.

**Sequence:**

1. Authorize + resolve account/profile.
2. `SELECT … FROM companies WHERE id = p_company_id AND account_id = v_account_id AND deleted_at IS NULL FOR UPDATE`.
3. If not found → `company_not_found`.
4. If `updated_at IS DISTINCT FROM p_expected_updated_at` → `stale_company_version` (`40001` or `P0001` — freeze **`P0001`** MESSAGE `stale_company_version`).
5. Normalize/validate inputs (same as create).
6. `UPDATE` set `name`, `contact_person`, `phone`, `notes`, `updated_by = v_profile_id` ( `updated_at` via existing trigger).
7. Unique violation → `duplicate_company_name`.
8. Return updated row with counts.
9. Never modify `id`, `account_id`, `created_by`, `created_at`, `deleted_at`.

### 5.6 Error envelope (stable `MESSAGE` strings)

| MESSAGE | When | Suggested ERRCODE |
|---|---|---|
| `company_access_denied` | Not owner/SH; missing active profile/account | `42501` |
| `company_not_found` | Missing, deleted, or cross-account | `P0002` |
| `duplicate_company_name` | Unique index conflict or pre-check | `23505` (or re-raise mapped) |
| `invalid_company_name` | Name empty/invalid/too long | `22023` |
| `invalid_company_contact_person` | contact_person > 80 | `22023` |
| `invalid_company_notes` | notes > 2000 | `22023` |
| `invalid_company_phone` | Phone rules fail | `22023` |
| `invalid_pagination` | limit/offset/search length | `22023` |
| `stale_company_version` | expected_updated_at mismatch | `P0001` |

Application maps these tokens to Arabic UI strings (same pattern as auth profile errors).

---

## 6. Role and ACL matrix

| Capability | Owner | Support Helper | anon | service_role |
|---|---|---|---|---|
| `list_companies` EXECUTE | Yes | Yes | No | No |
| `get_company` EXECUTE | Yes | Yes | No | No |
| `create_company` EXECUTE | Yes | Yes | No | No |
| `update_company` EXECUTE | Yes | Yes | No | No |
| Direct SELECT `companies` (RLS) | Yes (Owner-only policy) | **No** | No | No |
| Direct INSERT/UPDATE/DELETE privilege | **No** | **No** | No | No |
| Financial fields via Companies RPCs | **No** | **No** | — | — |
| Lifecycle mutation | **No** | **No** | — | — |

### RLS / ACL reconciliation

1. **Authenticated SELECT-only** on `companies` / `projects` remains after hardening.
2. **Owner** may read permitted company rows via RLS for optional server helpers; MVP app path uses RPCs for list (with counts) and mutations.
3. **Support Helper** has **no** useful base-table SELECT (`sel_companies` is Owner-only). All SH Companies access is via the four RPCs.
4. **SECURITY DEFINER** RPCs bypass RLS for controlled writes and for SH reads, but enforce account + role in function body (fail closed).
5. **Do not** add SH SELECT policies on `companies`.
6. **Do not** GRANT INSERT/UPDATE on `companies` to `authenticated`.
7. Internal helpers `normalize_company_name`, `normalize_company_phone` (and any private assert helper): **REVOKE EXECUTE FROM PUBLIC, anon, authenticated, service_role** (server-only; called by DEFINER RPCs).

---

## 7. Migration plan (ordered; not executed here)

**Proposed filename (later task):**
`supabase/migrations/20260716120000_companies_mvp_schema_rpc.sql`

**Order:**

1. **Preflight (DO block, fail closed)**
   - Detect active duplicate pairs that would break unique index:
     same `account_id` + `normalize_company_name(name)` with `deleted_at IS NULL` and count > 1.
   - If any → `RAISE EXCEPTION` with clear message (manual cleanup required).
   - DEV/DEMO expected empty/clean.

2. **Helpers**
   - `normalize_company_name`
   - `normalize_company_phone`
   - Comments `managed_by: <migration_id>`

3. **Phone CHECK** on `companies` (validate existing rows first: invalid phones fail migration — preflight report).

4. **Indexes**
   - `idx_companies_account_norm_name_active`
   - `idx_projects_account_company_status_live`

5. **RPCs**
   - `list_companies`, `get_company`, `create_company`, `update_company`
   - `CREATE OR REPLACE` for idempotent re-apply of function bodies

6. **Comments** on functions/indexes

7. **Grants/revokes**
   - EXECUTE on four RPCs: grant authenticated; revoke PUBLIC/anon/service_role
   - EXECUTE on helpers: revoke all client roles

8. **Postcondition assertions (catalog only)**
   - Index exists and is unique/partial as designed
   - Function signatures, `prosecdef`, `proconfig` search_path
   - EXECUTE ACL matrix
   - Relation ACL still authenticated SELECT-only on `companies`
   - RLS still enabled
   - No unexpected grants

**Idempotency:**

- Functions: `CREATE OR REPLACE`
- Indexes: `CREATE INDEX IF NOT EXISTS` only if exact definition matches; otherwise drop/recreate in controlled migration (prefer explicit drop if redefining)
- Constraints: add only if not exists (query `pg_constraint`)

**Locks:**

- Index builds on live DEV/DEMO: expect brief locks; companies/projects small. Prefer default transaction for DEV.
- Avoid `CREATE INDEX CONCURRENTLY` inside a multi-statement transaction wrapper if using single BEGIN/COMMIT migration script — use regular `CREATE INDEX` for small DEV tables.

**Rollback strategy:**

- Forward-only preferred.
- Compensating migration would: drop four RPCs, drop two indexes, drop phone check, drop helpers (only if no dependents).
- No data deletion in rollback of design objects.
- Do not drop `companies` table or clear business rows.

**DEV/DEMO apply sequence (future apply task):**

1. Review SQL draft + independent review PASS
2. Mozfer SQL Editor on `gdegnwglakyblnmxgiwx` as `postgres`
3. Run full script once in transaction
4. Run verification packet
5. Owner + Support Helper smoke (section 9)
6. Docs/status sync + commit migration if not already committed

**This design task creates no SQL file and executes no SQL.**

---

## 8. Verification plan (read-only after apply)

| Check | Expected |
|---|---|
| Columns on `companies` | Unchanged set; no financial columns |
| `chk_companies_phone_normalized` | Present |
| Unique index | Present; partial `deleted_at IS NULL`; expression on `normalize_company_name(name)` |
| Projects index | Present with partial predicate |
| Four RPCs | Signatures match section 5; SECURITY DEFINER; `search_path=pg_catalog, public` |
| Helpers | IMMUTABLE; client EXECUTE false |
| EXECUTE ACL | authenticated true; PUBLIC/anon/service_role false on RPCs |
| Relation ACL | authenticated SELECT only; no INSERT/UPDATE/DELETE… |
| RLS | still enabled on companies/projects |
| Duplicate race | two concurrent creates same norm name → one success, one `duplicate_company_name` |
| Phone | `05xxxxxxxx` → `9665xxxxxxxx`; invalid rejected |
| Account isolation | cross-account get/update → `company_not_found` |
| Role | non-owner/non-SH → `company_access_denied` |
| Counts | active/closed only; draft/cancelled/deleted excluded |
| Deleted companies | excluded from list; get/update not found |
| Finance | RPC definitions contain no financial relation references |

---

## 9. Manual smoke plan (Mozfer; after apply + app wiring as available)

### Owner

1. List empty / with rows; order by normalized name.
2. Search by name and by contact person.
3. Create valid company; detail shows counts 0.
4. Create duplicate normalized name → `duplicate_company_name`.
5. Invalid phone → `invalid_company_phone`.
6. Edit fields; `updated_at` changes; counts stable.
7. Stale `p_expected_updated_at` → `stale_company_version`.
8. Detail shows active/completed counts when projects exist.

### Support Helper

1. List / search / create / edit / detail same operational fields.
2. Confirm UI and RPC payloads contain **no** finance.
3. Confirm no direct table read path required.

### Negative

| Case | Expected |
|---|---|
| anon / no session | no EXECUTE / access denied |
| Wrong account company id | `company_not_found` |
| Deleted company id | `company_not_found` |
| Direct table INSERT/UPDATE as authenticated | privilege failure |
| `p_limit` 0, 51, NULL; negative offset | `invalid_pagination` |
| Stale update token | `stale_company_version` |

---

## 10. Application integration notes (non-binding for this task)

- Routes: `/companies`, `/companies/new`, `/companies/[id]`, `/companies/[id]/edit`.
- Server Actions call RPCs with request-scoped authenticated Supabase client.
- Never pass `account_id` or role from the browser as authority.
- Map RPC `MESSAGE` tokens to Arabic errors.
- Phone inputs displayed LTR.
- List UI may show only `active_projects_count` while RPC returns both counts.

---

## 11. Explicit non-claims

- No migration file exists yet.
- No DEV/DEMO apply of this design.
- No Companies UI/RPC implementation.
- No production readiness.
- No Support Helper runtime smoke for Companies yet.
- Live catalog PASS ≠ schema design implementation.

---

## 12. Source and convention references

- Live catalog: `docs/companies-live-catalog-verification.md`
- Contract / roles: `docs/roles-permissions.md`, `docs/database-schema.md`
- Support RPC patterns: `supabase/migrations/202607130002_role_safe_read_surfaces.sql` (pagination, SECURITY DEFINER, search_path, EXECUTE matrix)
- ACL posture: `supabase/migrations/20260715120000_harden_core_acl_defaults.sql`
- Core table: `supabase/migrations/202607060001_zamblak_core_schema.sql`
