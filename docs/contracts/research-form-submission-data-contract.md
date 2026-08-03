# Research Form Submission — Data Contract (Phase 1, Slice 2)

**Status:** APPROVED — MOZFER PRODUCT AUTHORITY

**Approval metadata:**
- **Approved by:** Mozfer
- **Approved date:** 2026-08-03
- **Approval scope:** product and data contract only
- **Implementation status:** not implemented / current conformance gaps remain
- **Runtime acceptance:** unclaimed

**Authority boundary:** This file is a subordinate workflow contract. It must conform to [product-requirements.md](../product-requirements.md), [roles-permissions.md](../roles-permissions.md), [security-foundation.md](../security-foundation.md), [database-schema.md](../database-schema.md), [deferred-decisions.md](../deferred-decisions.md), and [project-roadmap.md](../project-roadmap.md). It does not override those canonical documents.

**Delivery boundary:** This Data Contract does not imply that its wireframe, visual specification, implementation slice, consolidated review, correction, browser acceptance, or Phase 1 closure is complete. It is an approved contract artifact (APPROVED — MOZFER PRODUCT AUTHORITY, 2026-08-03); approval grants no automatic implementation authority.

**Created:** 2026-08-03
**Created under:** `ZAM-PHASE1-RESEARCH-FORM-SUBMISSION-DATA-CONTRACT-12` (`DOCS_SYNC_ONLY_NO_STAGE`). Not an implementation approval, not a runtime claim.
**Related tasks:** `ZAM-PHASE1-RESEARCH-FORM-SUBMISSION-SCREEN-CONTRACT-02` → `...-SCREEN-CONTRACT-REGISTER-03` → `...-SCREEN-CONTRACT-REVIEW-04` → (approval chain) → `...-SCREEN-CONTRACT-PRECOMMIT-10` / `...-SANITY-10A` / `...-COMMIT-11` → this document → `...-DATA-CONTRACT-MOZFER-APPROVAL-14` (Mozfer product approval, 2026-08-03)

---

## 1. Purpose, Authority, and Scope

This document defines the **submission data contract** for the Owner Researcher Research Form submission workflow — the second workflow contract under Phase 1 (Product and Workflow Canonicalization) of [project-roadmap.md](../project-roadmap.md). It defines which fields the browser supplies, which data the application generates internally, which fields the server/database derives, and the persistence, idempotency, success, error, and security boundaries of one logical submission.

- **In scope:** exactly one logical submission operation (`createResearchFormAction` → `submit_research_form`) that persists one `research_forms` row with `review_status = 'submitted'`.
- **Not in scope:** review, acceptance, correction, resubmission UI, pricing, financials, collections, Sample hierarchy, wireframe, visual specification, implementation, SQL changes, and any runtime/build/manual-smoke evidence.
- The screen-level behavior this Data Contract serves is defined in the [Research Form submission Screen Contract](./research-form-submission-screen-contract.md); this document is its data-side companion and must not contradict it.
- All approved submission data-semantics are adopted from [deferred-decisions.md](../deferred-decisions.md) (DEC-FORM-001 through DEC-FORM-006).

## 2. Status

**APPROVED — MOZFER PRODUCT AUTHORITY (2026-08-03).** Mozfer approved the product and data contract wording; the approved target behavior may govern later design and implementation tasks. This approval is contract-only: it does not prove implementation or runtime conformance, and it grants no automatic implementation authority. No runtime or implementation claim is made by this document. Any correction Mozfer requests will be performed in a separate controlled task.

## 3. Actor, Authorization, and Tenant Boundary

- **Only the account Owner may submit** a Research Form, enforced at three layers:
  1. Route/page guard `requireOwnerSession()` (`src/app/forms/route-state.ts:9-15`) → non-owner redirects to `/forbidden`; unauthenticated sessions redirect to `/login`.
  2. Server action `createResearchFormAction` (`src/app/forms/new/actions.ts:12-17`).
  3. RPC `submit_research_form` Owner gate `is_owner()` (`supabase/migrations/20260723170000_enforce_one_research_form_per_participation.sql:113-116`), `EXECUTE` revoked from `PUBLIC`/`anon`/`service_role`, granted to `authenticated` only.
