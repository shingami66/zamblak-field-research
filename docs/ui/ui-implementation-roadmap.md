# Spec Kit UI Implementation Roadmap

## 1. Scope and method

This roadmap tracks the approved Stitch V3-derived UI direction and decomposes future domain UI into bounded batches. Stitch remains a visual reference only: implementation is native, responsive, RTL-aware, and is not copied HTML/CSS. Spec Kit is a planning method here; no Spec Kit CLI or generated configuration is implied.

Source documents:

- `docs/ui/stitch-v3-handoff.md`
- `docs/ui/frontend-foundation-plan.md`
- `docs/product-requirements.md`
- `docs/roles-permissions.md`
- `docs/security-foundation.md`
- `docs/deferred-decisions.md` (Companies deferred register)

## 2. Current implemented UI foundation (`ZAM-AUTH-001D` — CLOSED)

Status: **complete in source; reviews and Mozfer-owned manual smoke passed; committed and pushed** (`74ceca7` application; docs through `ee44d66`). Auth milestone closed. Domain modules remain placeholders.

Implemented:

- Responsive, branded, RTL login UI connected to live email/password authentication.
- Responsive protected dashboard shell for `owner` and `support_helper`, driven by the server-resolved database profile rather than mock/browser role state.
- No fake dashboard metrics, financial cards, or domain records.
- Desktop and mobile navigation with role-filtered destinations.
- Accessible desktop/mobile account menu showing server-resolved profile context.
- Current-session local logout with a fixed `/login` redirect.
- Controlled authenticated placeholders for `/companies` and `/projects`.
- Controlled Owner-only `/financials` placeholder; Support Helper direct access redirects to `/` without financial wording or data.

Mozfer's manual smoke covered real Owner login, redirects, session persistence, responsive layouts, account menu, logout, and controlled routes. This roadmap does not claim agent-performed browser smoke.

## 3. Completed foundation batches

### B1A — Foundation

- Layout, RTL direction, typography, tokens, header shell, and branding: complete.

### B1B — Login shell

- Superseded by `ZAM-AUTH-001D` live login/session integration.

### B1C — Role-aware empty dashboard shell

- Empty responsive shell: complete.
- `mockRole` removed; server-resolved profile authority.
- Support Helper navigation is source-filtered and **finance-blind**.

### `ZAM-AUTH-001D` — Login, session, shell, account menu, logout, and safe navigation

- Implementation and reviews: passed.
- Mozfer-owned manual smoke: passed.
- Closed and pushed.
- Domain boundary: shell and controlled route safety only; no Companies/Projects/Financials domain modules.

## 4. Current route and role matrix (implemented)

| Route / capability | `owner` | `support_helper` | Current state |
| :--- | :---: | :---: | :--- |
| `/login` | Yes | Yes | Live responsive login; authenticated users redirect to `/`. |
| `/` | Yes | Yes | Protected responsive empty dashboard shell. |
| `/companies` | Yes | Yes | **Controlled placeholder** only. |
| `/projects` | Yes | Yes | Controlled placeholder only. |
| `/financials` | Yes | No | Owner-only controlled placeholder; Support Helper redirects to `/`. |
| Account menu | Yes | Yes | Accessible desktop/mobile menu. |
| Local logout | Yes | Yes | Ends current browser session and redirects to `/login`. |

Support Helper must never see financial amounts, prices, payments, due amounts, summaries, cards, wording, or hidden/locked/blurred financial placeholders.

## 5. Next product sequence

**Active phase: Companies** after closed Auth.

Required gates before Companies UI implementation:

1. Mozfer contract + deferred-register approval (done)
2. Documentation sync of contract and deferred register (done)
3. Independent docs review → docs commit → commit review (done for contract/catalog packet series)
4. Graphify refresh + freshness review (done as part of authorized closeouts)
5. Live DEV/DEMO catalog verification (`DWR-COMP-026`) — **done (PASS)**; see `docs/companies-live-catalog-verification.md`
6. Schema/RPC design (`docs/companies-schema-rpc-design.md`) — **recorded** (docs only)
7. Migration draft/review/apply + app implementation only after gates pass

Required domain sequence:

1. Company
2. Project
3. Respondent
4. Participation
5. Review
6. Financials

## 6. Planned domain batches

### Companies — approved MVP UI contract (not implemented)

**Status:** Mozfer-approved product/UX contract. Application remains a placeholder. **No Companies CRUD UI has been built.**

#### Approved routes (dedicated pages, not dense modals)

| Route | Purpose |
| :--- | :--- |
| `/companies` | List + name search + offset pagination |
| `/companies/new` | Create company |
| `/companies/[id]` | Company detail |
| `/companies/[id]/edit` | Edit company |

#### List page (MVP)

- Arabic title: `الشركات`
- Add Company CTA for both roles (if Support Helper creation remains approved)
- Name-only search (max 120 characters)
- Offset pagination: `page` ≥ 1; `page_size` default 25, max 50
- Order: normalized company name ASC, then id ASC
- Fields: company name, contact person, **active project count only**
- Details action
- Empty / loading / error states
- **No** status filter, domain filter, fake data, or last-project metric

#### Detail page (MVP)

