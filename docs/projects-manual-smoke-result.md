# Projects MVP — manual browser smoke result (DEV/DEMO)

**Primary closeout task:** `ZAM-PROJECTS-CREATE-FORM-ERROR-STATE-SMOKE-CLOSE-1`
**Related prior closeouts:** `ZAM-PROJECTS-MANUAL-SMOKE-CLOSE-1`, UI polish smoke (Mozfer after `fc13d92`), create-form preservation smoke (Mozfer after `7cb47d90`)
**Plan authority:** `docs/projects-manual-smoke-plan.md`
**Final overall verdict:** **PASS**
**HOLD conditions:** **None observed**

---

## Execution ownership

| Actor | Role |
|---|---|
| **Mozfer** | Performed all manual browser smoke actions in designated DEV/DEMO |
| **Agent** | Authored plans/fixes earlier; this closeout documents Mozfer’s reported results only — **no** browser automation, **no** SQL, **no** agent-executed smoke |

Runtime results remain **Mozfer evidence**, not agent-executed verification.

---

## Environment

| Field | Value |
|---|---|
| Environment | DEV/DEMO only |
| Supabase project ref | `gdegnwglakyblnmxgiwx` |
| PostgreSQL | 17.6 (per prior apply/docs authority) |
| App surfaces under test | `/projects`, `/projects/new`, `/projects/[projectId]`, `/projects/[projectId]/edit` |
| Initial app baseline (edit complete) | `9a001086ab0c50265d4dc19ee86e57bdb05b9923` |
| UI polish fix commit | `fc13d9248a974a11caa4778a05f91593bb304ac5` |
| Create-form preservation fix commit | `7cb47d9007d07e2894cd96ef526aef8726732e79` |

No passwords, emails, Auth IDs, profile IDs, tokens, or business-row identifiers are recorded here.
No screenshots are committed to the repository.

---

## Final overall verdict

### **PASS**

Mandatory functional, role, finance-boundary, UI polish, and create-form error-state scenarios **passed** under Mozfer manual browser verification on designated DEV/DEMO.

- Original runtime smoke (`ZAM-PROJECTS-MANUAL-SMOKE-CLOSE-1`) closed functional acceptance with two nonblocking UI polish warnings.
- Those polish warnings are **closed** after Mozfer re-smoke of the Stitch polish fix.
- Create-form value-preservation defect is **closed** after Mozfer re-smoke of the error-state fix.

**Production readiness is not claimed.**
**Branded loading mark remains design-only (not implemented).**

---

## Confirmed runtime results (original MVP smoke)

### 1. Projects list — PASS

- Arabic Projects list loads
- Search and Company/status filters visible
- **إضافة مشروع** visible
- Operational Project cards load
- No raw UUIDs visibly rendered
- No financial fields or language

### 2. Support Helper — PASS

- Access list, detail, draft/active edit
- Can update operational Project data
- **No** lifecycle transition actions
- **No** financial information

### 3. Owner — PASS

- Access detail and operational edit
- Draft exposes only: **activate**, **cancel**
- After activation, active exposes only: **close**, **cancel**
- After closure, lifecycle actions disappear
- Closed Project is read-only
- No reopen / back-to-draft

### 4. Lifecycle evidence — PASS

- draft → active succeeded
- active → closed succeeded
- Approved action set preserved at each status
- Terminal closed: read-only behavior

### 5. Edit behavior — PASS

- Prefill of operational values
- Draft Company selection editable
- Status as context only (not an editable submitted field)
- Operational save succeeded
- No lifecycle field on edit form

### 6. Security and finance boundary — PASS

Absent / not exposed:

- Project financial settings
- prices, payments, settlements, wages
- amount due / paid / remaining
- financial summaries

Also:

- Quota remained an operational target
- No raw SQL/PostgREST errors observed
- No cross-account information disclosure observed

**Cross-account destructive probing:** **not claimed** (deferred / nonblocking when not run).

### 7. Arabic / RTL — PASS