- **`support_helper`:** no submission authority; legacy boundary preserved, not extended.
- **Tenant boundary:** `account_id` is derived server/database-side via `current_account_id()` and RLS; the browser never supplies account identity, role, profile id, `code`, `review_status`, or any timestamp.
- **Normal application flows use the authenticated user-session Supabase client under RLS**; no service-role client is used.

## 4. Entry Context and Eligibility

Server-side eligibility (data level) for the `/forms/new` surface is established in `src/app/forms/new/page.tsx:28-109`.

**Approved target (project eligibility):** a Participation is an eligible submission target only when:

- the resolved Participation belongs to a Project with `status = 'active'`;
- the Project has `deleted_at IS NULL`;
- the Participation itself has `deleted_at IS NULL`;
- the Participation has **no existing research form**;
- the Participation exists in the tenant account.

Draft, closed, cancelled, deleted, cross-account, or unavailable projects are **not** eligible for new Research Form submission. Excluding only `closed`/`cancelled` statuses is not sufficient under the approved target: `draft` projects and soft-deleted Projects (Project `deleted_at` not NULL) are ineligible.

- The client receives only eligible `(projectId, participationId)` pairs plus respondent display name/mobile; it receives no server-authoritative row data.
- Prefilled deep links (`?project&participant`) are re-validated server-side; an already-registered participation yields the error "تم تسجيل استمارة لهذا المشارك في المشروع بالفعل." and an invalid or unavailable context yields the Section 5/12 messages of the Screen Contract.
- **Current implementation evidence (partial):** the current page filters out `closed` and `cancelled` projects (`p.status !== "closed" && p.status !== "cancelled"`, `page.tsx:39-41`) but does not prove the full approved active-only and non-deleted Project target. The current submit RPC checks Participation account membership and Participation `deleted_at` (`participation_not_eligible`), and rejects `closed`/`cancelled` Project statuses (`research_form_state_invalid`); it does **not** require Project `status = 'active'` and does **not** check Project `deleted_at`. Current source is therefore **partial evidence** and does not fully conform to the approved project-eligibility contract. No draft or soft-deleted Project submission behavior has been manually proven.
- **Authority boundary:** the RPC is the current server-side mutation authority, and database authorization and derivation remain authoritative over browser context; however, the current RPC project-eligibility guard is incomplete relative to the approved active-only and non-deleted Project target.

## 5. Browser-Supplied Mutation Fields

Exactly **three** fields are supplied by the browser on submission; nothing else is accepted as mutation input:

| Field | Column | Constraint (approved semantics) | Source |
|---|---|---|---|
| `participationId` | `participation_id` | **Required.** Valid UUID; must exist in the tenant account; Participation non-deleted; Project `status = 'active'` and `deleted_at IS NULL`; no existing form (DEC-FORM-006 final safeguard) | `CreateResearchFormClient` selection / prefilled context |
| `submittedDate` | `submitted_date` | **Required.** `YYYY-MM-DD`; real calendar date, non-future vs server-authoritative current date (DEC-FORM-004); interview business date, not an audit timestamp (DEC-FORM-002) | `input#submitted-date-input` (`type="date"`) |
| `notes` | `notes` | **Optional.** Blank/whitespace-only canonically means no note and must persist as SQL `NULL` (DEC-FORM-003); must not exceed 2000 characters after trimming (DEC-FORM-005) | `textarea#notes-textarea` |

The browser must never supply: `account_id`, `project_id`, `company_id`, `respondent_id`, `code`, `review_status`, `attempt_number`, `submitted_at`, `created_by`, `updated_by`, `created_at`, `updated_at`, `id`, pricing, or financial values.

## 6. Application-Generated Internal Operation Data

