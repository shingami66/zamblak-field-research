# Research Form Submission — Wireframe (Low-Fidelity)

## 1. Purpose, Status, and Authority

**Status:** `APPROVED — MOZFER PRODUCT AUTHORITY`

**Approval metadata:**
- **Approved by:** Mozfer
- **Approved date:** 2026-08-03
- **Approval scope:** low-fidelity Wireframe structure and workflow layout only
- **Visual Specification status:** not started / not approved
- **Implementation status:** not implemented and not authorized by this approval
- **Runtime acceptance:** unclaimed

- Phase: Phase 1.
- Slice: Owner Researcher Research Form submission workflow.
- Primary route: `/forms/new`.
- Adjacent routes: `/forms`, `/forms/[formId]`, `/projects/[projectId]/participants`, `/projects`.
- Created under: `ZAM-PHASE1-RESEARCH-FORM-SUBMISSION-WIREFRAME-17`.
- Approved under: `ZAM-PHASE1-RESEARCH-FORM-SUBMISSION-WIREFRAME-MOZFER-APPROVAL-19` (`DOCS_SYNC_ONLY_NO_STAGE`).
- Mozfer approved this Wireframe on 2026-08-03; the approval covers the low-fidelity structure and workflow layout only.
- This wireframe is **not implemented**.
- No runtime behavior is claimed or accepted here.

**Implementation direction:** the existing `/forms/new` page will be improved; this approval does not authorize rebuilding the page from scratch; exact implementation changes require the later approved Implementation Slice. This direction is not an implementation claim.

**Authority precedence (highest to lowest):**

1. User-approved task prompt.
2. `AGENTS.md` and Zamblak skills.
3. Canonical documents: `docs/product-requirements.md`, `docs/roles-permissions.md`, `docs/security-foundation.md`, `docs/database-schema.md`, `docs/deferred-decisions.md`, `docs/project-roadmap.md`.
4. `docs/contracts/research-form-submission-screen-contract.md` — governs screen scope, copy, navigation, and states.
5. `docs/contracts/research-form-submission-data-contract.md` — governs data semantics.
6. `docs/wireframes/research-form-submission-wireframe.md` — this document; low-fidelity structure only.
7. Current committed source code and Supabase migrations — technical reality.

**Recorded boundary:** This wireframe is a subordinate low-fidelity structural document. It does not approve the Visual Specification, does not implement source code, does not apply database changes, and grants no runtime acceptance.

## 2. Fidelity and Non-Goals

- Format: Markdown with compact tables and ASCII wireframe blocks.
- Structural labels used: `[NAVIGATION]`, `[HEADER]`, `[ALERT]`, `[STATUS]`, `[LOCKED CONTEXT]`, `[FORM CARD]`, `[FIELD]`, `[HELPER]`, `[ERROR]`, `[SECONDARY ACTION]`, `[PRIMARY ACTION]`.
- No images, screenshots, Figma embeds, or binary assets.
- No Mermaid or other diagram engines.
- No HTML, JSX, CSS, or Tailwind markup.
- No colors, typography, shadows, radii, spacing values, icon sets, or animations.
- No breakpoint values or viewport widths.
- No high-fidelity or pixel-level design.
- No implementation code, SQL, migrations, or tests.

## 3. Route, Entry, and Exit Map

| Route | Label copy | Direction / role | Source |
| --- | --- | --- | --- |
| `/forms` | `نماذج البحث الميداني` | Entry list; primary action `استمارة جديدة`; empty-state action `تسجيل استمارة جديدة` | `src/app/forms/page.tsx` |
| `/forms/new` | `تسجيل استمارة جديدة` | Primary submission surface; this wireframe | `src/app/forms/new/page.tsx` |
| `/forms/new?project=<uuid>&participant=<uuid>` | — | Prefilled submission surface; locked participant context | `src/app/forms/new/page.tsx` |
| `/forms/[formId]?success=create_form` | `تم تسجيل الاستمارة وإرسالها للمراجعة.` | Destination after successful submission; banner rendered on the destination surface | `src/app/forms/[formId]/page.tsx`, `src/lib/ui/success-notice.ts` |
| `/projects/[projectId]/participants` | `العودة لمشاركي المشروع` | Return link inside the locked context card | `src/components/forms/CreateResearchFormClient.tsx` |
| `/projects` | `عرض المشاريع` | Empty-state exit when no eligible projects exist | `src/components/forms/CreateResearchFormClient.tsx` |