- Name, contact person, phone **LTR**, operational notes
- Active projects section (`status = active`)
- Completed projects section (`status = closed`; Arabic label `مكتمل`)
- Edit action by role
- **No** delete/restore, finance, company domain field, lifecycle badges, participant count, or accepted-form count
- Not-found / loading / error states

#### Create / edit (MVP)

- Shared accessible form: `name`, `contact_person`, `phone`, `notes` only
- Client assistance + server-authoritative validation (Server Action → authenticated RPC)
- Dirty-form warning; error summary and focus; cancel to list/detail; success to detail
- Stable errors include `duplicate_company_name` and `invalid_company_phone`
- Do not invent a Stitch create/edit mock; none is approved as design authority

#### Stitch Companies reconciliation

Visual references only (do not copy HTML/CSS):

- List: `D:\Zamblak\handoff\stitch-v3-final\stitch_zamblak_design_system\_11`
- Detail: `D:\Zamblak\handoff\stitch-v3-final\stitch_zamblak_design_system\_13`

| Stitch element | Treatment |
| :--- | :--- |
| Arabic title `الشركات` | **Adopt** |
| Name search | **Adopt** |
| Readable cards / responsive RTL | **Adopt** |
| Active project count | **Adopt** (exact metric: non-deleted projects with `status = active`) |
| Details action | **Adopt** |
| Contact person | **Adapt** |
| Card density / project summary presentation | **Adapt** |
| Fake sample companies | **Remove** |
| Company domain field | **Remove** from MVP |
| Domain filter | **Remove** from MVP |
| Active / stopped / archived company badges | **Remove** from MVP (no company status enum) |
| Last project metric | **Defer** (`DWR-COMP-009`) |
| Participant / accepted-form counts | **Defer** (`DWR-COMP-010`, `DWR-COMP-011`) |
| Advanced aggregate cards | **Defer** (`DWR-COMP-012`) |
| Add Company CTA | **Add** (missing in Stitch) |
| Pagination | **Add** (offset/page) |
| Empty / loading / error states | **Add** |
| Detail: name, contact, phone LTR, notes | **Adopt** |
| Detail: active / completed projects | **Adopt** (`active` / `closed`) |
| Detail: company domain / lifecycle badge | **Remove** from MVP |
| Create/edit screens in Stitch | **Absent** — use dedicated pages per approved contract, not an unapproved modal design |

#### Arabic-first, RTL, senior-friendly (all Companies UI)

- Arabic-first copy; correct RTL; phone/numbers LTR where required.
- Large readable text; touch targets ≥ 48px.
- No icon-only critical actions.
- Explicit validation and error language.
- Desktop/mobile parity for critical actions.
- No fake company records.

#### Roles (planned UI behavior)

- Owner and Support Helper both use Companies routes under the approved contract.
- Support Helper remains **finance-blind** on all Companies screens.
- Support Helper reads via bounded support-safe RPCs (not base-table SELECT); create/edit via Server Action → authenticated RPC.
- No soft-delete/restore UI in MVP.

Deferred Companies UI items: see `docs/deferred-decisions.md` (`DWR-COMP-001`–`DWR-COMP-028`).

### Projects

- Projects list and owner/support-safe project detail after Companies MVP.
- Support Helper receives operational content only; pricing and financial hints remain absent.

### Respondent

- Mobile-number search with an LTR `9665xxxxxxxx` input inside the RTL layout.
- Found/not-found/warning states and respondent identity form.

### Participation

- Link a respondent to an active project; honor project-state enforcement and Support Helper data surface.

### Review

- Owner review/acceptance and Support Helper operational views clearly separated.
- Support Helper receives no financial or review-only sensitive fields.

### Financials — domain incomplete

- Replace the Owner-only route placeholder only after an approved financial implementation task.
- Zero Support Helper financial exposure remains mandatory.

## 7. Shared implementation and validation rules

Every future UI batch must:

- Have a narrow allowed-file list and explicit non-goals.
- Preserve RTL flow, accessible focus/keyboard behavior, senior-friendly touch targets, and mobile/desktop responsiveness.
- Keep telephone-number input/display LTR where required.
- Resolve role/account authority on the server; never accept browser role, profile, account, Auth UUID, or redirect authority.
- Keep service-role credentials outside browser and normal user-session paths.
- Avoid fake domain data and fake financial/operational metrics.
- Run the validation commands authorized by its task.
- Leave browser smoke to Mozfer unless the task explicitly authorizes an agent-owned runtime check.

## 8. Deferred UI work

- Real Companies implementation after gates (contract approved; implementation not started).
- Deferred Companies metrics/filters/lifecycle: `docs/deferred-decisions.md`.
- Real Projects, Respondent, Participation, Review, and Financials experiences.
- Password recovery and password-change UI.
- Invitation and Support Helper administration.
- Account/profile settings and controlled Auth-user/profile relinking administration.
- Broader multi-device session-management UI.
- WhatsApp workflow, import/export, reports, and later UI polish.

## 9. Recommended immediate next task

`ZAM-COMPANIES-001-CONTRACT-DEFERRED-DOCS-REVIEW-1` (independent review of this documentation sync). Do not implement Companies CRUD until all implementation gates pass.