- **`idempotencyKey`** is internal operation data generated by the application for each logical submission. It is never displayed to the user, never persisted on `research_forms`, and never treated as a user-facing value.
- **Target semantics (DEC-FORM-006):** one logical submission uses one retry-stable key — retrying the same logical submission reuses the same key (may replay the completed result); reusing a key with a different payload fails closed; the key is not permanently fixed to a Participation; exact key-generation mechanics remain an implementation detail outside this contract; `idx_rf_unique_participation` remains the final duplicate safeguard.
- **Current implementation:** `submit-form-{participationId}-{Date.now()}` generated per invocation (`src/app/forms/new/actions.ts:38`) — a fresh key on every attempt. This is a **known nonconformance** (see Section 14); it means retries never replay and the one-form invariant (`duplicate_participation`) is the effective guard today.
- The RPC persists the key (bounded 8–128 characters after trimming) in `idempotency_keys` scoped by `(account_id, scope='submit_research_form', idempotency_key)` with the request payload hash (`supabase/migrations/20260723140000_forms_collections_rpcs.sql:47-93`).

## 7. Server/Database-Derived Fields

The following **13 fields** are never browser-supplied; they are derived by the server action/RPC/database and carry the target meanings below:

| # | Field | Target meaning | Derived by | Evidence |
|---|---|---|---|---|
| 1 | `id` | `research_forms` row identity (UUID) | Database (generated on insert) | `research_forms` schema |
| 2 | `account_id` | Tenant boundary of the submitting account | Server/RPC via `current_account_id()` | RPC `v_account_id` |
| 3 | `project_id` | Parent project of the target participation | RPC from participation join | `20260723170000...sql:146-153` |
| 4 | `company_id` | Company of the participation's project | RPC from participation join | same join |
| 5 | `respondent_id` | Respondent of the target participation | RPC from participation join | same join |
| 6 | `code` | `RF-YYYYMMDD-NNN` — per-account daily sequence | RPC under account row lock | `20260723140000...sql:350-355` |
| 7 | `attempt_number` | Always `1` under the one-form invariant | RPC (constant `1`) | `20260723170000...sql:204` |
| 8 | `review_status` | `'submitted'` on insert | RPC (constant) | `20260723170000...sql:206` |
| 9 | `submitted_at` | Server-recorded audit timestamp; never the interview date (DEC-FORM-002, DEC-FORM-004) | RPC `clock_timestamp()` | `20260723170000...sql:207` |
| 10 | `created_by` | Submitting Owner profile id | RPC `current_profile_id()` | RPC `v_profile_id` |
| 11 | `updated_by` | Same as `created_by` on insert | RPC | `20260723170000...sql:210` |
| 12 | `created_at` | Server-recorded row creation timestamp | RPC `clock_timestamp()` | `20260723170000...sql:211` |
| 13 | `updated_at` | Server-recorded row update timestamp | RPC `clock_timestamp()` | `20260723170000...sql:212` |

Ownership summary: fields 2–5, 9–13 are strict server/database derivations; fields 6–8 are server/database-generated business values; field 1 is database identity. No browser authority exists over any of them.

## 8. Validation and Normalization

| Layer | Rule | Current evidence | Classification |
|---|---|---|---|
| Browser/client | Required participation (direct mode), required date, notes optional; notes trimmed before send (`notes.trim() \|\| null`); no length bound | `CreateResearchFormClient.tsx:74-105` | Partial (length bound missing — DEC-FORM-005) |
| Server action | `isValidUuid(participationId)`; `isValidIsoDate(submittedDate)`; notes trimmed to `null` when blank; idempotency key generated | `src/app/forms/new/actions.ts:21-45`; `src/lib/forms/input.ts:20-26` | Partial (rollover dates like `2026-02-31` pass `isValidIsoDate` — DEC-FORM-004; fresh key per invocation — DEC-FORM-006) |
| RPC/input parse | `parseSubmitResearchFormInput` re-validates UUID + ISO date, normalizes notes to `null`, normalizes key (8–128 chars, else generated) | `src/lib/forms/input.ts:28-56`; `src/lib/idempotency/key.ts` | Same partials as above |
| Database/RPC | Participation tenant + `deleted_at` check; project `closed`/`cancelled` guard; Postgres `date` type rejects impossible calendar dates; blank-notes persisted via `btrim(COALESCE(p_notes,''))`; one-form invariant; `attempt_number = 1` | `20260723170000...sql:135-218` | Partial (DB date type is calendar-strict but raises an unmapped Postgres error surfaced as `unexpected_forms_error`; `''` persisted instead of SQL `NULL` — DEC-FORM-003; no non-future enforcement — DEC-FORM-004; no 2000-char bound — DEC-FORM-005) |

