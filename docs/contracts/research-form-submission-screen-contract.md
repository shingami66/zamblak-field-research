# Research Form Submission — Screen Contract (Phase 1, Slice 1)

**Status:** Phase 1 Screen Contract draft, source-grounded and pending Mozfer product-copy approval.

**Authority boundary:** This file is a subordinate workflow contract. It must conform to [product-requirements.md](../product-requirements.md), [roles-permissions.md](../roles-permissions.md), [security-foundation.md](../security-foundation.md), [database-schema.md](../database-schema.md), [deferred-decisions.md](../deferred-decisions.md), and [project-roadmap.md](../project-roadmap.md). It does not override those canonical documents.

**Delivery boundary:** This Screen Contract does not imply that its Data Contract, wireframe, visual specification, implementation correction, browser acceptance, or Phase 1 closure is complete.

**Created:** 2026-08-03
**Created under:** `ZAM-PHASE1-RESEARCH-FORM-SUBMISSION-SCREEN-CONTRACT-02` (`DOCS_SYNC_ONLY_NO_STAGE`); registered under `ZAM-PHASE1-SUBMISSION-SCREEN-CONTRACT-REGISTER-03` (`DOCS_SYNC_ONLY_NO_STAGE`). Not an implementation approval, not a runtime claim.
**Related tasks:** `ZAM-PHASE1-FIRST-OWNER-WORKFLOW-SELECTION-01` (selection, PASS) → `ZAM-PHASE1-RESEARCH-FORM-SUBMISSION-SCREEN-CONTRACT-02` (this document)

---

## 1. Purpose and Scope

This document defines the **Research Form submission** screen for the Owner Researcher workflow — the first Screen Contract under Phase 1 (Product and Workflow Canonicalization) of [project-roadmap.md](../project-roadmap.md). It is a subordinate workflow artifact: it describes the approved-scope surface and carries no product, role, schema, security, decision, or roadmap authority.

- **Primary surface:** `/forms/new` (submission form).
- **Adjacent surfaces (navigation only, not redesigned here):** `/forms` (list — entry points) and `/forms/[formId]` (detail — success destination).
- **Not in scope:** Data Contract (separate next slice), Wireframe, Visual Specification, implementation, SQL, and any runtime/build/manual-smoke evidence.

The selected workflow rationale (Candidate A of the selection task): fully source-backed end-to-end, upstream of review/financials/collections, and free of pricing, Sample, and future-role dependencies.

## 2. Role, Authorization, and Tenant Boundary

- **Owner-only.** The page guard `requireOwnerSession()` (`src/app/forms/route-state.ts:9-15`) redirects non-owner profiles to `/forbidden`; unauthenticated sessions are redirected to `/login` (or `/login?reason=profile` after a profile-failure sign-out) by `requireAppSession()` (`src/lib/auth/session.ts:63-77`).
- The server action `createResearchFormAction` (`src/app/forms/new/actions.ts:12-17`) enforces the same Owner gate server-side; the database RPC `submit_research_form` is Owner-gated (`is_owner()`) with `EXECUTE` revoked from `PUBLIC`/`anon`/`service_role` and granted to `authenticated` (migration `20260723140000_forms_collections_rpcs.sql`).
- **`support_helper`:** no access to this surface. The legacy role boundary is preserved and not extended (PRD §3 Legacy Compatibility; `docs/roles-permissions.md`).
- **Tenant boundary:** all eligibility queries run under the authenticated owner's account; `account_id` is server/DB-derived (`current_account_id()` + RLS). The browser never supplies account identity, role, `code`, `review_status`, or `created_by`.

## 3. Screen Boundary, Entry, and Exit

