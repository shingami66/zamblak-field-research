# Spec Kit UI Implementation Roadmap

## 1. Title and Scope
**Title:** Spec Kit UI Implementation Roadmap
**Scope:** This is a Spec Kit-style roadmap for UI implementation. It decomposes all approved Stitch V3 screens into small, safe implementation batches. **This is a planning document only and does not authorize broad implementation.**

## 2. Source Documents Used
- `docs/leanctx.md`
- `docs/ui/stitch-v3-handoff.md`
- `docs/ui/frontend-foundation-plan.md`
- `docs/product-requirements.md`
- `docs/roles-permissions.md`
- `docs/security-foundation.md`

## 3. Method and Tool Policy
- **LeanCTX:** Used to maintain minimal context and enforce precise planning boundaries.
- **Spec Kit:** Spec Kit methodology only. No Spec Kit CLI commands were executed, and no `.specify` project configuration or CLI-based code generation was initialized.
- **Graphify/Context7:** Not used, as external library docs and deep graph navigation were not necessary for this roadmap.
- **Stitch:** Used strictly as a visual reference only. No HTML/CSS copying or direct code extraction is permitted. There is no pixel-perfect implementation expected; layout and styles must be built natively to correct design issues.

## 4. UI Product Scenarios
1. **owner logs in and sees owner dashboard:** The owner accesses the main dashboard, viewing operational metrics, quick actions, and the full financial summary.
2. **support_helper logs in and sees operational dashboard only:** The support helper accesses the dashboard and sees operational cards (active projects, daily participants) but no financial data or placeholders.
3. **user searches by mobile number:** Either role enters a 9665xxxxxxxx number in the very large search input to find an existing respondent.
4. **user adds respondent identity:** Either role fills out a form to add a new respondent if search yields no results.
5. **user links respondent to project:** Either role assigns a found or newly created respondent to a specific active project.
6. **owner reviews project financial/accepted status:** The owner opens a project detail page, seeing both operational data and financial/accepted status metrics.
7. **support_helper handles operational project details:** The support helper views the same project detail page but sees only operational tasks (adding participants, updating statuses) without any pricing or financial summaries.
8. **user browses projects:** Either role browses the list/grid of all active projects.
9. **user browses companies and company detail:** Either role browses the client companies list and views details and associated projects for a specific company.

## 5. Screen Inventory and Implementation Priority
- **Login (`_1`)**: Visual login entry screen only. Role: owner & support_helper. Priority: High. Dependencies: None. Must-not-implement: Real authentication, session state handling, Supabase auth integration, or API request validation (all of which remain deferred).
- **Owner Home Dashboard (`_2`)**: Main dashboard. Role: owner. Priority: High. Dependencies: Login. Must-not-implement: Real Supabase data fetching, live charts.
- **Support Helper Home Dashboard (`_3`)**: Main dashboard. Role: support_helper. Priority: High. Dependencies: Login. Must-not-implement: Financial summaries, blurred financial placeholders.
- **Respondent Mobile Search (`_4`)**: Find respondents. Role: owner & support_helper. Priority: High. Dependencies: Dashboards. Must-not-implement: LTR layout disruption.
- **Add Respondent Identity (`_5`)**: Register respondent. Role: owner & support_helper. Priority: Medium. Dependencies: Search. Must-not-implement: Real DB writes.
- **Add Respondent to Project (`_6`)**: Link respondent. Role: owner & support_helper. Priority: Medium. Dependencies: Add Identity. Must-not-implement: Complex survey logic, Real DB writes.
- **Project Detail Owner (`_7`)**: Financial project view. Role: owner. Priority: Medium. Dependencies: Projects List. Must-not-implement: Live Supabase pricing calculation.
- **Project Detail Support Helper (`_8`)**: Operational project view. Role: support_helper. Priority: Medium. Dependencies: Projects List. Must-not-implement: Financial placeholders or hints.
- **Projects List (`_10`)**: Browse projects. Role: owner & support_helper. Priority: Medium. Dependencies: Foundation. Must-not-implement: Real DB pagination.
- **Companies List (`_11`)**: Browse companies. Role: owner & support_helper. Priority: Low. Dependencies: Foundation. Must-not-implement: Real DB fetch.
- **Company Detail (`_13`)**: Company info. Role: owner & support_helper. Priority: Low. Dependencies: Companies List. Must-not-implement: Real DB fetch.