Approved target semantics are binding regardless of current classification: blank/whitespace-only notes must persist as SQL NULL, the canonical no-note representation (DEC-FORM-003); real calendar date, non-future, server-authoritative (DEC-FORM-004); ≤ 2000 characters after trimming (DEC-FORM-005); retry-stable key (DEC-FORM-006). A `notes` value exceeding 2000 characters after trimming must fail before successful persistence (no dedicated error code or Arabic message is assigned here). Exact timezone and server-current-date calculation mechanics remain implementation details (DEC-FORM-004); this contract chooses or invents no timezone policy.

## 9. Persistence and Atomicity

- One logical submission is executed inside the single `submit_research_form` `SECURITY DEFINER` function body — a single database transaction; no partial state is observable.
- Ordering inside the RPC (`20260723170000...sql:113-231`): Owner gate → tenant identity → idempotency claim → participation/project eligibility locks → one-form existence check → account row lock (serializes code generation) → daily-sequence code → INSERT → `complete_idempotent_mutation` → return.
- **One-form invariant:** exactly one `research_forms` row per `participation_id` across all review statuses; `attempt_number = 1` (migration `20260723170000_enforce_one_research_form_per_participation.sql`).
- **Final safeguard:** unique index `idx_rf_unique_participation` (`20260723170000...sql:83`); a race or direct insert raising `unique_violation` is mapped to `duplicate_participation` (`20260723170000...sql:215-218`).
- Idempotency row lifecycle: `processing` on claim → `completed` with stored response payload + target record id on success (`20260723140000...sql:12-131`); a failure rolls back the whole transaction including the claim.

## 10. Idempotency and Retry

Contract per `claim_idempotent_mutation` (`20260723140000...sql:12-95`), scoped by `(account_id, scope, key)` with a SHA-256 request payload hash:

| Situation | Behavior |
|---|---|
| New key | Claim created (`processing`), mutation executes once |
| Same key + same payload, already completed | **Replay:** stored response returned; no new row (`already_completed` path in `submit_research_form`) |
| Same key + different payload | Fails closed: `idempotency_request_conflict` |
| Same key currently `processing` | Fails closed: `idempotency_processing_conflict` |
| Key missing/out of range (8–128 chars) | `idempotency_key_invalid` |
| Fresh `Date.now()` key per invocation (current app behavior) | **Known nonconformance** (DEC-FORM-006): replay is never reached; `duplicate_participation` becomes the effective guard |

Retry guidance (target, per DEC-FORM-006): the client/application must reuse the same key when retrying the same logical submission; retries must not create additional `research_forms` rows under any circumstance — enforced structurally by `idx_rf_unique_participation`.

## 11. Success Contract and Navigation

A successful submission is evidenced at three levels:

1. **Database:** exactly one new `research_forms` row with `review_status = 'submitted'`, `attempt_number = 1`; the `idempotency_keys` row for the operation is `completed` with the response payload stored.
2. **RPC evidence:** response `{ research_form_id, code, attempt_number: 1, review_status: 'submitted', submitted_date }` (`20260723170000...sql:220-226`); the app validates every field before accepting it (`src/lib/forms/rpc.ts:37-46`).
3. **Application evidence:** `{ ok: true, formId }` from `createResearchFormAction` (`src/app/forms/new/actions.ts:79-82`); the client then navigates to `/forms/${formId}?success=create_form` (`CreateResearchFormClient.tsx:104`) where the detail page shows the success banner "تم تسجيل الاستمارة وإرسالها للمراجعة.".

