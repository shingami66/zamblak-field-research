# Respondents MVP — schema and RPC design

**Status:** DESIGN FROZEN (not implemented; no migration SQL in this task)  
**Task:** `ZAM-RESPONDENTS-SCHEMA-RPC-DESIGN-1`  
**Authority:**  
- `ZAM-RESPONDENTS-MVP-SCOPE-REVIEW-1` / evidence-close (PASS WITH WARN)  
- Live catalog close `ZAM-RESPONDENTS-LIVE-CATALOG-RESULT-CLOSE-1` (PASS WITH WARN) — `docs/respondents-live-catalog-verification.md`  
- Product requirements, roles-permissions, database-schema  
- Committed migrations (core schema, role-safe surfaces, ACL hardening, Companies/Projects RPC precedent)  
**Designated DEV/DEMO:** `gdegnwglakyblnmxgiwx` (PostgreSQL **17.6**)  
**Production readiness:** **not claimed**  
**Next task:** **`ZAM-RESPONDENTS-SCHEMA-RPC-MIGRATION-1`**

This document freezes **database and RPC decisions** for the Respondent Registry MVP. It does **not** write migration SQL, apply anything, wire the application, or claim runtime smoke.

Structural and security precedent only: `docs/companies-schema-rpc-design.md`, `docs/projects-schema-rpc-design.md`. Field sets and domain rules are Respondent-specific.

---

## 1. Status and authority

| Item | Value |
|---|---|
| Design state | **Frozen** for migration drafting |
| Migration / apply / app / smoke | **Not started** |
| Live catalog | **PASS WITH WARN** (Mozfer; metadata only) |
| Roles | Exact: `owner`, `support_helper` |
| Tenant key | `account_id` via server helpers only |

---

## 2. Purpose and scope

Define the complete Respondent Registry MVP operational contract:

- preserve existing `public.respondents` table (14 columns);
- internal Saudi-mobile normalization helper (CHECK-compatible);
- unified list / get / create / update RPCs for Owner and Support Helper;
- active-mobile uniqueness authority (existing partial unique index);
- optimistic concurrency on update;
- finance-free, participation-free, three-month-free registry surface;
- Server Action → authenticated RPC mutation path (later app work).

**In this task:** design document + status/roadmap sync only.

**Out of scope:** migration SQL; DEV apply; application contracts/UI/Server Actions/tests; soft-delete/restore; Participation add-to-project; three-month eligibility; import/export; WhatsApp; financials; review workflow.

---

## 3. Live catalog evidence

| Field | Value |
|---|---|
| Project | `gdegnwglakyblnmxgiwx` |
| PostgreSQL | **17.6** |
| Runner | Mozfer, SQL Editor, `postgres` |
| Writes / business rows | None |
| Verdict | **PASS WITH WARN** |

### Confirmed live facts (authoritative for design)

| Fact | Live result |
|---|---|
| `public.respondents` | Ordinary table; owner `postgres`; RLS enabled; forced false |
| Columns | Exact **14** (no missing/extra) |
| Authenticated relation privileges | **SELECT only** |
| PUBLIC / anon / service_role relation privileges | **none** |
| `normalized_mobile` CHECK | `^9665[0-9]{8}$` |
| Unique active mobile | `idx_respondents_unique_mobile_per_account` on `(account_id, normalized_mobile) WHERE deleted_at IS NULL` — present, valid, ready |
| Policies | `sel_respondents` (Owner + same-account + non-deleted SELECT); `ins_respondents` (INSERT; catalog role PUBLIC OID 0) |
| UPDATE / DELETE policies | **none** |
| CRUD RPC overloads | all **0** |
| Dedicated mobile helper | **absent** (`normalize_company_phone` must not be reused blindly) |
| Participation | FKs, unique respondent-per-project, account consistency, Project-state guard present |
| Migration history | unavailable (nonblocking) |

### WARNs carried into design