- Flow: `/forms` → `/forms/new` → submit → `/forms/[formId]?success=create_form`.
- Prefilled flow: `/projects/[projectId]/participants` → `/forms/new?project=<uuid>&participant=<uuid>` → submit → `/forms/[formId]?success=create_form`.
- Raw UUIDs are internal identifiers only; they are never normal user-facing references.

## 4. Global Information Hierarchy

Top-to-bottom order on the surface, in every mode:

1. `[NAVIGATION]` back link to `/forms`.
2. `[HEADER]` page title, then page description.
3. `[ALERT]` invalid-prefilled-context alert — only in the invalid prefilled state.
4. `[STATUS]` no-eligible-projects state — only in that state.
5. `[LOCKED CONTEXT]` locked participant context card — prefilled mode only.
6. `[FORM CARD]` submission form.
7. `[ERROR]` inline submission error region, after fields, before actions.
8. `[SECONDARY ACTION]` then `[PRIMARY ACTION]`.

Absent by design: steppers, tabs, side navigation, pricing panels, review controls, financial panels, Sample-domain panels, extra confirmation screens, and manual form-reference entry.

## 5. Direct Mode — Desktop

Single primary-flow column; not a wizard.

```
[NAVIGATION]
  → العودة إلى الاستمارات

[HEADER]
  تسجيل استمارة جديدة
  اربط الاستمارة بمشارك داخل مشروع قائم، ثم أدخل تاريخ المقابلة.

[FORM CARD]
  [FIELD] المشروع (مطلوب)
    +-------------------------------------------+
    | -- اختر المشروع --                        |
    +-------------------------------------------+
    (option pattern: {projectName} ({availableCount} مشارك متاح))

  [FIELD] المشارك (مطلوب — معطل حتى اختيار المشروع)
    +-------------------------------------------+
    | -- اختر المشروع أولاً --                  |
    +-------------------------------------------+
    (option pattern: {name} - {mobile})

  [FIELD] تاريخ المقابلة (مطلوب)
    +-------------------------------------------+
    | [تاريخ]                                   |
    +-------------------------------------------+

  [FIELD] ملاحظات (اختياري)
    [HELPER] أضف أي ملاحظة مهمة عن المقابلة، إن وجدت.
    +-------------------------------------------+
    |                                           |
    |                                           |
    +-------------------------------------------+

  [ERROR] (hidden until needed)

  [SECONDARY ACTION] إلغاء
  [PRIMARY ACTION]   حفظ الاستمارة
```

## 6. Prefilled Mode — Desktop

Locked context card appears between the page intro and the form card. Project and Participant selectors are absent; the browser cannot alter the locked context.

```
[NAVIGATION]
  → العودة إلى الاستمارات

[HEADER]
  تسجيل استمارة جديدة
  اربط الاستمارة بمشارك داخل مشروع قائم، ثم أدخل تاريخ المقابلة.

[LOCKED CONTEXT]
  سياق المشارك المحدد
  +-------------------------------------------+
  | المشروع      {projectName}                |
  | المشارك      {participantName}            |
  | رقم الجوال   {participantMobile}          |
  | → العودة لمشاركي المشروع                  |
  +-------------------------------------------+

[FORM CARD]
  [FIELD] تاريخ المقابلة (مطلوب)
    +-------------------------------------------+
    | [تاريخ]                                   |
    +-------------------------------------------+

  [FIELD] ملاحظات (اختياري)
    [HELPER] أضف أي ملاحظة مهمة عن المقابلة، إن وجدت.
    +-------------------------------------------+
    |                                           |
    |                                           |
    +-------------------------------------------+

  [ERROR] (hidden until needed)

  [SECONDARY ACTION] إلغاء
  [PRIMARY ACTION]   حفظ الاستمارة
```

### 6.1 Invalid prefilled context

