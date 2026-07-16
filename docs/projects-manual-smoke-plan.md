# Projects MVP — manual browser smoke plan (DEV/DEMO)

**Task:** `ZAM-PROJECTS-MANUAL-SMOKE-PLAN-1`
**Status:** PLAN FROZEN — **not executed**
**Executor:** **Mozfer only** (agent prepares the plan; agent does **not** run browser smoke)
**Target app commit (precondition):** `9a001086ab0c50265d4dc19ee86e57bdb05b9923`
**Next task after Mozfer runs this plan:** `ZAM-PROJECTS-MANUAL-SMOKE-RUN-1` (or Mozfer execution of this plan under that ID)

---

## 1. Purpose

Provide one complete, practical, Mozfer-executable manual browser smoke plan for the **completed Projects MVP** surfaces on designated DEV/DEMO.

This plan freezes:

- what to test;
- expected results;
- role boundaries;
- evidence rules;
- PASS / PASS WITH WARN / HOLD criteria.

It does **not** record runtime results. Runtime acceptance remains open until Mozfer reports evidence under a separate run task.

---

## 2. Scope

### Implemented routes (must exist)

| Route | Surface |
|---|---|
| `/projects` | List (search, company filter, status filter, pagination) |
| `/projects/new` | Create draft Project |
| `/projects/[projectId]` | Detail + Owner lifecycle actions |
| `/projects/[projectId]/edit` | Edit (status-dependent) |

### Application contracts (already installed)

- `listProjects`
- `getProject`
- `createProject`
- `updateProject`
- `transitionProjectStatus` (Owner only at DB + UI)

### Roles under test

- `owner`
- `support_helper` (same demo account as Owner)

### Environment

- Supabase DEV/DEMO project ref: **`gdegnwglakyblnmxgiwx`**
- PostgreSQL: **17.6**
- Projects schema/RPC + correction migrations applied and verified (source of truth: `docs/database-migrations.md` / `docs/project-status.md`)

---

## 3. Non-goals

Do **not** include in this smoke:

- agent browser automation or agent-performed smoke;
- SQL Editor / migration apply / RPC console testing as the primary path;
- production environment;
- real customer or respondent personal data;
- cross-account isolation PASS (deferred/nonblocking unless a second controlled account already exists);
- delete/restore of Projects (no MVP delete workflow);
- financial settings / payments / settlements / wages;
- participation / respondent workflows;
- branded Zamblak loading-mark implementation (design-only elsewhere);
- claiming production readiness.

---

## 4. Environment confirmation (before any click)

Mozfer must confirm and record:

| Check | Expected |
|---|---|
| Git commit of running app | `9a001086ab0c50265d4dc19ee86e57bdb05b9923` (or a later commit only if Mozfer explicitly documents a superseding baseline) |
| Supabase project | Dashboard project ref **`gdegnwglakyblnmxgiwx`** (DEV/DEMO only) |
| App env | Local or approved DEV/DEMO host pointed at that project |
| Data class | Disposable demo only; no real customer/respondent PII |
| Session isolation | Owner and Support Helper not mixed in one browser profile without full logout |
| Companies | At least two **active**, non-deleted same-account demo Companies (A and B) |
| Secrets | No passwords, emails, Auth/profile UUIDs, JWTs, or service-role keys recorded in notes |

If any row fails: **stop** and treat as environment HOLD before scenario work.

---

## 5. Repository / app preconditions

1. Working tree used for the run matches the intended commit (see §4).
2. App starts cleanly (`npm run dev` or approved host).
3. Login works for both test roles via normal Auth UI.
4. Companies list is usable (existing Companies MVP).
5. Projects routes resolve (not placeholder).

---

## 6. Required test roles

| Role | Purpose |
|---|---|
| Owner | Full operational CRUD + lifecycle transitions |
| Support Helper | Same-account operational list/create/detail/edit; **no** lifecycle |

Both identities must belong to the **same** intended demo account.

**Do not document:** emails, passwords, Auth user IDs, or profile IDs.

---

## 7. Required demo Company data

Need **two active Companies** in the same account:

| Label | Purpose |
|---|---|
| **Company A** | Initial Project parent |
| **Company B** | Draft Company change target |

If neither exists, create them first via **Companies UI only** (not SQL). Prefer names under the smoke prefix when creating new ones, e.g. `ZAM-SMOKE-PROJECTS Co A`.

---

## 8. Required browser / session setup

1. Prefer two clean profiles or one Owner session + separate Support Helper incognito.
2. Desktop viewport first, then narrow mobile width for §20.
3. Disable extensions that inject UI or translate the page.
4. Full logout between role switches if using one profile.
5. Do not open production Supabase projects in the same smoke notes.

---