| Direction | Target | Condition | Copy / behavior |
|---|---|---|---|
| Entry | `/forms/new` | Always | "استمارة جديدة" primary action in the `/forms` header (`src/app/forms/page.tsx:129-132`) |
| Entry | `/forms/new` | Only when `/forms` list is empty and no active filters | "تسجيل استمارة جديدة" empty-state CTA (`src/app/forms/page.tsx:220-225`) |
| Entry | `/forms/new?project=<uuid>&participant=<uuid>` | Deep link from the project participants surface and the legacy prototype mirror `/forms/participants/[participantId]` | Eligibility is re-evaluated server-side; invalid context renders a prefilled-error alert (Section 7) |
| Exit (success) | `/forms/[formId]?success=create_form` | Server action returns `ok: true` | Detail page shows the success banner "تم تسجيل الاستمارة وإرسالها للمراجعة." (`src/lib/ui/success-notice.ts:10`) |
| Exit (cancel/back) | `/forms` | User clicks "إلغاء" or "العودة إلى الاستمارات" | — |
| Exit (prefilled mode) | `/projects/[projectId]/participants` | User clicks "العودة لمشاركي المشروع" | Locked-context card only |
| Exit (empty state) | `/projects` | User clicks "عرض المشاريع" | Empty-state card only |

## 4. User Goal and Success Criteria

- **Goal:** The Owner records completion of a field interview as a Research Form for a participation **with no existing form** in an **active** project, capturing the interview date (required) and optional notes.
- **Success criteria:** a `research_forms` row is persisted server-side with `review_status = submitted` (`attempt_number = 1`); the Owner lands on `/forms/[formId]?success=create_form` showing the submitted form; the form appears in the `/forms` review queue ("قائمة الانتظار والمراجعة (الأقدم أولاً)").
- **Anti-goal:** a form must never be created for a participation that already has one (one-form invariant, migration `20260723170000_enforce_one_research_form_per_participation.sql`), or for a project that is closed, cancelled, or deleted.

## 5. Entry Conditions (Eligibility)

Evaluated server-side in `src/app/forms/new/page.tsx:28-109`:

- **Direct mode:** at least one project with `status NOT IN ('closed','cancelled')` and `deleted_at IS NULL` must have at least one participation **without** an existing research form in the tenant account. Projects are loaded via `listProjects` (limit `PROJECT_LIST_MAX_LIMIT`), participations via `listProjectParticipations` (limit 100 per project), existing forms via `listResearchForms` (page size 100 per project). Otherwise the "no eligible projects" empty state renders.
- **Prefilled mode (`?project&participant`):** both values must be valid UUIDs, the project must be active and eligible, the participation must belong to that project, and the participation must have no existing form. Failures render `prefilledError` with one of:
  - "تم تسجيل استمارة لهذا المشارك في المشروع بالفعل."
  - "هذا المشارك غير مسجل في المشروع المحدد."
  - "معرف المشروع أو المشارك غير صالح."
  - "المشروع أو المشارك المحدد غير متاح لتسجيل استمارة حالياً."

## 6. Information Groups and Controls

Rendered by `CreateResearchFormClient` (`src/components/forms/CreateResearchFormClient.tsx`).

| Group | Control | Details |
|---|---|---|
| A. Locked context card (prefilled mode only) | — | المشروع / المشارك / رقم الجوال (`<bdi dir="ltr">`), plus "العودة لمشاركي المشروع" link |
| B. Project selector (direct mode) | `select#project-select` (required) | Options: `{projectName} ({availableCount} مشارك متاح)`; placeholder "-- اختر المشروع --"; changing the project resets the participant selection |
| C. Participant selector (direct mode) | `select#participant-select` (required) | Options: `{name} - {mobile}`; disabled until a project is chosen; per-project empty hint "لا يوجد مشاركون متاحون لتسجيل استمارة في هذا المشروع." |
| D. Interview date | `input#submitted-date-input` `type="date"` (required) | Defaults to today (`YYYY-MM-DD`); labeled "تاريخ المقابلة" |
| E. Notes | `textarea#notes-textarea` (optional, 3 rows) | Helper text "أضف أي ملاحظة مهمة عن المقابلة، إن وجدت."; optional; blank/whitespace-only trimmed and persisted as SQL `NULL` (DEC-FORM-003); not exceeding 2000 characters after trimming (DEC-FORM-005); current client never enforces the length bound (not fully implemented) |
| Actions | Submit button + cancel link | "حفظ الاستمارة" (pending: "جاري الحفظ..."), "إلغاء" → `/forms`, "العودة إلى الاستمارات" → `/forms` |