```
[ALERT]
  تنبيه في البيانات الممررة
  (source-grounded message; the valid direct-mode form remains available below)

[FORM CARD]  (as in Section 5, fully operable)
```

- No raw UUID, invalid technical value, or code is displayed.
- No auto-submit ever occurs.
- The direct-mode form is the fallback path for the user.

## 7. Narrow / Mobile

```
[NAVIGATION]
  → العودة إلى الاستمارات

[HEADER]
  تسجيل استمارة جديدة
  اربط الاستمارة بمشارك داخل مشروع قائم، ثم أدخل تاريخ المقابلة.

[ALERT]    (only when invalid prefilled context)
[STATUS]   (only when no eligible projects)

[LOCKED CONTEXT]  (prefilled mode only; values wrap; mobile number LTR-isolated)

[FORM CARD]
  المشروع (مطلوب)
  المشارك (مطلوب)
  تاريخ المقابلة (مطلوب)
  ملاحظات (اختياري)

[ERROR]

[SECONDARY ACTION] إلغاء
[PRIMARY ACTION]   حفظ الاستمارة
```

- One column; no horizontal scrolling.
- Labels above controls.
- Locked-context values wrap without covering actions.
- Alerts and status precede the context card and form card.
- Actions remain reachable; no sticky footer and no sticky submit.

## 8. State Variants

| # | State | Trigger | Visible regions | Enabled / disabled | Focus or announcement | Outcome / navigation | Source |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Ready — direct | Owner opens `/forms/new` | Intro, form card, actions | All operable | Normal document and keyboard order applies; this Wireframe does not specify or claim programmatic initial-focus movement | Stay | `page.tsx`, client |
| 2 | Ready — prefilled | Owner opens `/forms/new?project&participant` (valid pair) | Intro, locked context, form card, actions | Project/Participant absent; date, notes, Save operable | Normal document and keyboard order applies; no programmatic initial-focus movement is claimed | Stay; return link to participants | `page.tsx`, client |
| 3 | No eligible projects | No active project has an available participant | Intro, status card, actions | Project, Participant, date, notes, Save disabled | `role="status"` announced on render | `عرض المشاريع` → `/projects` | client |
| 4 | Invalid prefilled context | UUIDs invalid or pair not eligible | Intro, alert, direct form card, actions | Form fully operable | `role="alert"` announced on render | Stay; no auto-submit | `page.tsx`, client |
| 5 | Project selected, no eligible participants | Selected project has zero available participants | Intro, form card with helper, actions | Participant disabled; Save disabled | The visible contextual helper remains adjacent to the Participant control; no programmatic announcement or focus movement is claimed by this Wireframe; exact live-region behavior, if later required, belongs to implementation and accessibility validation | Changing Project may restore eligibility | client |
| 6 | Client validation failure | Missing participant or date on submit | Form card, error region | All operable except during pending | The inline error is exposed through the existing `role="alert"` region; programmatic focus movement after validation failure is a future implementation requirement and is not claimed as current behavior | Stay | client |
| 7 | Server/action failure | Server action returns an error code | Form card, error region | All operable except during pending | The inline server/action error is exposed through the existing `role="alert"` region; programmatic focus movement after failure remains future implementation work and is not claimed as current behavior | Stay | `actions.ts` |
| 8 | Pending submission | Save pressed; transition active | Form card, actions | Primary shows `جاري الحفظ...` and is disabled; duplicate submission blocked at interaction layer | Status conveyed by the primary action label | Same page | client |
| 9 | Authorization redirect | Session missing or role not `owner` | — | — | — | `/login` or `/forbidden` via `requireOwnerSession` | `route-state.ts` |
| 10 | Success | Action returns `ok` | — | — | — | Navigate `/forms/[formId]?success=create_form`; banner `تم تسجيل الاستمارة وإرسالها للمراجعة.` on destination | client, `success-notice.ts` |

### 8.1 No-eligible-projects state copy

```
[STATUS]
  لا توجد مشاريع متاحة لتسجيل استمارات
  أضف مشاركاً إلى مشروع نشط، أو راجع المشاركين الذين تم تسجيل استمارات لهم.
  [SECONDARY ACTION] عرض المشاريع
```