The submitted form appears in the `/forms` review queue ("قائمة الانتظار والمراجعة (الأقدم أولاً)").

Raw UUIDs (`formId` / `research_form_id` / `participation_id`) may be used internally for routing and relations, but they are not normal user-facing Research Form references; the user-facing reference surface (e.g., the `code` display) is governed by the Screen Contract.

## 12. Error and Failure Contract

No invented error codes. The submission path may produce only the tokens existing in `FORMS_ERROR_TOKENS` (`src/lib/forms/errors.ts:3-22`) and the action-level codes below.

| Token (target contract) | Origin | Current action mapping | Arabic message (current) |
|---|---|---|---|
| `invalid_input` | Format failures (UUID/date) | `invalid_input` | "بيانات المشارك غير صالحة." / "تاريخ المقابلة غير صالح." |
| `forbidden` | Non-owner at RPC | falls to generic | "تعذر تسجيل الاستمارة حالياً. حاول مرة أخرى." |
| `unauthorized` | No active profile | falls to generic | same |
| `participation_not_eligible` | Participation not in tenant / deleted | `participant_not_assigned` | "هذا المشارك غير مسجل في المشروع المحدد." |
| `research_form_state_invalid` | Project closed/cancelled | `project_not_eligible` | "تعذر تسجيل الاستمارة لأن المشروع لم يعد متاحاً لإضافة استمارات جديدة." |
| `duplicate_participation` | Form already exists for participation | `duplicate_form` | "تم تسجيل استمارة لهذا المشارك في المشروع بالفعل. حدّث الصفحة لعرضها." |
| `duplicate_accepted_form` | (review-path token; mapped defensively) | `duplicate_form` | same |
| `idempotency_key_invalid` | Key missing/out of range | falls to generic | generic Arabic |
| `idempotency_request_conflict` | Same key, different payload | falls to generic | generic Arabic |
| `idempotency_processing_conflict` | Same key in flight | falls to generic | generic Arabic |
| `unexpected_forms_error` | Unmapped/Postgres errors (incl. calendar-strict date rejection) | `generic_failure` | "تعذر تسجيل الاستمارة حالياً. حاول مرة أخرى." |

Client-side guards (no server call): "الرجاء اختيار المشارك المرتبط بالمشروع." and "الرجاء اختيار تاريخ المقابلة." (`CreateResearchFormClient.tsx:82-90`).

Failure semantics: a failed submission leaves no `research_forms` row and no completed idempotency claim (transactional rollback); the Owner may retry the same logical submission.

## 13. Security and Privacy

- **Owner-only** at route, action, and RPC layers (Section 3); `support_helper` has no submission authority.
- **Tenant isolation:** all lookups are constrained by `account_id` (`current_account_id()`); `account_id` is never browser-supplied; participation must belong to the tenant account (`participation_not_eligible` otherwise).
- **No service-role client:** normal application flows use the authenticated user-session client under RLS; `submit_research_form` is `SECURITY DEFINER` with a pinned `search_path = pg_catalog, public` and `EXECUTE` limited to `authenticated`.
- **Never browser-supplied:** account identity, role, profile id, project/company/respondent derivations, `code`, `review_status`, `attempt_number`, `submitted_at`, and all timestamps (Section 7).
- **Idempotency data:** request keys and payload hashes live in `idempotency_keys` (tenant-scoped); no secrets, credentials, or financial values are accepted in any submission field.
- **Notes privacy:** `notes` is optional free text treated as potentially sensitive field data; it is stored only in the tenant-scoped `research_forms` row, is excluded from financial summaries, and must never contain credentials or secrets (product rule). `notes` must not leak through URLs or query strings, logs, analytics or telemetry, or error messages. No broader PII-processing or retention claims are made here.