No pricing fields, review fields, or financial values exist on this surface.

## 7. States and Behaviors

| State | Behavior | Copy / signal |
|---|---|---|
| Loading | Server component; no client initial-load spinner. Submit uses `useTransition`; while pending the button shows "جاري الحفظ..." and is disabled | — |
| Empty (no eligible projects) | Warning card (`role="status"`): "لا توجد مشاريع متاحة لتسجيل استمارات" + guidance + "عرض المشاريع" secondary action | `CreateResearchFormClient.tsx:128-140` |
| Ready | Form enabled; placeholders "-- اختر المشروع --" / "-- اختر المشارك --"; submit disabled until project + participant + date are valid | — |
| Client validation failure | `role="alert"` error box | "الرجاء اختيار المشارك المرتبط بالمشروع." / "الرجاء اختيار تاريخ المقابلة." |
| Prefilled deep-link failure | Alert card "تنبيه في البيانات الممررة" (`role="alert"`) with the matching Section 5 message; direct-mode form remains rendered below | `CreateResearchFormClient.tsx:119-126` |
| Server/action failure | `submitError` (`role="alert"`), mapped Arabic from `createResearchFormAction` (`src/app/forms/new/actions.ts:47-77`) | duplicate → "تم تسجيل استمارة لهذا المشارك في المشروع بالفعل. حدّث الصفحة لعرضها."; project closed → "تعذر تسجيل الاستمارة لأن المشروع لم يعد متاحاً لإضافة استمارات جديدة."; participant not in project → "هذا المشارك غير مسجل في المشروع المحدد."; invalid input → "تاريخ المقابلة غير صالح." / "بيانات المشارك غير صالحة."; generic → "تعذر تسجيل الاستمارة حالياً. حاول مرة أخرى." |
| Authorization failure | Non-owner → `/forbidden`; unauthenticated → `/login` | — |
| Completed | `router.push(/forms/{formId}?success=create_form)`; detail page shows success banner; status badge "قيد المراجعة" (submitted) | `CreateResearchFormClient.tsx:104`; `src/app/forms/[formId]/page.tsx` |

## 8. Validation Contract

- **Client:** required project (direct mode), required participation, required date (native `type="date"` plus JS guard), notes optional.
- **Server action:** `participationId` must be a valid UUID; `submittedDate` must pass `isValidIsoDate`; notes trimmed to `null` when blank (DEC-FORM-003); idempotency key `submit-form-{participationId}-{Date.now()}` (`src/app/forms/new/actions.ts:21-45`).
- **Database/RPC (`submit_research_form`):** participation must exist and be eligible (`participation_not_eligible`); project must be active and not deleted; exactly-one-form invariant enforced via unique index `idx_rf_unique_participation` with `attempt_number = 1` (duplicate → `duplicate_participation`; existing accepted form → `duplicate_accepted_form`); state guard `research_form_state_invalid`; the RPC derives `code` (`RF-YYYYMMDD-NNN`), `account_id`, timestamps, and `created_by` server-side.
- **Never browser-supplied:** price, `account_id`, role, `code`, `review_status`, `created_by` (PRD §2 "Price & Acceptance Semantics"), and `submitted_at` (DEC-FORM-002, DEC-FORM-004; `submitted_at` is server-derived).

#### Approved data-semantics subsumed by Section 12 (DEC-FORM-003 to DEC-FORM-006)

The Screen Contract adopts the four approved decisions as submission semantics only. Each remains registered in [deferred-decisions.md](../deferred-decisions.md):

- **DEC-FORM-003 — blank-notes:** notes remain optional; a blank or whitespace-only value canonically means no note and must persist as SQL `NULL`; an empty string is not canonical absence.
- **DEC-FORM-004 — interview date:** `submitted_date` must be a real calendar date (impossible dates such as `2026-02-31` are invalid) and not later than the server-authoritative current date (browser clock not authoritative); `submitted_at` is server-derived and never browser-supplied.
- **DEC-FORM-005 — notes length:** notes must not exceed 2000 characters after trimming.
- **DEC-FORM-006 — idempotency:** retrying the same logical submission should reuse the same operation key (may replay the completed result); reusing the key with a different payload fails closed; the key is not permanently fixed to a Participation; key-generation mechanics remain outside this Screen Contract; the unique one-form invariant (`idx_rf_unique_participation`) remains the final duplicate safeguard.