## 9. Evidence capture rules

### Per scenario record

- role (Owner / Support Helper)
- route
- action
- expected result
- actual result
- PASS / WARN / HOLD
- screenshot reference (optional)
- notes

### Screenshots must exclude

- passwords, tokens, cookies, Auth IDs, profile IDs
- service-role keys
- emails when avoidable
- browser devtools secret panes

### High-value evidence (required)

1. Owner list
2. Owner create success (draft on list)
3. Draft detail (lifecycle actions visible for Owner)
4. Draft Company change A→B
5. Active Company locked on edit
6. Owner lifecycle transition (activate and/or close)
7. Terminal read-only (closed or cancelled)
8. Support Helper detail **without** lifecycle actions
9. Stale-version rejection (two-tab)
10. Finance-blindness spot check (list + detail + edit)

---

## 10. Owner smoke scenarios (overview)

Execute Owner path §12–§16 in order where dependencies exist (create → detail → edit → activate → lock → close; separate cancel path).

---

## 11. Support Helper smoke scenarios (overview)

After Owner has created at least one draft and one active Project (or SH creates own draft), run Support Helper path §12–§15 with **zero** lifecycle actions.

---

## 12. List-page scenarios (`/projects`)

### L1 — Initial load (Owner and SH)

| Step | Expected |
|---|---|
| Open `/projects` | Page loads; Arabic title **المشاريع** |
| Toolbar | Search, company filter, status filter, search action |
| Header | **إضافة مشروع** visible for Owner **and** SH |
| Cards | Operational fields only; Arabic status/domain; **no** raw UUIDs |
| Finance | No price/payment/settlement/due/wage labels |
| Pagination | Prev/next only when applicable; **no invented total count** (e.g. no “120 مشروعاً” without total API) |

### L2 — Search and filters (Owner)

| Step | Expected |
|---|---|
| Search Project name | Matching cards only |
| Search Company name | Matching cards only |
| Company filter | Filters to that Company |
| Status filter `مسودة` | Draft only |
| Reset filters | Returns broader list |
| URL | `q`, `company`, `status`, `page` behave consistently |
| No-results | Message implies filters, not “account has zero Projects” when filters are active |

---

## 13. Create-page scenarios (`/projects/new`)

### C1 — Owner create full draft

Prefix: **`ZAM-SMOKE-PROJECTS`** (e.g. `ZAM-SMOKE-PROJECTS-01`).

| Field | Example guidance |
|---|---|
| Name | Arabic or mixed under smoke prefix |
| Company | **Company A** |
| Domain | e.g. اتصالات |
| Dates | Valid date-only range (end ≥ start) |
| Quota | Non-negative integer |
| Ages | Valid min/max |
| Resident | e.g. الجميع |
| Eligibility / WA AR / WA EN / notes | Non-empty samples |
| Three-month warning | Leave default or toggle once |

**Expected**

- No status field on form (draft only, explained if present as read-only copy)
- No finance fields
- Submit → redirect **`/projects`**
- New card shows **مسودة**
- No raw SQL errors

### C2 — Support Helper create

- SH can create a minimal draft (name + company + domain enough).
- Appears on list as draft.
- No lifecycle exposure after create.

### C3 — Client validation spot checks (Owner)

| Case | Expected |
|---|---|
| Empty name | Arabic validation; no crash |
| End before start | Date error |
| Negative quota | Rejected safely |
| Max age &lt; min age | Rejected safely |

---

## 14. Detail-page scenarios (`/projects/[projectId]`)

### D1 — Owner draft detail

Open created draft.

**Verify**

- Project name, Company A name
- Status **مسودة**, domain Arabic
- Date-only values (no day shift vs entered dates)
- Quota / age range / resident / warning / optional text
- Timestamps present
- **تعديل المشروع** visible
- Owner lifecycle: **تفعيل المشروع**, **إلغاء المشروع**
- No finance; no raw UUIDs

### D2 — Support Helper detail (draft/active)

- Operational fields visible
- Edit visible for draft/active
- **No** activate / close / cancel lifecycle UI

### D3 — Terminal detail

After close/cancel scenarios:

- No lifecycle actions
- No Edit
- Read-only notice (e.g. **هذا المشروع للعرض فقط** or closed/cancelled-specific edit-page message when opened via edit URL)

---

## 15. Edit-page scenarios (`/projects/[projectId]/edit`)

### E1 — Owner draft edit + Company change

1. Open edit for draft created under Company A.
2. Confirm prefill; no literal `null` / `undefined`.
3. Company selector **enabled**.
4. Change Company A → **Company B**.
5. Change at least one operational field (e.g. notes).
6. Save.

**Expected**

- Redirect to **detail**
- Company **B** shown
- Updated field shown