## 6. Batch Roadmap

### Shared Validation Gate (Mandatory for All Batches)
Every batch must successfully pass the following validation commands before completion:
- `npm run build`
- `npm run lint`
- `npx tsc --noEmit`
- `git diff --check`

---

### B1A Foundation (Completed)
- **Scope:** Layout, RTL, typography, tokens, header shell.

### B1B Login visual shell only
- **Task ID:** ZAMBLAK-UI-LOGIN-SHELL-1
- **Scope:** Login screen UI (`_1`).
- **Allowed files:** `src/app/login/page.tsx`, `src/components/auth/LoginForm.tsx`.
- **Non-goals:** Supabase auth, session handling, actual API validation.
- **Acceptance criteria:** Login screen follows the approved visual direction without pixel-perfect copying, applying correct RTL layout and tokens.
- **Validation commands:** Refer to the Shared Validation Gate.
- **HOLD conditions:** Includes Supabase client, creates DB connections.

### B1C Role-aware empty dashboards shell
- **Task ID:** ZAMBLAK-UI-DASHBOARDS-SHELL-1
- **Scope:** Dashboard scaffolding (`_2`, `_3`).
- **Allowed files:** `src/app/page.tsx`, `src/components/dashboard/DashboardShell.tsx`.
- **Non-goals:** Implementing cards, live data.
- **Acceptance criteria:** App shell handles switching between owner and support helper views based on a mock state.
- **Validation commands:** Refer to the Shared Validation Gate.
- **HOLD conditions:** Edits header or globals unnecessarily.

### B2A Owner dashboard static cards
- **Task ID:** ZAMBLAK-UI-OWNER-DASHBOARD-1
- **Scope:** Financial and operational summary cards for owner (`_2`). Owner financial cards must be static UI placeholders only in this batch.
- **Allowed files:** `src/components/dashboard/OwnerCards.tsx`, `src/components/dashboard/SummaryCard.tsx`.
- **Non-goals:** Live database amounts, Supabase data fetching, live financial calculations, or `/financials` route implementation.
- **Acceptance criteria:** Owner dashboard displays static placeholder financial metrics correctly in RTL.
- **Validation commands:** Refer to the Shared Validation Gate.
- **HOLD conditions:** Implements live Supabase fetch, references database views, performs dynamic calculations, or implements the `/financials` route.

### B2B Support helper dashboard static operational cards
- **Task ID:** ZAMBLAK-UI-SUPPORT-DASHBOARD-1
- **Scope:** Operational cards for support helper (`_3`).
- **Allowed files:** `src/components/dashboard/SupportCards.tsx`.
- **Non-goals:** Financial cards, placeholders.
- **Acceptance criteria:** Support helper sees only operational data with zero financial placeholders.
- **Validation commands:** Refer to the Shared Validation Gate.
- **HOLD conditions:** Contains any disabled or blurred financial UI elements.

### B3A Respondent mobile search UI shell
- **Task ID:** ZAMBLAK-UI-SEARCH-SHELL-1
- **Scope:** Large mobile search input (`_4`).
- **Allowed files:** `src/components/search/SearchInput.tsx`, `src/app/search/page.tsx`.
- **Non-goals:** Search results, live backend search.
- **Acceptance criteria:** Search input is LTR (9665xxxxxxxx) inside the RTL container.
- **Validation commands:** Refer to the Shared Validation Gate.
- **HOLD conditions:** Modifies LTR numbering format.

### B3B Search result states UI
- **Task ID:** ZAMBLAK-UI-SEARCH-RESULTS-1
- **Scope:** Result cards (found, not found, 3-month warning) (`_4`).
- **Allowed files:** `src/components/search/SearchResult.tsx`.
- **Non-goals:** Actual DB querying.
- **Acceptance criteria:** Warning cards are calm and non-blocking; found/not found states render correctly.
- **Validation commands:** Refer to the Shared Validation Gate.
- **HOLD conditions:** Warning state acts as a hard block.