1. Migration history unavailable → do not claim registration; design does not depend on it.  
2. CRUD RPCs and mobile helper absent → **this design freezes them**.  
3. PUBLIC-scoped INSERT policy ineffective without INSERT privilege → **leave policy; RPC-only mutation**.  
4. Three-month eligibility not implemented → **out of Phase 5 registry RPCs**.

---

## 4. Existing table contract (preserved)

Keep `public.respondents` as-is. **No new public columns** in MVP.

| Column | Notes |
|---|---|
| `id` | uuid PK |
| `account_id` | uuid NOT NULL → `accounts(id)` — **tenant key** |
| `name` | text nullable |
| `mobile` | text NOT NULL |
| `normalized_mobile` | text NOT NULL; CHECK `^9665[0-9]{8}$` |
| `age` | integer nullable; CHECK `age IS NULL OR age >= 0` |
| `nationality` | text nullable |
| `resident_type` | text NOT NULL DEFAULT `'unknown'`; CHECK `saudi\|non_saudi\|unknown` |
| `notes` | text nullable |
| `created_by` / `updated_by` | uuid → `profiles(id)` nullable |
| `created_at` / `updated_at` | timestamptz NOT NULL, default `now()`; `updated_at` via existing trigger |
| `deleted_at` | timestamptz nullable — **foundation only** |

### Explicit non-additions

- no generated column;  
- no stored Project history;  
- no stored Participation counts;  
- no stored last-contact or last-project fields;  
- no stored financial fields;  
- no new lifecycle/status column;  
- `deleted_at` remains foundation only;  
- **no** delete or restore RPC in Respondent Registry MVP.

### Indexes / triggers preserved

| Object | Role |
|---|---|
| `idx_respondents_unique_mobile_per_account` | Final race authority for active mobile uniqueness |
| `trg_respondents_updated_at` | `set_updated_at()` |
| `audit_trg_respondents` | Audit trail (existing) |

Migration must **not** drop or weaken these.

---

## 5. Product and security invariants

1. Respondent Registry is the reusable master-record domain.  
2. Store each **active** Respondent once per account.  
3. Active uniqueness authority: `account_id + normalized_mobile` where `deleted_at IS NULL`.  
4. Registry create/update **does not** create Participation.  
5. Project history does **not** belong in the Respondent master row.  
6. Three-month same-domain behavior is **warning-only** (Participation phase).  
7. Same Respondent in the same active Project remains a **hard** Participation duplicate block (existing enforcement).  
8. Exact roles: `owner`, `support_helper`.  
9. Owner and Support Helper may list, view, create, and edit operational Respondent records via RPCs.  
10. Support Helper remains **finance-blind**.  
11. No prices, accepted-form billing signals, payments, settlements, dues, wages, or financial summaries.  
12. Browser-supplied `account_id`, `profile_id`, role, ownership, or authorization is **never** authority.  
13. Normal application paths do **not** use `service_role`.  
14. Direct base-table mutation remains **forbidden**.  
15. Sensitive mutations: later Server Action → authenticated RPC.  
16. No national ID, DOB, address, precise location, identity documents, or new profile/security identifiers.  
17. No production-readiness claim.

---

## 6. Field normalization and validation

### 6.1 `name`

| Rule | Value |
|---|---|
| Role | Operational display name |
| Required | **No** (column nullable; product allows empty name) |
| Normalize | Collapse Unicode whitespace runs to single ASCII space; outer `btrim`; **preserve case** |
| Blank after normalize | store **NULL** |
| Max length | **120** characters after normalize (Companies `name` precedent) |
| Over max / invalid | `invalid_respondent_name` |
| RPC param | never trust client as uniqueness key |

### 6.2 `mobile` (input) and storage