**Conformance boundary:** the current implementation does not yet prove full conformance for all four of these decisions (for example, inconsistent RPC blank-notes normalization, date validity that may accept rollover dates, and a fresh `Date.now()`-based key in `src/app/forms/new/actions.ts`). This section states approved semantics only; it grants no implementation or runtime claim.

## 9. Navigation Outcomes

Consolidated from Section 3: entry via `/forms` header action, empty-state CTA, or deep link; exits to `/forms/[formId]?success=create_form` (success), `/forms` (cancel/back), `/projects/[projectId]/participants` (prefilled context), `/projects` (empty state). All navigation is server-rendered link or `router.push`; no client-side state machine beyond the form itself.

## 10. Responsive and Accessibility Requirements

- **RTL-first:** interface is Arabic; LTR tokens (mobile numbers, form codes, dates) render inside `<bdi dir="ltr">`.
- **Labels:** explicit `for`/`id` associations (`project-select`, `participant-select`, `submitted-date-input`, `notes-textarea`).
- **Semantics:** `role="alert"` on every error surface; `role="status"` on the empty-state card.
- **Touch targets:** inputs/selects at least 3.25rem tall; buttons at least 2.5rem (source styles).
- **Keyboard:** native controls only; `<form>` submission supports Enter; logical DOM focus order.
- **Layout:** single-column stacking on narrow viewports (flex column); no color-only meaning on this surface; no motion on this surface (reduced-motion safe).

## 11. Explicit Exclusions (Non-Goals of This Slice)

- No pricing display, entry, or editing (browser-supplied prices forbidden by PRD).
- No review/decision actions (accept/reject/cancel) — separate Phase 1 slice.
- No resubmission or correction UI for submitted/rejected forms (DEC-FORM-001 closed: same-record correction approved; the correction UI remains a separate future workflow slice, not part of this Screen Contract).
- No implementation of DEC-FORM-003/004/005/006 enforcement in this slice (no blank-notes, date-validity, length-bound, or idempotency-key code changes; enforcement remains future implementation work per the approved decisions).
- No `support_helper` participation surface.
- No Sample/Phase 2 semantics; current stored `RF-YYYYMMDD-NNN` codes remain (PRD §3 Legacy Compatibility). Short display codes and truncated-UUID tokens in the `/forms` list (`forms/page.tsx:171,176,282,287`) are temporary UI, not canonical contract.
- No bulk import, no export, no financial summary on this surface.
- No changes to `/forms` list layout, filters, or detail page beyond the defined navigation outcomes.

## 12. Resolved Decisions (Mozfer-approved, registered in deferred-decisions.md)

The following decisions are approved by Mozfer and registered in [deferred-decisions.md](../deferred-decisions.md) as **CLOSED — APPROVED BY MOZFER** (approved date 2026-08-03). None remain unresolved candidates, and none change the current Screen Contract scope.

- **DEC-FORM-001 — Same-record correction and resubmission.** A rejected Research Form may later be corrected and resubmitted by updating the same persisted Research Form; a second Research Form must never be created for the same Participation. The decision supplies the same-record invariant, but detailed correction state transitions, audit history, permissions, UI, and implementation remain a separate future workflow slice — outside this Screen Contract.
- **DEC-FORM-002 — Interview date versus audit timestamp.** `submitted_date` is the interview business date; `submitted_at` is the server-recorded audit timestamp. The two fields are distinct and must not be treated as interchangeable. This decision unblocks the submission Data Contract, which may use the approved date meanings.
- **DEC-FORM-003 — Canonical blank-notes semantics.** Notes remain optional; a blank or whitespace-only value canonically means no note and persists as SQL `NULL`; an empty string is not canonical absence.
- **DEC-FORM-004 — Interview-date validity and future-date policy.** `submitted_date` must be a real calendar date (impossible dates such as `2026-02-31` are invalid) and non-future (not later than the server-authoritative current date; browser clock not authoritative); `submitted_at` is server-derived.
- **DEC-FORM-005 — Research Form notes length.** Notes must not exceed 2000 characters after trimming; the bound applies across browser, Server Action, RPC, and database once implemented.
- **DEC-FORM-006 — Logical-submission idempotency semantics.** One logical submission uses one retry-stable idempotency key (same payload replay allowed; same key with a different payload fails closed); the key is not permanently fixed to a Participation; the unique one-form invariant remains the final database safeguard.