## 14. Conformance Matrix

Classifications used: **conforming evidence** (current source/migrations prove the claim), **partial evidence** (proven only in part), **known nonconformance** (target semantics approved but current implementation violates them), **implementation detail unresolved** (approved semantics leave mechanics open), **runtime/manual unclaimed** (no runtime claim). No runtime PASS is claimed in this matrix.

| # | Contract claim | Classification | Evidence / note |
|---|---|---|---|
| 1 | Owner-only submission (3 layers) | Conforming evidence | route-state.ts:9-15; actions.ts:12-17; 20260723170000...sql:113-116 |
| 2 | Tenant boundary; `account_id` server-derived | Conforming evidence | RPC `current_account_id()`; RLS posture |
| 3 | Participation tenant + `deleted_at` eligibility | Conforming evidence | 20260723170000...sql:146-157 |
| 4 | Project eligibility: approved target requires Project `status = 'active'` and Project `deleted_at IS NULL` | Partial evidence | Approved target per `docs/product-requirements.md` (Participation Membership Rules: writes allowed only when the target project is `active` and `deleted_at IS NULL`) and the Screen Contract §5 ("active and eligible"). Current page/RPC exclude `closed`/`cancelled` and check Participation `deleted_at`, but `status = 'active'` and Project `deleted_at` are not fully enforced (`page.tsx:39-41`; `20260723170000...sql:146-161`). Required future work: enforce the approved active-only and non-deleted Project rule consistently at authoritative server/database boundaries and verify runtime behavior. |
| 5 | One-form invariant; `attempt_number = 1` | Conforming evidence | 20260723170000...sql:163-171, 204 |
| 6 | `idx_rf_unique_participation` final safeguard | Conforming evidence | 20260723170000...sql:83, 215-218 |
| 7 | Idempotency claim/replay/conflict mechanics | Conforming evidence | 20260723140000...sql:12-95, 124-131 |
| 8 | `code` generation `RF-YYYYMMDD-NNN` | Conforming evidence | 20260723140000...sql:350-355 |
| 9 | Success shape + navigation | Conforming evidence | actions.ts:79-82; CreateResearchFormClient.tsx:104 |
| 10 | Arabic error mapping (static) | Conforming evidence | actions.ts:47-77; errors.ts |
| 11 | Blank notes → SQL `NULL` (DEC-FORM-003) | Partial evidence | App layer trims to `null`; RPC persists `btrim(COALESCE(p_notes,''))` |
| 12 | Strict calendar-date validity (DEC-FORM-004) | Partial evidence | Postgres `date` type rejects impossible dates (unmapped); `isValidIsoDate` accepts rollover dates at app layer |
| 13 | Non-future interview date, server-authoritative (DEC-FORM-004) | Known nonconformance | No enforcement anywhere; browser default is today |
| 14 | Notes ≤ 2000 chars after trimming (DEC-FORM-005) | Known nonconformance | No length enforcement at any layer |
| 15 | Retry-stable idempotency key (DEC-FORM-006) | Known nonconformance | Fresh `Date.now()` key per invocation (actions.ts:38) |
| 16 | Exact key-generation mechanics (DEC-FORM-006) | Implementation detail unresolved | Semantics approved; scheme outside contract |
| 17 | Runtime/build/manual acceptance of any row | Runtime/manual unclaimed | No runtime PASS |

## 15. Exclusions and Non-Claims

- Review, acceptance, rejection, and cancellation flows (`review_research_form`) and accepted-form correction (`correct_accepted_research_form`) are out of scope; DEC-FORM-001 supplies the same-record invariant but its correction UI remains a separate future workflow slice.
- No resubmission UI for rejected/submitted forms; no second-form creation is ever permitted.
- No pricing, financial, collections, or financial-summary data on this surface.
- No quota override and no `accepted_price_snapshot` on this surface; both belong to the review/acceptance workflow, not to submission.
- No Excel import/export and no WhatsApp communication on this surface.
- No Sample hierarchy, `P###-S##-F###` references, or future-role design.
- This contract proposes **no SQL, schema, migration, or code changes**; it records target semantics and current conformance status only.
- **No runtime, build, test, or manual-smoke acceptance is claimed**; the conformance matrix grants no implementation or runtime PASS.
- This contract does not override the Screen Contract or any canonical document; any conflict with canonical documents resolves in favor of the canonical documents.
- Status: APPROVED — MOZFER PRODUCT AUTHORITY (2026-08-03, Mozfer). Approval is contract-only and grants no automatic implementation authority.