### B4A Add respondent identity UI
- **Task ID:** ZAMBLAK-UI-ADD-RESPONDENT-1
- **Scope:** Registration form for new respondent (`_5`).
- **Allowed files:** `src/app/respondents/new/page.tsx`, `src/components/forms/RespondentForm.tsx`.
- **Non-goals:** Form submission to Supabase.
- **Acceptance criteria:** Form fields match requirements; senior-friendly touch targets.
- **Validation commands:** Refer to the Shared Validation Gate.
- **HOLD conditions:** Adds server actions or DB writes.

### B4B Add respondent to project UI
- **Task ID:** ZAMBLAK-UI-LINK-PROJECT-1
- **Scope:** Link respondent to project UI (`_6`).
- **Allowed files:** `src/app/projects/[id]/add-respondent/page.tsx`, `src/components/forms/LinkProjectForm.tsx`.
- **Non-goals:** Actual DB linking.
- **Acceptance criteria:** Project selection interface is clear and accessible.
- **Validation commands:** Refer to the Shared Validation Gate.
- **HOLD conditions:** Edits core schema.

### B5A Projects list UI
- **Task ID:** ZAMBLAK-UI-PROJECTS-LIST-1
- **Scope:** List/grid of projects (`_10`).
- **Allowed files:** `src/app/projects/page.tsx`, `src/components/projects/ProjectList.tsx`.
- **Non-goals:** Live pagination.
- **Acceptance criteria:** Displays static project cards in a clean layout.
- **Validation commands:** Refer to the Shared Validation Gate.
- **HOLD conditions:** Adds analytics or reporting UI.

### B5B Project detail owner/support split UI
- **Task ID:** ZAMBLAK-UI-PROJECT-DETAIL-1
- **Scope:** Project detail page with role-based components (`_7`, `_8`).
- **Allowed files:** `src/app/projects/[id]/page.tsx`, `src/components/projects/ProjectOwnerView.tsx`, `src/components/projects/ProjectSupportView.tsx`.
- **Non-goals:** Live financial calculations.
- **Acceptance criteria:** Owner sees financials; Support Helper sees operational tasks only.
- **Validation commands:** Refer to the Shared Validation Gate.
- **HOLD conditions:** Support Helper view includes hidden financial elements.

### B6A Companies list UI
- **Task ID:** ZAMBLAK-UI-COMPANIES-LIST-1
- **Scope:** List of client companies (`_11`).
- **Allowed files:** `src/app/companies/page.tsx`, `src/components/companies/CompanyList.tsx`.
- **Non-goals:** Live DB fetching.
- **Acceptance criteria:** Standard list view conforming to tokens.
- **Validation commands:** Refer to the Shared Validation Gate.
- **HOLD conditions:** Adds billing or invoice management UI.

### B6B Company detail UI
- **Task ID:** ZAMBLAK-UI-COMPANY-DETAIL-1
- **Scope:** Company detail view (`_13`).
- **Allowed files:** `src/app/companies/[id]/page.tsx`, `src/components/companies/CompanyInfo.tsx`.
- **Non-goals:** Live DB fetching.
- **Acceptance criteria:** Displays company info and associated projects list statically.
- **Validation commands:** Refer to the Shared Validation Gate.
- **HOLD conditions:** Adds complex CRM analytics.

### B7A UI smoke testing and role visibility review
- **Task ID:** ZAMBLAK-UI-SMOKE-TEST-1
- **Scope:** Strict review-only E2E validation of all implemented routes and components.
- **Allowed files:** None (Review only. No files may be changed in this batch. If issues are found, separate correction/fix tasks must be created).
- **Non-goals:** Any code changes or implementation.
- **Acceptance criteria:**
  - Verify `support_helper` has zero visibility of financial data, cards, or placeholders.
  - Verify RTL layout direction flows correctly.
  - Verify phone numbers remain LTR and correctly formatted (`9665xxxxxxxx`).
  - Verify no forbidden features (maps, sync, reports, calendar, AI) are introduced.
  - Verify no HTML/CSS from Stitch was directly copied.
- **Validation commands:** Refer to the Shared Validation Gate, plus manual UI inspection.
- **HOLD conditions:** Any files are modified or staged during this review.