- Workflow must not allow submission in this state.
- The exact hide-vs-disable presentation of the suppressed controls is deferred to the Visual Specification.

### 8.2 No-available-participants copy

```
[FIELD] المشارك (مطلوب — معطل)
  (placeholder: لا يوجد مشاركون متاحون لتسجيل استمارة في هذا المشروع.)
```

## 9. Interaction and Focus Order

- Direct mode: Back link → Project → Participant → date → Notes → Cancel → Save.
- Prefilled mode: Back link → locked-context return link → date → Notes → Cancel → Save.
- Alerts are announced on render; there are no focus traps.
- Post-server-error focus behavior may be refined only as a future requirement; it is not a claim here.

## 10. Responsive Structural Rules

- RTL-first layout throughout; no visual-direction inversion claims.
- Single-column core; structure re-stacks without horizontal scrolling.
- Alerts precede context and form content.
- Controls occupy the full content width; long names wrap without covering actions.
- Mobile numbers and dates receive LTR isolation inside the RTL flow.
- No breakpoints, widths, gaps, font sizes, or colors are specified.

## 11. Accessibility Structure

- Explicit labels for every field; required indication on `المشروع`, `المشارك`, `تاريخ المقابلة`.
- `role="alert"` for the invalid-prefilled alert and the inline error region.
- `role="status"` for the no-eligible-projects state.
- Native form controls; semantic headings; logical DOM order matching the visual order.
- Enter submits the form; no color-only meaning anywhere.
- Mobile numbers isolated as LTR within RTL text.
- Touch-target sizing deferred to the Visual Specification.
- No automated or manual testing claims are made.

## 12. Arabic Copy Inventory

All copy is source-grounded; none is invented or reworded.

| # | Copy | Region | Mode / state | Source | Type |
| --- | --- | --- | --- | --- | --- |
| 1 | `العودة إلى الاستمارات` | Navigation | All | `CreateResearchFormClient.tsx` (BackLink) | Link |
| 2 | `تسجيل استمارة جديدة` | Header | All | `page.tsx` metadata, client | Heading |
| 3 | `اربط الاستمارة بمشارك داخل مشروع قائم، ثم أدخل تاريخ المقابلة.` | Header | All | client | Description |
| 4 | `المشروع` | Field | Direct | client | Label |
| 5 | `المشارك` | Field | Direct | client | Label |
| 6 | `تاريخ المقابلة` | Field | All | client | Label |
| 7 | `ملاحظات` | Field | All | client | Label |
| 8 | `أضف أي ملاحظة مهمة عن المقابلة، إن وجدت.` | Field helper | All | client | Helper |
| 9 | `إلغاء` | Actions | All | client | Secondary action |
| 10 | `حفظ الاستمارة` | Actions | All | client | Primary action |
| 11 | `جاري الحفظ...` | Actions | Pending | client | Primary action label |
| 12 | `سياق المشارك المحدد` | Locked context | Prefilled | client | Heading |
| 13 | `رقم الجوال` | Locked context | Prefilled | client | Display label |
| 14 | `العودة لمشاركي المشروع` | Locked context | Prefilled | client | Link |
| 15 | `تنبيه في البيانات الممررة` | Alert | Invalid prefilled | client | Alert heading |
| 16 | `لا توجد مشاريع متاحة لتسجيل استمارات` | Status | No eligible projects | client | Status heading |
| 17 | `عرض المشاريع` | Status | No eligible projects | client | Link |
| 18 | `لا يوجد مشاركون متاحون لتسجيل استمارة في هذا المشروع.` | Field helper | No available participants | client | Helper |
| 19 | `تم تسجيل الاستمارة وإرسالها للمراجعة.` | Destination banner | Success | `src/lib/ui/success-notice.ts` (`create_form`) | Success notice |

## 13. Contract Traceability Matrix