### E2 — Owner active edit + Company lock

After activation (§16):

1. Open edit.
2. Company shown **read-only**; selector disabled/absent.
3. Note: **لا يمكن تغيير الشركة بعد تفعيل المشروع**.
4. Change a non-company field; save succeeds.
5. Company remains B.

### E3 — Support Helper edit

- SH can edit draft and active operational fields.
- Active company remains locked.
- No status transition controls on form.

### E4 — Terminal edit URL

Open `/projects/[id]/edit` for closed/cancelled:

- No mutation form
- Message: closed → **هذا المشروع مغلق ومتاح للعرض فقط** / cancelled → **هذا المشروع ملغي ومتاح للعرض فقط**
- Link back to detail

---

## 16. Lifecycle-transition scenarios (Owner only)

### F1 — Activate

From draft detail: **تفعيل المشروع**

| Expected |
|---|
| Status **نشط** |
| Remaining actions: **إغلاق المشروع**, **إلغاء المشروع** |
| No back-to-draft / reopen |

### F2 — Close

From active detail: **إغلاق المشروع**

| Expected |
|---|
| Status **مغلق** |
| No lifecycle actions |
| No Edit |
| Read-only messaging |

### F3 — Cancel from draft

Create second minimal draft (`ZAM-SMOKE-PROJECTS-02`…), then **إلغاء المشروع**

| Expected |
|---|
| Status **ملغي** |
| No transitions / no edit |

### F4 — Support Helper lifecycle HOLD check

On draft/active detail as SH: **no** lifecycle buttons/forms.
If SH can activate/close/cancel → **HOLD** (role isolation failure).

---

## 17. Status / editability matrix (frozen)

| Status | Owner edit | SH edit | Company change | Owner transitions | SH transitions |
|---|---|---|---|---|---|
| **draft** | yes | yes | **yes** | active, cancelled | **none** |
| **active** | yes | yes | **no** | closed, cancelled | **none** |
| **closed** | no | no | no | none | none |
| **cancelled** | no | no | no | none | none |

---

## 18. Company-lock scenarios

| State | UI | Expected |
|---|---|---|
| Draft | Selector enabled | Can move A→B |
| Active | Locked + explanation | Cannot change company; save preserves company |
| Closed/cancelled | No edit form | N/A |

Normal smoke does **not** require DOM tampering or crafted HTTP. Optional tamper testing is out of scope.

---

## 19. Optimistic concurrency scenario (two tabs)

**Only on draft or active Project. Do not use terminal.**

1. Open same Project **edit** page in Tab A and Tab B (both fully loaded).
2. **Do not refresh Tab B** after Tab A saves.
3. Tab A: change field → save successfully.
4. Tab B: change a different field → submit stale form.

**Expected on Tab B**

- Update rejected
- Safe Arabic stale message (reload/review intent)
- No automatic retry
- No silent overwrite
- No browser-generated timestamp

**Expected on data**

- Tab A’s successful change remains

---

## 20. Arabic / RTL and responsive checks

Desktop + narrow mobile:

- `dir` RTL, labels/actions align
- No horizontal overflow on list/create/detail/edit
- Buttons wrap safely
- Long Arabic notes wrap
- Status Arabic text present
- English WhatsApp template readable
- Canonical enums not shown raw where Arabic expected
- No raw UUID
- Date-only values match entry (no timezone day shift)

---

## 21. Accessibility checks (manual)

- Logical tab order; visible focus
- Labels associated; no placeholder-only fields
- Touch targets usable
- Buttons have visible text
- Status not color-only
- Pending submit visible
- No keyboard trap
- Lifecycle actions clearly named + explained

---

## 22. Finance-blindness checks

On list, create, detail, edit, and lifecycle feedback, confirm **absence** of:

- price per accepted form
- participant pricing
- payments / settlements
- amount due / paid / remaining
- wages
- accepted/payable totals
- project financial settings
- financial summaries

Quota must **not** be labeled as price, budget, revenue, or payment.

---

## 23. Safe-error and not-found checks

| Case | How | Expected |
|---|---|---|
| Malformed UUID | e.g. `/projects/not-a-uuid` | Safe not-found / fail-closed; no secrets |
| Nonexistent UUID | Safe random UUID URL | Safe not-found; no cross-account disclosure |
| Invalid date order | Create/edit | Arabic field error |
| Negative quota | Create/edit | Arabic error |
| Invalid age range | Create/edit | Arabic error |
| Missing name | Create/edit | Arabic error |
| Stale version | §19 | Arabic stale message |
| Cross-account | Only if second account exists | Deferred if unavailable (WARN only) |

Errors must not show SQLSTATE, table/function/constraint names, stack traces, or PostgREST dumps.

---

