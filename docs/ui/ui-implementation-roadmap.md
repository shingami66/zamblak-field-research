# Spec Kit UI Implementation Roadmap

## 1. Scope and method

This roadmap tracks the approved Stitch V3-derived UI direction and decomposes future domain UI into bounded batches. Stitch remains a visual reference only: implementation is native, responsive, RTL-aware, and is not copied HTML/CSS. Spec Kit is a planning method here; no Spec Kit CLI or generated configuration is implied.

Source documents:

- `docs/ui/stitch-v3-handoff.md`
- `docs/ui/frontend-foundation-plan.md`
- `docs/product-requirements.md`
- `docs/roles-permissions.md`
- `docs/security-foundation.md`

## 2. Current implemented UI foundation (`ZAM-AUTH-001D`)

Status: **complete in source; source/static reviews passed; Mozfer-owned manual smoke passed; application committed locally as `74ceca7 feat(auth): add protected sessions and role-aware shell`; documentation committed locally as `9a140d8 docs(auth): record protected session milestone`; local `main` ahead of `origin/main` by two commits; no push has occurred. The post-commit documentation-state correction remains uncommitted.**

Implemented:

- Responsive, branded, RTL login UI connected to live email/password authentication.
- Responsive protected dashboard shell for `owner` and `support_helper`, driven by the server-resolved database profile rather than mock/browser role state.
- No fake dashboard metrics, financial cards, or domain records.
- Desktop and mobile navigation with role-filtered destinations.
- Accessible desktop/mobile account menu showing server-resolved profile context.
- Current-session local logout with a fixed `/login` redirect.
- Controlled authenticated placeholders for `/companies` and `/projects`.
- Controlled Owner-only `/financials` placeholder; Support Helper direct access redirects to `/` without financial wording or data.

Mozfer's manual smoke covered real Owner login, login/root redirects, session persistence after refresh, responsive login/dashboard layouts, account-menu behavior on desktop/mobile, logout, and all controlled routes. This roadmap records that owner-supplied runtime evidence; it does not claim an agent-performed browser smoke.

The controlled placeholders exist only to make navigation safe. They are temporary empty states, contain no fake data, and do **not** complete the Companies, Projects, or Financials domain modules.

## 3. Completed foundation batches

### B1A — Foundation

- Layout, RTL direction, typography, tokens, header shell, and branding: complete.

### B1B — Login shell

- The original visual-only shell batch is complete and has been superseded by `ZAM-AUTH-001D` live login/session integration.
- Current behavior is authenticated and server-backed; the historical visual-only non-goal no longer describes runtime state.

### B1C — Role-aware empty dashboard shell

- Empty responsive shell: complete.
- The historical static `mockRole` acceptance mechanism has been removed and superseded by server-resolved authenticated profile authority.
- Support Helper navigation is source-filtered and finance-blind.

### `ZAM-AUTH-001D` — Login, session, shell, account menu, logout, and safe navigation

- Implementation and focused source/static reviews: passed.
- Mozfer-owned responsive/manual smoke: passed.
- Commit state: application committed locally as `74ceca7`; documentation committed locally as `9a140d8`; local `main` ahead of `origin/main` by two commits; no push has occurred. The post-commit documentation-state correction remains uncommitted.
- Domain boundary: shell and controlled route safety only; no Companies, Projects, or Financials records or fake metrics.

## 4. Current route and role matrix

| Route / capability | `owner` | `support_helper` | Current state |
| :--- | :---: | :---: | :--- |
| `/login` | Yes | Yes | Live responsive login; authenticated users redirect to `/`. |
| `/` | Yes | Yes | Protected responsive empty dashboard shell. |
| `/companies` | Yes | Yes | Controlled placeholder; real Companies UI/data pending. |
| `/projects` | Yes | Yes | Controlled placeholder; real Projects UI/data pending. |
| `/financials` | Yes | No | Owner-only controlled placeholder; Support Helper redirects to `/`. |
| Account menu | Yes | Yes | Accessible desktop/mobile menu. |
| Local logout | Yes | Yes | Ends current browser session and redirects to `/login`. |

Support Helper must never see financial amounts, prices, payments, due amounts, summaries, cards, wording, or hidden/locked/blurred financial placeholders.

## 5. Next product sequence

Post-commit documentation-state correction, independent review, exact correction commit if approved, and push-only after explicit approval come first. The next UI/product milestone is the **real Companies module**, replacing the `/companies` placeholder.

Required domain sequence:

1. Company
2. Project
3. Respondent
4. Participation
5. Review
6. Financials

Each domain replaces its controlled placeholder or adds its approved routes only in a separately bounded implementation task.

## 6. Planned domain batches

### Companies — next

- Companies list and company detail for both roles.
- Real database reads/writes, RLS behavior, loading/error/empty states, and permissions require separately approved implementation.
- Do not populate the current placeholder with sample companies or fake counts.

### Projects

- Projects list and owner/support-safe project detail.
- Support Helper receives operational content only; pricing, financial status, and financial hints remain absent.
- Real pagination, calculations, and database integration require separately approved work.

### Respondent

- Mobile-number search with an LTR `9665xxxxxxxx` input inside the RTL layout.
- Found/not-found/warning states and respondent identity form.
- Search and writes must be implemented later against approved server/RLS boundaries, not browser authority.

### Participation

- Link a respondent to an active project and provide operational workflow states.
- Must honor the existing participation project-state enforcement and approved Support Helper data surface.

### Review

- Owner review/acceptance behavior and Support Helper operational views remain clearly separated.
- Support Helper receives no hidden financial or review-only sensitive fields.

### Financials — domain incomplete

- Replace the Owner-only route placeholder only after an approved financial implementation task.
- Server-side Owner authorization, Owner-scoped RLS/views, and zero Support Helper financial exposure remain mandatory.
- No fake amounts, static financial cards, or sample payment records should be added as a substitute for the real module.

## 7. Shared implementation and validation rules

Every future UI batch must:

- Have a narrow allowed-file list and explicit non-goals.
- Preserve RTL flow, accessible focus/keyboard behavior, senior-friendly touch targets, and mobile/desktop responsiveness.
- Keep telephone-number input/display LTR where required.
- Resolve role/account authority on the server; never accept browser role, profile, account, Auth UUID, or redirect authority.
- Keep service-role credentials outside browser and normal user-session paths.
- Avoid fake domain data and fake financial/operational metrics.
- Run the validation commands authorized by its task, normally lint, TypeScript, build where appropriate, and `git diff --check`.
- Leave browser smoke to Mozfer unless the task explicitly authorizes an agent-owned runtime check.

## 8. Deferred UI work

- Real Companies, Projects, Respondent, Participation, Review, and Financials data experiences.
- Password recovery and password-change UI.
- Invitation and Support Helper administration.
- Account/profile settings and controlled Auth-user/profile relinking administration.
- Broader multi-device session-management UI.
- WhatsApp workflow, import/export, reports, and later UI polish.

## 9. Recommended immediate next task

`ZAM-AUTH-001D-DOCS-POSTCOMMIT-STATE-REVIEW-1`, followed by exact correction commit if approved, and push-only after explicit approval. After Auth closure, begin the real Companies domain slice.