| # | Concern | Screen Contract section | Data Contract section | Source evidence | Conformance |
| --- | --- | --- | --- | --- | --- |
| 1 | Owner-only authorization | Authz boundary | §7 Tenant & eligibility boundary | `requireOwnerSession`, `/forbidden` | Consistent |
| 2 | Entry navigation and exits | Route map | — | `forms/page.tsx`, client links | Consistent |
| 3 | Page intro (title + description) | Header | — | client | Consistent |
| 4 | Project selector (options, placeholder, availability counts) | Project field | §3.3 `project_id` | `page.tsx` eligible-projects build, client | Consistent |
| 5 | Participant selector (dependent, disabled until project, option pattern) | Participant field | §3.3 `participation_id` | client | Consistent |
| 6 | Locked participant context | Prefilled lock | §3.3 participant binding | `page.tsx` prefilled build, client | Consistent |
| 7 | Interview date (required, calendar input) | Date field | §3.3 `submitted_date` | client, `actions.ts` | Consistent with approved contract; strict calendar/non-future enforcement not yet in source |
| 8 | Notes (optional, nullable) | Notes field | §3.3 `notes` | client, `actions.ts` trim-to-null | Consistent; SQL NULL / 2000-char enforcement not yet in source |
| 9 | No-eligible state (status + exit) | Empty state | §5 eligibility | client | Consistent |
| 10 | Shared inline error region | Error region | §5 | client, `actions.ts` | Consistent |
| 11 | Action group (Cancel, Save, pending label) | Actions | §6 submission | client | Consistent |
| 12 | Pending and duplicate-submission block | Pending | §6 idempotency | client `useTransition` | Consistent; retry-stable idempotency not yet in source |
| 13 | Success navigation + destination banner | Success | §6 | client `router.push`, `success-notice.ts` | Consistent |
| 14 | UUID display boundary | UUID boundary | — | client, `page.tsx` | Consistent |
| 15 | Tenant and eligibility boundary | — | §7 | `actions.ts` codes, RLS-required semantics | Consistent |

## 14. Current Source Alignment and Known Boundaries

**Approved target structure:** Sections 5-8 reflect the approved Screen Contract structure.

**Current source-grounded structure:** The implemented client renders the same region order — navigation back link, intro, alert/status, locked context, form card, shared error region, action group — with the exact copy in Section 12, and submits via a server action with the same success destination.

**Known Data Contract nonconformances (documented, not fixed by this wireframe):**

- Active-only and non-deleted Project enforcement (`status = 'active'` with `deleted_at IS NULL` semantics).
- Strict calendar validation and non-future date enforcement.
- SQL `NULL` handling for empty notes.
- 2000-character notes enforcement.
- Retry-stable idempotency.

**Deferred to the Visual Specification:** exact hide-vs-disable presentation in the no-eligible state; touch-target sizing; all visual tokens.

**Deferred to implementation work:** closing the nonconformances above.

This wireframe fixes none of the gaps; no gap here is a defect that this wireframe converts into a visual feature.

## 15. Explicit Exclusions and Non-Claims

1. Pricing, `accepted_price_snapshot`, and quota override.
2. Review Accept/Reject controls.
3. Cancellation UI.
4. Correction or resubmission UI.
5. Collections UI and settlement states.
6. Financial panels and export.
7. Sample-domain concepts.
8. Future `P###-S##-F###` codes.
9. Support Helper submission flows.
10. Multi-researcher roles.
11. Excel import/export.
12. WhatsApp integration.
13. Visual tokens and design-system decisions.
14. High-fidelity design.
15. Source-code implementation.
16. SQL and migrations.
17. Tests.
18. Browser smoke verification.
19. Runtime acceptance and production readiness.
20. Any manual form-reference entry.
21. Phase 1 closure.

## 16. Mozfer Wireframe Review Checklist

- [x] Global information hierarchy matches Section 4.
- [x] Direct-mode layout matches Section 5.
- [x] Prefilled-mode layout and locked context match Section 6.
- [x] Empty, invalid-prefilled, error, pending, and success states match Section 8.
- [x] Interaction and focus order matches Section 9.
- [x] Mobile stacking matches Section 7.
- [x] Arabic copy placement matches Section 12.
- [x] No pricing, review, financial, Sample, or future-role leakage (Section 15).
- [x] No raw UUID display anywhere in the surface.
- [x] Approval granted, or bounded correction requested.