## 7. Role Visibility Matrix
- **Support Helper Restriction:** The `support_helper` role must have zero exposure to financial data. This means they must not see financial amounts, prices, payments, due amounts, financial summaries, financial cards, or any hidden, locked, blurred, or disabled placeholders representing financial data, nor the `المستحقات` navigation path.

| Feature / Screen | `owner` | `support_helper` | Notes |
| :--- | :--- | :--- | :--- |
| **Login** | Visible | Visible | Visual shell only. |
| **Dashboards** | Full (Operational + Financial) | Operational Only | `support_helper` MUST NEVER see financial placeholders. |
| **Top Navigation** | الرئيسية, Companies, Projects, المستحقات | الرئيسية, Companies, Projects | No `المستحقات` for `support_helper`. |
| **Search & Add Respondent** | Visible | Visible | |
| **Project Details** | Financial metrics + Prices | Operational metrics only | |
| **Companies List & Detail**| Visible | Visible | |

## 8. Component Roadmap
- **page shell:** Shared main container.
- **header/nav:** Branding and top nav (already started).
- **role-aware nav:** Dynamic top nav based on role.
- **search card:** Very large input block for mobile numbers.
- **action cards:** Large touch target buttons for quick actions.
- **summary cards:** Dashboard stat blocks.
- **result state cards:** Success, warning (3 months), not found states.
- **form sections:** Standardized inputs with clear focus states.
- **list/table cards:** For projects and companies.
- **warning banners:** Non-blocking alerts.
- **empty states:** Senior-friendly empty feedback.

## 9. Route Roadmap
- `/` (Home Dashboard): Visual/static route, renders owner/support views.
- `/login`: Visual/static route.
- `/search`: Visual/static route.
- `/respondents/new`: Visual/static route.
- `/projects`: Visual/static route.
- `/projects/[id]`: Visual/static route (owner/support split).
- `/projects/[id]/add-respondent`: Visual/static route.
- `/companies`: Visual/static route.
- `/companies/[id]`: Visual/static route.
- `/financials` (المستحقات): **owner-only route.** Reserved for future live-data integration, not part of early static batches.

## 10. Validation Strategy
- **build:** Run `npm run build` to ensure Next.js builds successfully.
- **lint:** Run `npm run lint` for ESLint compliance.
- **tsc:** Run `npx tsc --noEmit` to verify TypeScript types.
- **role visibility smoke:** Manually inspect `support_helper` views to ensure 0 financial elements exist.
- **RTL smoke:** Ensure layout flows right-to-left.
- **phone LTR smoke:** Verify `9665xxxxxxxx` displays correctly LTR.
- **forbidden terms/scope grep:** Search codebase for "invoice", "vat", "analytics" to prevent scope creep.
- **no Stitch HTML/CSS copying check:** Verify CSS uses Tailwind strictly and HTML is cleanly written.

## 11. Implementation Rules for Every Future Batch
- Must cite handoff sections followed in the task description.
- Must cite Stitch issues intentionally corrected.
- Must strictly prevent broad, multi-screen implementation in a single batch.
- Must restrict edits to the specifically allowed file list for the batch.
- Must NOT connect to DB, Supabase, or read `.env` unless explicitly approved.
- Must NOT install new NPM packages unless explicitly approved.
- Must NOT expose any financial variables or placeholder UI elements in code paths reachable by the `support_helper` role.

## 12. Risks and Sequencing Notes
- **Auth role source not live yet:** Roles must be mocked via static state or URL params during UI implementation batches.
- **Dashboard data static until live integration phase:** Do not build real fetching logic yet.
- **Financial route reserved:** The `/financials` route requires high-security RLS and must be deferred.
- **Future Supabase/RLS integration must be separate high-reasoning task:** UI and Backend integration will happen after UI shell is complete.
- **UI screens must remain independent from DB until approved:** Prevents locking UI into premature database schema assumptions.

## 13. Recommended Immediate Next Task
**ZAMBLAK-UI-LOGIN-SHELL-1**
**Scope:** Login visual shell only, no auth, no Supabase, no forms submission, no session handling.