- Arabic-first RTL layout operational
- Labels, cards, detail sections, forms readable
- Actions visible and text-labelled

---

## Follow-up A — UI polish smoke (Mozfer) — PASS

**Fix commit:** `fc13d9248a974a11caa4778a05f91593bb304ac5`
**Tasks:** `ZAM-PROJECTS-UI-STITCH-POLISH-1` (implementation) + Mozfer manual visual re-check

| Former warning | Result | Evidence summary |
|---|---|---|
| WARN-1 RTL date text BiDi reorder | **Closed — PASS** | Project dates display as readable isolated **DD/MM/YYYY** tokens; reordering defect not observed |
| WARN-2 Lifecycle action colors | **Closed — PASS** | **Activate Project** visually green; **Cancel Project** visually red; Close remains distinct; Arabic labels and lifecycle behavior unchanged |

These polish items no longer block Projects MVP acceptance.

---

## Follow-up B — Create-form error-state preservation smoke (Mozfer) — PASS

**Fix commit:** `7cb47d9007d07e2894cd96ef526aef8726732e79`
**Closeout task:** `ZAM-PROJECTS-CREATE-FORM-ERROR-STATE-SMOKE-CLOSE-1`

### Confirmed user scenario

1. Opened `/projects/new`.
2. Filled the full Project form, including Company and Project domain.
3. Submitted with end date earlier than start date.
4. Safe date validation error appeared.
5. **All submitted values remained populated** after the error.
6. **Company selection remained populated.**
7. **Project domain remained populated.**
8. Date, number, text, resident, and warning-checkbox values remained populated.
9. Corrected **only** the invalid date.
10. Submitted again successfully.
11. Project was created and the flow returned normally to `/projects`.

### Defects closed

| Defect | Status |
|---|---|
| Create-form error-state value loss | **Closed** |
| Company selection reset after validation error | **Closed** |
| Project domain reset after validation error | **Closed** |
| Need to reselect Company/domain or retype unrelated fields | **Not required** (confirmed) |

### Additional confirmations

- No raw database / Supabase / PostgREST error text appeared
- Server-side validation remained authoritative
- Success behavior remained list redirect (`/projects`)
- Agent did **not** perform SQL or browser automation for this smoke

### Create-form smoke verdict

**PASS**

---

## Branded loader

| Item | Status |
|---|---|
| Design | Documented (`docs/brand-loading-mark-design.md`) |
| Implementation | **Not started** |
| Smoke loaders | Existing skeleton/loading behavior only |
| Claim | **Do not** claim branded loader implemented |

Future implementation remains `ZAM-BRAND-LOADING-MARK-IMPLEMENT-1` (separate from Projects MVP closeout).

---

## Closure summary

| Gate | Result |
|---|---|
| Manual browser smoke (original MVP) | **Completed** (Mozfer) — functional **PASS**; polish WARNs later closed |
| UI polish re-smoke (dates + lifecycle colors) | **PASS** (Mozfer) |
| Create-form error-state preservation re-smoke | **PASS** (Mozfer) |
| Final overall result | **PASS** |
| Runtime acceptance | **Closed** |
| Value preservation defect | **Closed** |
| Company/domain reset defect | **Closed** |
| RTL date polish | **PASS / closed** |
| Lifecycle semantic-color polish | **PASS / closed** |
| Support Helper role isolation | **PASS** |
| Owner lifecycle matrix | **PASS** |
| Terminal read-only | **PASS** |
| Finance blindness | **PASS** |
| Production readiness | **Not claimed** |
| Cross-account destructive probing | **Not claimed** |
| Branded loading mark | **Design only; not implemented** |
| Automated browser execution | **Not claimed** (none performed by agent) |
| Agent SQL execution for smoke | **Not performed** |

---

## Explicit non-claims

- Production readiness is **not** claimed.
- Branded loading mark is **not** implemented.
- Agent did **not** run browser or SQL for these smoke closeouts.
- No secrets or raw identity evidence committed.
- Cross-account isolation PASS is **not** claimed.