## 16. Source Evidence and Mozfer Review Checklist

### Source evidence (static)

- `src/app/forms/new/page.tsx` — server-side eligibility, active-project filter, prefilled deep-link validation
- `src/components/forms/CreateResearchFormClient.tsx` — client fields, guards, success navigation
- `src/app/forms/new/actions.ts` — action validation, idempotency key generation, error mapping
- `src/app/forms/route-state.ts` — `requireOwnerSession()`
- `src/lib/forms/input.ts` — `isValidUuid`, `isValidIsoDate`, `parseSubmitResearchFormInput`
- `src/lib/forms/types.ts` — `SubmitResearchFormInput/RpcArgs/Response`, `FormsErrorCode`
- `src/lib/forms/rpc.ts` — `submitResearchForm` response validation
- `src/lib/forms/errors.ts` — `FORMS_ERROR_TOKENS`, `mapFormsRpcError`
- `src/lib/forms/queries.ts` — read contract (`ResearchFormRow`, list/detail)
- `src/lib/idempotency/key.ts` — key length rules and normalization
- `supabase/migrations/20260723140000_forms_collections_rpcs.sql` — `claim_idempotent_mutation`, `complete_idempotent_mutation`, `submit_research_form` (original), privilege hardening
- `supabase/migrations/20260723170000_enforce_one_research_form_per_participation.sql` — `idx_rf_unique_participation`, `attempt_number = 1`, `duplicate_participation`, replaced `submit_research_form`

### Mozfer review checklist

- [x] Confirm Status `APPROVED — MOZFER PRODUCT AUTHORITY` (2026-08-03) and the subordinate/authority boundary are correct. — Completed (review gate)
- [x] Confirm exactly three browser-supplied mutation fields (`participationId`, `submittedDate`, `notes`) and that nothing else is accepted (Section 5). — Completed (review gate)
- [x] Confirm `idempotencyKey` is internal operation data, not a browser-supplied business field (Section 6). — Completed (review gate)
- [x] Confirm the 13 server/database-derived fields, target meanings, and ownership (Section 7) match `database-schema.md` §6/§6.1 and the applied migrations. — Completed (review gate)
- [x] Confirm DEC-FORM-001 through DEC-FORM-006 are referenced and respected (Sections 5–10). — Completed (review gate)
- [x] Confirm the conformance matrix (Section 14) uses only the five allowed classifications and claims **no runtime PASS**. — Completed (review gate)
- [x] Confirm no invented error codes and that every token exists in `FORMS_ERROR_TOKENS` or the action-level mapping (Section 12). — Completed (review gate)
- [x] Confirm no SQL, migration, or implementation proposal is embedded in this contract. — Completed (review gate)
- [x] Confirm README registration under `## Phase 1 workflow contracts` and the Phase 1 roadmap active-slice paragraph are consistent with this contract. — Completed (synchronized under `...-DATA-CONTRACT-MOZFER-APPROVAL-14`)
- [x] Contract review and product approval gate. — Completed: Mozfer approved the product and data contract wording on 2026-08-03.

**Approval grants no automatic implementation authority.** The following delivery stages remain **NOT complete** (not authorized by this approval):

- [ ] Source implementation
- [ ] SQL or migration work
- [ ] Automated tests
- [ ] Browser/manual smoke
- [ ] Runtime conformance
- [ ] Wireframe
- [ ] Visual specification
- [ ] Implementation slice
- [ ] Phase 1 closure