| Rule | Value |
|---|---|
| Required | **Yes** |
| Client authority | Input only; never returned in **errors or logs** |
| Canonical form | Exactly `^9665[0-9]{8}$` (12 digits) |
| Storage decision | **Both** `mobile` and `normalized_mobile` store the **same canonical value** after successful normalize |
| Justification | CHECK and uniqueness key on `normalized_mobile`; dual storage of one deterministic value avoids dual-format drift and keeps UI/display aligned with uniqueness authority. Raw user formatting is **not** retained. |

### 6.3 `normalized_mobile`

| Rule | Value |
|---|---|
| Source | **Server-derived only** via `normalize_respondent_mobile` |
| RPC parameter | **Never accepted** |
| Role | Active uniqueness + CHECK enforcement |

### 6.4 Mobile normalization helper

```text
public.normalize_respondent_mobile(p_mobile text) RETURNS text
LANGUAGE plpgsql
IMMUTABLE
PARALLEL SAFE
SET search_path = pg_catalog, public
```

**Posture:**

- Owner: `postgres`  
- **Not** client-callable  
- `REVOKE EXECUTE FROM PUBLIC, anon, authenticated, service_role`  
- Raise stable MESSAGE `invalid_respondent_mobile` (`ERRCODE` `22023`)  
- Error **must never** include the supplied mobile string  

**Exact algorithm (frozen):**

1. If `p_mobile` IS NULL → raise `invalid_respondent_mobile`.  
2. `v := btrim(p_mobile)`.  
3. If `v = ''` → raise `invalid_respondent_mobile`.  
4. Strip **only** these formatting characters: Unicode whitespace, `+`, `-`, `(`, `)`:  
   `v := regexp_replace(v, '[[:space:]\+\-\(\)]', '', 'g')`.  
5. If `v` is not entirely digits (`!~ '^[0-9]+$'`) → raise `invalid_respondent_mobile`.  
6. Shape rewrites (in order; first match wins):  
   - If `v ~ '^05[0-9]{8}$'` (local Saudi, 10 digits) → `v := '966' || substr(v, 2)` → yields `9665xxxxxxxx`.  
   - Else if `v ~ '^5[0-9]{8}$'` (9 digits starting with 5, no leading 0) → `v := '966' || v` → yields `9665xxxxxxxx`.  
   - Else if `v ~ '^9665[0-9]{8}$'` (already canonical, 12 digits) → keep `v`.  
   - Else → raise `invalid_respondent_mobile` (includes wrong prefix, too short/long after strip, non-Saudi invent).  
7. Final assert: `v ~ '^9665[0-9]{8}$'`; else raise `invalid_respondent_mobile`.  
8. Return `v`.

**Explicit evaluation table:**

| Input class (after trim) | Result |
|---|---|
| `05xxxxxxxx` (10 digits) | → `9665xxxxxxxx` |
| `9665xxxxxxxx` (12 digits) | accept as-is |
| `+9665xxxxxxxx` / spaced / hyphenated / parenthesized forms of the above | strip formatting → same as digit forms |
| `5xxxxxxxx` (9 digits) | → `9665xxxxxxxx` (documented, not silent invent of foreign codes) |
| Wrong Saudi prefix (e.g. `9664…`, `04…`) | `invalid_respondent_mobile` |
| Too short / too long digit strings | `invalid_respondent_mobile` |
| Letters or other symbols after strip | `invalid_respondent_mobile` |
| Empty / NULL | `invalid_respondent_mobile` |

**Do not** reuse `normalize_company_phone` (8–15 digit generic; optional; different CHECK).

### 6.5 `age`

| Rule | Value |
|---|---|
| Optional | integer |
| DOB | **forbidden** |
| Lower bound | preserve DB: `age IS NULL OR age >= 0` |
| Upper bound (RPC) | if `age > 120` → `invalid_respondent_age` (operational hygiene; not demographic inference) |
| Reject non-integers | via typed parameter (PostgreSQL) |

### 6.6 `nationality`

| Rule | Value |
|---|---|
| Optional | operational text only |
| Normalize | collapse whitespace + `btrim`; blank → NULL |
| Max | **80** characters (Companies `contact_person` precedent) |
| Over max | `invalid_respondent_nationality` |
| Forbidden | identity-document numbers, national IDs |