The correction/resubmission UI remains outside this Screen Contract. This section records approved product direction only; it grants no implementation, runtime acceptance, SQL, migration, or manual-smoke claim.

## 13. Source Evidence (static)

| File | Role |
|---|---|
| `src/app/forms/new/page.tsx` | Server eligibility loading, prefilled context/error, `CreateResearchFormClient` props |
| `src/app/forms/new/actions.ts` | `createResearchFormAction` server action, validation, error mapping |
| `src/components/forms/CreateResearchFormClient.tsx` | Form surface, states, client validation, pending/completed behavior |
| `src/app/forms/route-state.ts` | `requireOwnerSession()` (Owner gate → `/forbidden`), filter/param parsing |
| `src/lib/auth/session.ts` | `requireAppSession()` (unauthenticated → `/login`) |
| `src/lib/forms/queries.ts` | `listResearchForms`, `listSubmittedResearchForms`, `getResearchForm`, row parsers |
| `src/lib/forms/rpc.ts` | `submitResearchForm` RPC wrapper |
| `src/lib/forms/copy.ts` | Stable Arabic error-code map |
| `src/lib/forms/input.ts` | `isValidUuid`, `isValidIsoDate` |
| `src/lib/ui/success-notice.ts` | `create_form` success banner copy |
| `src/app/forms/page.tsx` | `/forms` entry points, queue, list, temporary display tokens |
| `src/app/forms/[formId]/page.tsx` | Success destination, status/lifecycle/notes display |
| `supabase/migrations/20260723140000_forms_collections_rpcs.sql` | Owner-gated `submit_research_form`, EXECUTE grants |
| `supabase/migrations/20260723170000_enforce_one_research_form_per_participation.sql` | One-form invariant, `attempt_number = 1`, `duplicate_participation` |
| `supabase/migrations/20260730102500_fix_review_form_price_lookup.sql` | Price lookup semantics (acceptance-side; referenced for boundary) |

## 14. Explicit Non-Claims

- This is a **design artifact**, not an implementation approval, and grants no stage/commit/apply authority.
- No SQL is written here; the Data Contract is the next slice (`ZAM-PHASE1-RESEARCH-FORM-SUBMISSION-DATA-CONTRACT-02/03`).
- Static source evidence only: no runtime, build, or manual-smoke claims (docs-guard evidence boundaries 1–7).
- Phase 1 is marked **IN PROGRESS** in [project-roadmap.md](../project-roadmap.md) because its first delivery artifact now exists; the Data Contract, wireframe, visual specification, implementation slice, consolidated review, correction, and Phase 1 closure remain incomplete. This document itself changes no roadmap status.
- Registered in the README `## Phase 1 workflow contracts` section under `ZAM-PHASE1-SUBMISSION-SCREEN-CONTRACT-REGISTER-03`; `docs/deferred-decisions.md` register was separately synchronized under `ZAM-PHASE1-FORM-SUBMISSION-DATA-APPROVAL-09`.

## 15. Mozfer Review Checklist (for the next controlled task)

- [ ] Confirm slice scope: submission only (no review, pricing, quota, or collections).
- [ ] Confirm DEC-FORM-002 (interview date vs audit timestamp) is used in the Data Contract and that correction/resubmission UI remains outside this Screen Contract (DEC-FORM-001).
- [ ] Confirm DEC-FORM-003 (blank notes → SQL NULL), DEC-FORM-004 (calendar-valid, non-future interview date), DEC-FORM-005 (notes ≤ 2000 chars after trimming), and DEC-FORM-006 (retry-stable idempotency; non-Participation-fixed key) are respected by the future Data Contract, and that current implementation does not yet prove full conformance.