## 24. Cleanup guidance

- **No automatic cleanup** by agent or script after plan preparation.
- Projects MVP has **no delete/restore** UI.
- Use `ZAM-SMOKE-PROJECTS*` names; terminalize disposable Projects when useful.
- Do not modify unrelated demo Projects.
- SQL deletion is **not** part of this smoke.
- Retain records for evidence review; cleanup is a later explicit decision after Mozfer reports results.
- **Do not** delete smoke data until Mozfer confirms the run outcome.

---

## 25. PASS criteria

All of the following:

1. Owner list / create / detail / edit work
2. Support Helper list / create / detail / edit work
3. Support Helper has **no** lifecycle mutation UI
4. Owner transitions match matrix exactly
5. Draft Company can change
6. Active Company cannot change
7. Closed/cancelled read-only
8. Stale update rejected safely
9. Arabic/RTL acceptable
10. No finance exposure
11. No raw database error leakage
12. No blocking responsive/a11y issue
13. Environment was DEV/DEMO `gdegnwglakyblnmxgiwx`

---

## 26. WARN criteria (nonblocking)

- Minor spacing/polish
- Nonblocking wording nit
- Browser-specific polish
- Cross-account deferred when no second controlled account

WARN cannot override any HOLD.

---

## 27. HOLD criteria

- List/create/detail/edit runtime failure
- SH can activate/close/cancel
- Finance exposure
- Active Company change possible in UI
- Terminal Project editable
- Lifecycle edges wider than matrix
- Stale update silently overwrites
- Raw SQL/PostgREST errors shown
- Date-only timezone shift
- Serious RTL/mobile overflow
- Cross-account data leaked
- Crash / unexpected missing route
- Wrong environment/project

---

## 28. Evidence report template (copy-ready)

```text
# Projects MVP manual smoke report

## 1. Environment confirmation
- Supabase project ref: gdegnwglakyblnmxgiwx (DEV/DEMO)
- App commit:
- Local/host URL:
- PostgreSQL (if known): 17.6
- Confirmed no production:

## 2. App commit
- Expected baseline for this plan: 9a001086ab0c50265d4dc19ee86e57bdb05b9923
- Actual:

## 3. Browser/device
- Browser:
- Desktop viewport:
- Mobile viewport:

## 4. Owner scenarios
| ID | Result | Notes |
|---|---|---|
| List L1 |  |  |
| Create C1 |  |  |
| Filters L2 |  |  |
| Detail D1 |  |  |
| Draft edit E1 |  |  |
| Activate F1 |  |  |
| Active lock E2 |  |  |
| Close F2 |  |  |
| Cancel F3 |  |  |
| Concurrency §19 |  |  |

## 5. Support Helper scenarios
| ID | Result | Notes |
|---|---|---|
| List |  |  |
| Create C2 |  |  |
| Detail D2 |  |  |
| Edit E3 |  |  |
| Terminal D3/E4 |  |  |
| No lifecycle F4 |  |  |

## 6. List results
-

## 7. Create results
-

## 8. Detail results
-

## 9. Edit results
-

## 10. Lifecycle results
-

## 11. Concurrency result
-

## 12. Company lock result
-

## 13. Finance-blindness result
-

## 14. Arabic/RTL/accessibility result
-

## 15. Errors/not-found result
-

## 16. Evidence inventory
- Screenshots (refs only):
- Notes locations:

## 17. Cleanup state
- Smoke Projects retained (list names):
- No SQL cleanup performed:

## 18. WARNs
-

## 19. HOLDs
-

## 20. Final verdict
- PASS | PASS WITH WARN | HOLD

## 21. Exact next task
- If PASS/PASS WITH WARN: ZAM-PROJECTS-MANUAL-SMOKE-CLOSE-1 (or product-assigned closeout)
- If HOLD: narrow fix task ID assigned by Mozfer
```

---

## 29. Exact next task

**`ZAM-PROJECTS-MANUAL-SMOKE-RUN-1`**

Mozfer executes this plan on DEV/DEMO and records results using §28.
Agent does **not** run the browser smoke as part of this plan document task.

---

## Explicit non-claims (this document)

- Manual browser smoke **not executed** by the agent.
- Runtime PASS **not** claimed.
- Production readiness **not** claimed.
- Cross-account smoke **not** claimed.
- Branded loading mark: design may exist; **implementation not required** for this smoke.
- Skeleton loaders are acceptable; branded mark is out of scope for Projects smoke.

---

## Agent / Mozfer split

| Actor | Responsibility |
|---|---|
| Agent | Authored this plan; docs sync only |
| Mozfer | All browser actions, data creation via UI, evidence, verdict |
| Automatic cleanup | **Forbidden** without Mozfer confirming smoke result |