### 6.7 `resident_type`

| Rule | Value |
|---|---|
| Vocabulary | exact: `saudi`, `non_saudi`, `unknown` |
| Default | `unknown` |
| Any other value | `invalid_respondent_resident_type` |
| NULL input on create/update | treat as `unknown` if parameter DEFAULT used; explicit NULL → `unknown` |

### 6.8 `notes`

| Rule | Value |
|---|---|
| Optional | operational notes |
| Normalize | collapse whitespace + `btrim`; blank → NULL |
| Max | **2000** characters (Companies `notes` precedent) |
| Over max | `invalid_respondent_notes` |
| List RPC | **excluded** |
| Forbidden content class | secrets, credentials, identity-document payloads (product rule; not content-scanned in SQL) |

---

## 7. Role and capability matrix

| Action | Owner | Support Helper |
|---|---|---|
| `list_respondents` | Yes | Yes |
| `get_respondent` | Yes | Yes |
| `create_respondent` | Yes | Yes |
| `update_respondent` | Yes | Yes |
| Soft-delete / restore / merge | **No** | **No** |
| Add to project / three-month | **No (this phase)** | **No (this phase)** |
| Finance / review / payments | **Forbidden** | **Forbidden** |
| Direct table INSERT/UPDATE/DELETE privilege | **No** | **No** |
| Direct table SELECT (RLS) | Yes (Owner policy) | **No** useful base SELECT |
| Full mobile on operational surfaces | Yes (same-account) | Yes (same-account, contact-only purpose) |

Authorize every RPC with: `is_owner() OR is_support_helper()`; else `respondent_access_denied`.

---

## 8. Read RPC contracts

Common product RPC posture (all four product RPCs + notes below for reads):

- schema `public`  
- `LANGUAGE plpgsql`  
- `SECURITY DEFINER`  
- `SET search_path = pg_catalog, public`  
- Owner: `postgres`  
- `GRANT EXECUTE … TO authenticated` only  
- `REVOKE EXECUTE … FROM PUBLIC, anon, service_role`  
- no dynamic SQL; no `service_role` dependency  
- account/profile from `current_account_id()` / `current_profile_id()` (and related helpers)  
- fail closed if profile/account missing or inactive  
- active non-deleted rows only (`deleted_at IS NULL`)  
- cross-account / deleted / missing → `respondent_not_found` (no existence leak across accounts)

### 8.1 List shape (no notes)

```text
respondent_id   uuid    -- maps from id
name            text
mobile          text    -- canonical 9665…
age             integer
nationality     text
resident_type   text
created_at      timestamptz
updated_at      timestamptz
```

**Excluded from list:** `notes`, `account_id`, `created_by`, `updated_by`, `normalized_mobile` (redundant with `mobile`), Participation/Project fields, finance fields, `total_count`.

### 8.2 Detail shape (create/get/update)

```text
respondent_id   uuid
name            text
mobile          text
age             integer
nationality     text
resident_type   text
notes           text
created_at      timestamptz
updated_at      timestamptz
```

**Excluded:** `account_id` (not user-facing authority), profile ids, Participation history, Project history, finance.

### 8.3 `list_respondents`

```text
public.list_respondents(
  p_search text DEFAULT NULL,
  p_limit integer DEFAULT 25,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  respondent_id uuid,
  name text,
  mobile text,
  age integer,
  nationality text,
  resident_type text,
  created_at timestamptz,
  updated_at timestamptz
)
STABLE
```

**Exact identity:** `list_respondents(text, integer, integer)`

