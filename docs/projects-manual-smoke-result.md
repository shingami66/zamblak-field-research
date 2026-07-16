# Projects MVP — manual browser smoke result (DEV/DEMO)

**Task:** `ZAM-PROJECTS-MANUAL-SMOKE-CLOSE-1`
**Plan authority:** `docs/projects-manual-smoke-plan.md`
**Final verdict:** **PASS WITH WARN**
**HOLD conditions:** **None observed**

---

## Execution ownership

| Actor | Role |
|---|---|
| **Mozfer** | Performed all manual browser smoke actions in designated DEV/DEMO |
| **Agent** | Authored the smoke plan earlier; this closeout documents Mozfer’s reported results only — **no** browser automation, **no** SQL, **no** agent-executed smoke |

Runtime results remain **Mozfer evidence**, not agent-executed verification.

---

## Environment

| Field | Value |
|---|---|
| Environment | DEV/DEMO only |
| Supabase project ref | `gdegnwglakyblnmxgiwx` |
| PostgreSQL | 17.6 (per prior apply/docs authority) |
| App surfaces under test | `/projects`, `/projects/new`, `/projects/[projectId]`, `/projects/[projectId]/edit` |
| Plan baseline commit (app) | `9a001086ab0c50265d4dc19ee86e57bdb05b9923` (Projects edit complete) |
| Docs plan commit | `d5fd330628358fbe55e0a3b829856f91afca72d7` |

No passwords, emails, Auth IDs, profile IDs, tokens, or business-row identifiers are recorded here.
No screenshots are committed to the repository.

---

## Final verdict

### **PASS WITH WARN**

Mandatory functional and security scenarios **passed**.
Two **nonblocking UI polish** warnings remain (see § Warnings). They do **not** reopen Projects runtime implementation and do **not** constitute HOLD.

---

## Confirmed runtime results

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

### 7. Arabic / RTL — PASS (with WARN-1 on date *display*)

- Arabic-first RTL layout operational
- Labels, cards, detail sections, forms readable
- Actions visible and text-labelled

---

## Nonblocking warnings

### WARN-1 — RTL date display

**Severity:** nonblocking UI polish

Date-only values are stored and shown correctly **inside date form controls**, but list/detail **text** presentation can visually reorder characters under RTL.

Observed visual examples (display only; not storage corruption):

- resembles `172026/07/`
- resembles `242026/07/`

**Future correction** (`ZAM-PROJECTS-UI-STITCH-POLISH-1`):

- isolate date text direction safely (e.g. LTR / bidi-isolated wrapper)
- preserve date-only semantics
- no timezone conversion
- repository-approved date formatting

### WARN-2 — Lifecycle action colors

**Severity:** nonblocking UI polish

Lifecycle buttons are readable and correctly labelled, but visual semantics should be strengthened:

| Action | Desired visual cue |
|---|---|
| Activate Project | green positive action |
| Cancel Project | red destructive action |
| Close Project | dark teal or clear neutral terminal action |

**Requirements for future polish:**

- text remains visible
- color is not the only meaning
- accessible contrast and focus states
- **no** behavior or lifecycle-rule changes

These warnings **do not** reopen Projects runtime implementation.

---

## Branded loader

| Item | Status |
|---|---|
| Design | Documented (`docs/brand-loading-mark-design.md`) |
| Implementation | **Not started** |
| Smoke loaders | Existing skeleton/loading behavior only |
| Claim | **Do not** claim branded loader implemented |

Future implementation remains `ZAM-BRAND-LOADING-MARK-IMPLEMENT-1` (separate from Projects polish).

---

## Next UI polish task

**`ZAM-PROJECTS-UI-STITCH-POLISH-1`**

Intended scope (not executed here):

- Zamblak Stitch design system as visual authority
- Impeccable / applicable design skills
- Fix RTL date presentation (WARN-1)
- Semantic lifecycle button styling (WARN-2)
- Spacing, badges, focus, hover, responsive polish
- Preserve current behavior and data boundaries
- Avoid literal copying of Stitch screens

---

## Closure summary

| Gate | Result |
|---|---|
| Manual browser smoke | **Completed** (Mozfer) |
| Final result | **PASS WITH WARN** |
| Runtime acceptance | **Closed** with two nonblocking UI warnings |
| Support Helper role isolation | **PASS** |
| Owner lifecycle matrix | **PASS** |
| Terminal read-only | **PASS** |
| Finance blindness | **PASS** |
| RTL date formatting | **WARN** → polish task |
| Lifecycle semantic colors | **WARN** → polish task |
| Production readiness | **Not claimed** |
| Cross-account destructive probing | **Not claimed** |
| Automated browser execution | **Not claimed** (none performed by agent) |

---

## Explicit non-claims

- Unconditional **PASS** without warnings is **not** recorded.
- Production readiness is **not** claimed.
- Branded loading mark is **not** implemented.
- Agent did **not** run browser or SQL for this smoke.
- No secrets or raw identity evidence committed.