| Rule | Detail |
|---|---|
| Pagination | `p_limit` ∈ **[1, 50]**; `p_offset` ≥ **0**; else `invalid_pagination` (`22023`) |
| Defaults | `p_limit` DEFAULT **25**; `p_offset` DEFAULT **0** |
| Search empty | `p_search` NULL or `btrim = ''` → no text filter |
| Search length | after trim, if `char_length > 120` → `invalid_pagination` |
| Name match | `ILIKE` substring on `name` with escape of `\`, `%`, `_` |
| Mobile match | build digit-only probe from search (strip same formatting set as mobile helper; non-digits dropped for **search only**); if probe length ≥ 3, match `mobile LIKE '%' || probe || '%'` **OR** `normalized_mobile LIKE '%' || probe || '%'` (both equal post-write; dual match is defensive) |
| Combine | name match **OR** mobile match when search non-empty |
| Filter | `account_id = v_account_id AND deleted_at IS NULL` |
| Order | `name ASC NULLS LAST, id ASC` (deterministic) |
| Joins | **none** to participations, projects, finance |
| `total_count` | **not** returned (offset pagination; Companies precedent) |

### 8.4 `get_respondent`

```text
public.get_respondent(p_respondent_id uuid)
RETURNS TABLE (
  respondent_id uuid,
  name text,
  mobile text,
  age integer,
  nationality text,
  resident_type text,
  notes text,
  created_at timestamptz,
  updated_at timestamptz
)
STABLE
```

**Exact identity:** `get_respondent(uuid)`

| Rule | Detail |
|---|---|
| Missing / deleted / other account | `respondent_not_found` (`P0002`) |
| Unauthorized role | `respondent_access_denied` (`42501`) |
| Notes | **included** |
| Participation / Project preview | **none** |

---

## 9. Mutation RPC contracts

### 9.1 `create_respondent`

```text
public.create_respondent(
  p_mobile text,
  p_name text DEFAULT NULL,
  p_age integer DEFAULT NULL,
  p_nationality text DEFAULT NULL,
  p_resident_type text DEFAULT 'unknown',
  p_notes text DEFAULT NULL
)
RETURNS TABLE ( … detail shape … )
VOLATILE
```

**Exact identity:** `create_respondent(text, text, integer, text, text, text)`

**Never accept:** `account_id`, `normalized_mobile`, `deleted_at`, `id`, `created_by`, `updated_by`, `created_at`, `updated_at`.

**Sequence (single transaction):**

1. Authorize role; resolve `v_account_id`, `v_profile_id`; if either NULL → `respondent_access_denied`.  
2. `v_mobile := normalize_respondent_mobile(p_mobile)`.  
3. Normalize/validate name, age, nationality, resident_type, notes (rules §6).  
4. `INSERT INTO public.respondents (account_id, name, mobile, normalized_mobile, age, nationality, resident_type, notes, created_by, updated_by)`  
   values `(v_account_id, v_name, v_mobile, v_mobile, v_age, v_nationality, v_resident_type, v_notes, v_profile_id, v_profile_id)`.  
5. On `unique_violation` → raise `duplicate_respondent_mobile` (`23505` mapped; MESSAGE exact; **no mobile in message**).  
6. Return detail shape for inserted row.  
7. Does **not** insert Participation.

### 9.2 `update_respondent`

```text
public.update_respondent(
  p_respondent_id uuid,
  p_mobile text,
  p_expected_updated_at timestamptz,
  p_name text DEFAULT NULL,
  p_age integer DEFAULT NULL,
  p_nationality text DEFAULT NULL,
  p_resident_type text DEFAULT 'unknown',
  p_notes text DEFAULT NULL
)
RETURNS TABLE ( … detail shape … )
VOLATILE
```

**Exact identity:** `update_respondent(uuid, text, timestamptz, text, integer, text, text, text)`

**Parameter order (PostgreSQL-safe):** required `p_respondent_id`, `p_mobile`, `p_expected_updated_at` **before** defaulted optionals.

**Concurrency:** `p_expected_updated_at` is **required** (NOT NULL; no DEFAULT). UI supplies `updated_at` from last read.

**Sequence:**

1. Authorize + resolve account/profile.  
2. `SELECT … FROM public.respondents WHERE id = p_respondent_id AND account_id = v_account_id AND deleted_at IS NULL FOR UPDATE`.  
3. If not found → `respondent_not_found`.  
4. If `updated_at IS DISTINCT FROM p_expected_updated_at` → `stale_respondent_version` (`P0001`).  
5. `v_mobile := normalize_respondent_mobile(p_mobile)` (same helper as create).  
6. Normalize/validate other fields (same as create).  
7. `UPDATE` set `name`, `mobile`, `normalized_mobile`, `age`, `nationality`, `resident_type`, `notes`, `updated_by = v_profile_id` (`updated_at` via existing trigger).  
8. Unique violation → `duplicate_respondent_mobile`.  
9. Return detail shape.  
10. **Never** modify `id`, `account_id`, `created_by`, `created_at`, `deleted_at`.

---

## 10. Optimistic concurrency

| Rule | Detail |
|---|---|
| Mechanism | `p_expected_updated_at` vs row `updated_at` under `FOR UPDATE` |
| Mismatch token | `stale_respondent_version` |
| ERRCODE | `P0001` |
| Authority | Fail closed; no last-write-wins |

---

## 11. Duplicate handling

**Active duplicate definition:**

same `account_id` + same `normalized_mobile` + `deleted_at IS NULL`

| Rule | Detail |
|---|---|
| Final authority | partial unique index `idx_respondents_unique_mobile_per_account` |
| Optional pre-check | allowed for clearer UX; **not** race-safe alone |
| Create/update | catch `unique_violation` → `duplicate_respondent_mobile` |
| Merge | **not** automatic; no merge RPC |
| Cross-account | impossible via account-scoped uniqueness; never reveal other accounts |
| Deleted rows | outside MVP reads; mobile reuse after future soft-delete possible by index predicate only |

---

## 12. ACL, RLS, SECURITY DEFINER, and search_path

| Decision | Freeze |
|---|---|
| Relation privileges authenticated | **SELECT only** (preserve) |
| INSERT/UPDATE/DELETE/TRUNCATE for authenticated | **no grant** |
| PUBLIC / anon / service_role relation privileges | **none** |
| `sel_respondents` | **Keep** Owner-only direct SELECT + account + non-deleted |
| Support Helper base-table SELECT | **Do not add** broad SELECT policy |
| Support Helper reads | via DEFINER RPCs only |
| Mutations | DEFINER RPCs only; no direct table mutation grants |
| `ins_respondents` | **Leave unchanged** — not a client write path; authenticated has no INSERT privilege; DEFINER writes as function owner |
| Why keep `ins_respondents` | Avoid unnecessary RLS churn; policy is ineffective without privilege; removing it is optional later hygiene, not MVP-required |
| Product RPC search_path | `pg_catalog, public` |
| Helper search_path | `pg_catalog, public` |
| `normalize_respondent_mobile` EXECUTE | revoked from PUBLIC, anon, authenticated, service_role |
| Product RPCs EXECUTE | authenticated only; revoked from PUBLIC, anon, service_role |

---

## 13. Error contract

Stable **MESSAGE** tokens (application maps to Arabic UI later):

| MESSAGE | When | Suggested ERRCODE |
|---|---|---|
| `respondent_access_denied` | Not owner/SH; missing/invalid profile/account | `42501` |
| `respondent_not_found` | Missing, deleted, or cross-account | `P0002` |
| `duplicate_respondent_mobile` | Unique index conflict | `23505` (mapped) |
| `invalid_respondent_mobile` | Normalize/validation fail | `22023` |
| `invalid_respondent_name` | Name too long after normalize | `22023` |
| `invalid_respondent_age` | Age &lt; 0 (should be rare typed) or &gt; 120 | `22023` |
| `invalid_respondent_nationality` | Nationality too long | `22023` |
| `invalid_respondent_resident_type` | Not in vocabulary | `22023` |
| `invalid_respondent_notes` | Notes too long | `22023` |
| `invalid_pagination` | limit/offset/search length | `22023` |
| `stale_respondent_version` | Concurrency mismatch | `P0001` |

**Error content rules:**

- no raw mobile;  
- no account/profile identifiers;  
- no SQL object or constraint names for application display;  
- map cleanly to later Arabic UI messages.

---

## 14. Privacy and finance exclusions

Respondent RPCs **must not**:

- join or read financial tables/views;  
- return accepted-form counts that permit financial inference;  
- return payments, pricing, settlement, wage, due, or balance data;  
- accept or store national IDs, DOB, precise addresses/locations, identity images;  
- expose credentials, Auth UUIDs, JWTs, or secrets;  
- put raw mobile in logs, errors, telemetry, URLs, or query strings;  
- enable unrestricted registry export.

Support Helper may see full mobile only for legitimate same-account operational contact through approved runtime surfaces (RPC detail/list), not via base-table SELECT.

---

## 15. Participation and three-month boundaries

| Topic | Decision |
|---|---|
| Registry create | Independent of Project participation |
| Add-to-project | **Phase 6 Participation** — not in these RPCs |
| Same Project duplicate | Existing Participation unique + guards remain authoritative |
| Three-month computation | **Not** in Respondent Registry design |
| Three-month product rule | Warning-only; never hard block solely from the warning |
| Project history on respondent row | **Forbidden** |
| Current RPCs return participation history | **No** |

---

## 16. Migration plan (later task — no SQL here)

**Proposed collision-free filename:**

```text
supabase/migrations/20260717120000_respondents_mvp_schema_rpc.sql
```

(Existing latest product migration timestamp prefix: `20260716170000_…`. Proposed `20260717120000` is free.)

**Ordered steps:**

1. **Preflight** — confirm `public.respondents` exists; confirm unique index present; confirm no existing functions named `list_respondents` / `get_respondent` / `create_respondent` / `update_respondent` / `normalize_respondent_mobile` (or overload collisions); optional scan for active mobile duplicates (should be none under index).  
2. **Helper** — create `normalize_respondent_mobile`.  
3. **Four product RPCs** — create in dependency-safe order (helper first; reads; mutations).  
4. **Comments / markers** — `managed_by: 20260717120000_respondents_mvp_schema_rpc` (or equivalent project convention).  
5. **Grants / revokes** — product RPCs → authenticated only; revoke PUBLIC/anon/service_role; helper revoke all client roles + PUBLIC.  
6. **Catalog postconditions** — in-script asserts for identities and privileges.  
7. **RLS / relation ACL preservation** — no new INSERT/UPDATE grants; SELECT-only authenticated preserved.  
8. **Function signature verification** — exact identities listed in §8–9.  
9. **Security / search_path verification** — DEFINER + `pg_catalog, public`.  
10. **Duplicate-race behavior** — document that unique index remains authority; optional concurrent-create note for smoke.  
11. **Forward-only rollback** — drop product RPCs + helper if needed; **do not** drop table/index/policies; no destructive data migration.

**Do not** alter `ins_respondents` unless a later security task explicitly requires cleanup.

---

## 17. Post-apply verification plan (later; metadata only)

Read-only packet (no application rows / no PII):

- helper exists; IMMUTABLE; PARALLEL SAFE; search_path; owner; no client EXECUTE;  
- four exact RPC signatures present;  
- SECURITY DEFINER + search_path on each;  
- volatility: list/get STABLE; create/update VOLATILE;  
- EXECUTE matrix: authenticated true; PUBLIC/anon/service_role false;  
- authenticated SELECT-only on `respondents` preserved;  
- RLS still enabled;  
- no new broad SELECT policies for Support Helper;  
- unique index still present;  
- no unexpected client mutation grants;  
- no service_role grants on these functions/table;  
- no finance object dependencies in function definitions;  
- no business-row SELECT in the verification packet.

---

## 18. Manual smoke boundary (later; Mozfer-owned)

Do **not** perform now. Future outline:

1. Owner: list / get / create / update.  
2. Support Helper: list / get / create / update.  
3. Mobile: `05…`, `9665…`, `+9665…`, formatted variants → canonical; invalid shapes → safe error.  
4. Duplicate active mobile → `duplicate_respondent_mobile` without leaking mobile.  
5. Stale `p_expected_updated_at` → `stale_respondent_version`.  
6. Cross-account id → `respondent_not_found`.  
7. List does **not** show notes; detail does.  
8. No finance wording or data.  
9. No raw SQLSTATE/constraint/Supabase/PostgreSQL leakage in UI mapping.  
10. No direct base-table mutation path for authenticated.

**No runtime PASS claimed by this design task.**

---

## 19. Deferred and explicitly excluded capabilities

| Deferred / excluded | Notes |
|---|---|
| Soft delete / restore | `deleted_at` foundation only |
| Merge / deduplication UI | out of MVP |
| Participation add-to-project | Phase 6 |
| Three-month eligibility warning | Participation design |
| Participation history on registry | excluded |
| Excel import / operational export | deferred; export rules in PRD are not this phase |
| WhatsApp links / send confirmation | deferred |
| Bulk registry operations | deferred |
| Cross-account isolation smoke | deferred nonblocking |
| Advanced filters / analytics / PDF | deferred |
| Production apply/readiness | not claimed |
| `delete_respondent` / `restore_respondent` | excluded |
| Financial or review RPCs | excluded |

---

## 20. Risks and HOLD conditions

| Risk | Design response |
|---|---|
| Direct table INSERT via policy myth | Keep SELECT-only grants; RPC-only writes |
| Reuse company phone helper | Dedicated `normalize_respondent_mobile` with CHECK shape |
| Mobile in errors | Forbidden in MESSAGE |
| SH cannot read base table | Unified DEFINER list/get |
| Race on duplicate mobile | Unique index + map `23505` |
| Accidental Participation create | Create RPC inserts only `respondents` |
| Three-month hard block creep | Explicit exclusion |
| Parameter-order regression | Required args before defaults; exact identities frozen |
| Finance leakage | No finance joins/fields |

**HOLD before migration apply if:** unique index missing; RPC name collisions; ACL drift re-opens client mutation; helper becomes client-callable; live CHECK shape differs from `^9665[0-9]{8}$`.

---

## 21. Exact next task

**`ZAM-RESPONDENTS-SCHEMA-RPC-MIGRATION-1`**

Write the migration SQL from this frozen design only; do not implement application UI in that task unless separately authorized.

---

## Appendix A — Exact object inventory (migration target)

| Object | Identity / notes |
|---|---|
| `normalize_respondent_mobile` | `(text) → text` IMMUTABLE PARALLEL SAFE; not client-callable |
| `list_respondents` | `(text, integer, integer)` STABLE |
| `get_respondent` | `(uuid)` STABLE |
| `create_respondent` | `(text, text, integer, text, text, text)` VOLATILE |
| `update_respondent` | `(uuid, text, timestamptz, text, integer, text, text, text)` VOLATILE |

---

## Appendix B — Decision summary

| Decision | Resolution |
|---|---|
| Table columns | Preserve 14; no new public columns |
| Mutation path | Server Action → authenticated RPC (later) |
| Reads | Unified RPCs for Owner + SH |
| `sel_respondents` | Remains Owner-only |
| `ins_respondents` | Unchanged; not client path |
| Lifecycle RPCs | None |
| Mobile storage | Canonical in both `mobile` and `normalized_mobile` |
| List notes | Excluded |
| Pagination | default 25, max 50 |
| Concurrency | Required `p_expected_updated_at` |
| Three-month / Participation | Out of scope |
| Finance | Forbidden |
| Production readiness | Not claimed |
