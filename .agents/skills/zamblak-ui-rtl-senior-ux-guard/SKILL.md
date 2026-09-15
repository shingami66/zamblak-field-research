---
name: zamblak-ui-rtl-senior-ux-guard
description: Authoritative specialist guard for Arabic-first RTL application UX, responsive fieldwork interfaces, accessibility, interaction states, and screen-contract fidelity under AGENTS.md.
---

# Zamblak UI RTL & Senior UX Guard

## Purpose & Authority
This skill governs user experience, Arabic-first RTL design, responsive fieldwork interfaces, accessibility, interaction states, and screen-contract fidelity for Zamblak. It ensures that user-facing surfaces deliver an intuitive, low-cognitive-load, and operationally resilient experience for field researchers and operations managers.

### Canonical Authority Hierarchy
- **Subordinate to Canonical Authority:** This skill derives UI requirements and screen constraints from canonical repository authority:
  - Approved screen contracts (e.g., [`docs/contracts/research-form-submission-screen-contract.md`](file:///D:/Zamblak/Zamblak-field-research/docs/contracts/research-form-submission-screen-contract.md))
  - Canonical product requirements ([`docs/product-requirements.md`](file:///D:/Zamblak/Zamblak-field-research/docs/product-requirements.md))
  - Roles and permissions ([`docs/roles-permissions.md`](file:///D:/Zamblak/Zamblak-field-research/docs/roles-permissions.md))
  - Database schema and evidence ([`docs/database-schema.md`](file:///D:/Zamblak/Zamblak-field-research/docs/database-schema.md))
- **UX Reasoning Only:** This skill governs user interface and interaction reasoning. It must **never** invent product behavior, create unapproved workflows, or alter business rules merely to improve visual aesthetics.
- **Inspiration Only:** Google Stitch, mockups, screenshots, or external design samples provide visual inspiration only. They are **never** product, domain, or business authority.
- **Zero Technical Mutation Authority:** This skill provides UX reasoning only. It never authorizes Git operations, database DDL/migrations, SQL execution, secret access, or deployment actions.

---

## 1. Arabic-First RTL Foundation

- **Native RTL Direction:** All primary layouts and components must be built natively for right-to-left (`dir="rtl"`) reading and interaction flow.
- **CSS Logical Properties Over Physical Sides:**
  - Prefer CSS logical properties and direction-safe layout primitives over hardcoded physical left/right rules.
  - Use `margin-inline-start` / `margin-inline-end`, `padding-inline-start` / `padding-inline-end`, `inset-inline-start` / `inset-inline-end`, and logical text alignment (`text-align: start` / `end`).
  - In Tailwind CSS, consistently use logical directional utilities: `ms-*`, `me-*`, `ps-*`, `pe-*`, `start-*`, `end-*`, `text-start`, `text-end`.
- **Directional vs Decorative Icons:**
  - **Directional Icons:** Icons indicating flow, progression, back/forward navigation, chevrons, and arrows must be mirrored appropriately in RTL layouts (e.g., forward arrows point left in RTL).
  - **Non-Directional Icons:** Decorative or static real-world concepts must **not** be flipped blindly (e.g., search magnifying glasses, checkmarks, calendars, close crosses, clocks, info badges).
- **Visual Order in RTL:** Evaluate layouts visually in RTL mode. Changing `dir="rtl"` alone is insufficient if the resulting visual hierarchy, reading order, or element grouping becomes awkward or inverted.
- **No Gratuitous Churn:** Do not mandate rewrites of working, direction-safe CSS or layout components unless an actual RTL defect or visual disruption is present.

---

## 2. Bidirectional (Bidi) Content Handling

Zamblak interfaces frequently interweave Arabic text with LTR identifiers, codes, numbers, and Latin phrases.

- **Supported Bidi Mixed Content:**
  - Phone numbers (Saudi format `+966 5x xxx xxxx` or normalized `9665xxxxxxxx`);
  - Email addresses;
  - Structured identifiers and codes (`RF-YYYYMMDD-NNN`, `P012-S01-F004`, raw internal UUIDs);
  - Calendar dates (`YYYY-MM-DD`);
  - Currency codes and amounts (`SAR`, numeric pricing);
  - Latin project, client, or company names.
- **Intentional Bidi Isolation:**
  - Use `<bdi>` (bidirectional isolate) or `dir="ltr"` on numeric, phone, email, and reference tokens embedded inside Arabic sentences or tables to prevent punctuation flipping, trailing dashes jumping to the wrong side, or corrupted reference strings.
  - Use `dir="auto"` where content language is dynamic and user-supplied.
- **Presentation Separation:** Never mutate, reorder, or alter underlying stored database strings solely for visual presentation formatting.

---

## 3. Form UX & Data Entry Excellence

Field research forms require unambiguous data capture under operational pressure:

- **Explicit Label Association:** Every interactive form control must have a visible Arabic label clearly associated via semantic markup (`<label htmlFor="...">` matching `<input id="...">`).
- **Required vs Optional Indicators:** Clearly distinguish required fields from optional fields (e.g., explicit `(اختياري)` tag). Never rely on subtle asterisks alone without explanation.
- **Adjacent Validation Feedback:** Inline validation errors must appear directly adjacent to the affected field. Do not obscure or compete with persistent helper text.
- **Preserve User Input:** Entered user values must survive recoverable validation failures. A form must never clear or wipe entered data when an action fails validation.
- **Clear Loading & Submit States:**
  - Submit buttons must display an active loading state (e.g., spinner, disabled styling, "جاري الحفظ...") during inflight requests.
  - Submit actions must **never** prematurely show success before authoritative server confirmation.
- **Idempotent Interaction:** Disable submit controls upon initial submission to prevent duplicate clicks, rapid double-submits, or race conditions.
- **Actionable Success States:** Clearly communicate successful completion (e.g., clear confirmation banner, saved form reference) and present obvious next actions.
- **Specialist Handoff:** Form business validation semantics (idempotency rules, character limits, date constraints) remain governed by [`zamblak-fieldwork-domain-guard`](file:///D:/Zamblak/Zamblak-field-research/.agents/skills/zamblak-fieldwork-domain-guard/SKILL.md).

---

## 4. Operational Fieldwork Usability

Zamblak is designed for repeated, high-volume operational field research by field researchers and managers:

- **Low Cognitive Load:** Maintain clean, uncluttered visual hierarchy. Differentiate primary workflow actions from secondary or destructive options.
- **At-a-Glance Status:** Critical statuses (e.g., form status, respondent eligibility, project active state) must be immediately discoverable without hunting or complex multi-level menus.
- **Generous Touch Targets:** All interactive elements (buttons, checkboxes, select triggers) must meet minimum touch target dimensions (minimum 44×44px) with safe surrounding spacing for tablet and mobile field use.
- **Streamlined Workflows:** Repeated data-entry flows must minimize redundant screen hopping, nested modals, or unnecessary confirmation gates.
- **Accidental Action Prevention:** Separate destructive triggers (e.g., reject, delete) with distinct visual styling and physical spacing from standard progression buttons.
- **No Hover-Only Critical Context:** Never hide essential operational information, status explanations, or action triggers behind hover-only states, as touch devices cannot hover.
- **No Ungrounded Capabilities:** Do not invent offline synchronization, device camera requirements, or biometric features not established in canonical repository authority.

---

## 5. Responsive Behavior & Viewport Resilience

- **Viewport Range:** Interfaces must function seamlessly from narrow mobile screens (360px - 414px) up to wide desktop displays.
- **Zero Horizontal Overflow:** Eliminate accidental horizontal overflow or unstyled viewport scrolling.
- **Mobile Form Usability:** Input fields, dropdowns, and buttons must remain comfortably readable and operable at narrow mobile widths without cramped padding or truncated text.
- **Data Table Adaptation:** Tables and data grids must employ an intentional narrow-screen strategy:
  - Structured card layout or stacked view on mobile; or
  - An intentional horizontal scroll container with clear visual affordance / scroll indicators.
  - Do not dogmatically ban tables or force cards without considering the specific screen contract.
- **Arabic Text Wrapping:** Apply robust overflow and wrapping (`break-words`, `overflow-wrap: anywhere`) on variable-length Arabic names, respondent notes, or descriptions to prevent layout breakage.
- **Floating & Sticky Elements:** Ensure sticky headers, floating action buttons, or bottom action bars do not obscure form inputs, validation messages, or virtual keyboards.
- **Mobile Overlays:** Sheets, modals, and bottom drawers must adapt cleanly to small viewports with obvious dismissal affordances.

---

## 6. Practical Accessibility (Usability-First)

Focus accessibility reviews on eliminating actual usability barriers:

- **Semantic HTML:** Use appropriate semantic elements (`<main>`, `<nav>`, `<form>`, `<button>`, `<fieldset>`, `<legend>`) rather than generic `<div>` soup.
- **Full Keyboard Operability:** All interactive components must be reachable and operable via keyboard navigation (Tab, Enter, Space, Arrows, Escape).
- **High-Contrast Focus Indicators:** Focusable elements must feature clear, high-contrast focus rings (`focus-visible:ring-2`).
- **Descriptive Accessible Names:** Icon-only buttons (e.g., close, edit, delete) must include explicit accessible labels via `aria-label` or visually hidden text (`sr-only`).
- **Accessible Validation:** Bind error notices to their respective inputs using `aria-invalid="true"` and `aria-describedby`.
- **Logical Heading Structure:** Maintain an orderly heading hierarchy (`h1` -> `h2` -> `h3`) reflecting document structure.
- **Multi-Cue State Communication:** Never communicate state, status, or errors solely through color. Combine color with distinct icons, descriptive text badges, or semantic attributes.
- **Modal Focus Management:** Dialogs must trap focus sensibly while open and restore focus to the triggering element upon closure.

---

## 7. UI State Completeness

Every data-driven surface must account for relevant operational states:

| State | Design Requirement |
| :--- | :--- |
| **Loading** | Subtle skeleton or spinner that preserves layout stability and does not abruptly destroy user context. |
| **Empty** | Helpful, welcoming empty state explaining the condition and providing clear next steps or creation actions. |
| **Success** | Immediate, unambiguous confirmation of completed action with relevant reference details. |
| **Validation Failure** | Inline, contextual error indicators highlighting exact fields needing correction. |
| **Server / Action Failure** | Actionable, user-friendly error notice explaining what failed without exposing internal database or stack trace details. |
| **Unavailable / Restricted** | Clean, dignified restricted-access view where authorization or tenant boundary limits visibility. |

*Discipline:* Do not demand theoretical states if a component or route cannot physically enter them under current implementation.

---

## 8. Destructive & Irreversible Actions

- **Visual Differentiation:** Destructive actions (e.g., form rejection, project deletion) must feature distinctive warning styling (e.g., red/destructive color tokens) separated from primary positive actions.
- **Consequence-Specific Confirmation:** Confirmation dialogues must clearly state the exact consequence and entity affected (e.g., "هل أنت متأكد من رفض استمارة الباحث [الاسم]؟"). Avoid generic, vague confirmation prompts ("هل أنت متأكد؟").
- **Clear State Representation:** Disabled destructive controls must remain clearly distinguishable from active triggers.
- **UI Is Not Enforcement:** UI confirmation is a user error-prevention aid. It **never** substitutes for server-side authorization or database constraints.

---

## 9. Screen-Contract & Specification Fidelity

- **Contract-First Inspection:** When a screen contract (e.g., [`docs/contracts/research-form-submission-screen-contract.md`](file:///D:/Zamblak/Zamblak-field-research/docs/contracts/research-form-submission-screen-contract.md)) exists, review it thoroughly before proposing or evaluating UI adjustments.
- **Preserve Approved Workflows:** Maintain established information architecture and user flows. Do not redesign workflows merely because an alternative pattern appears trendy.
- **Visual Polish vs Product Change:** Distinguish visual styling refinements from product behavior modifications. Any change in behavior, data capture, or state flow requires explicit product authority.
- **Stitch Is Not Authority:** Visual assets or Google Stitch mockups are strictly design references and cannot override approved screen contracts or PRDs.

---

## 10. Security & Authorization Boundary

- **UI Visibility Is NEVER Authorization:**
  - A hidden button does **not** protect an endpoint.
  - A disabled input does **not** enforce permission.
  - An unrendered financial value does **not** secure financial data.
- **Specialist Handoff:** Authentication, tenant isolation (`account_id`), IDOR/BOLA prevention, respondent PII privacy, and role-based visibility belong strictly to [`zamblak-security-privacy-guard`](file:///D:/Zamblak/Zamblak-field-research/.agents/skills/zamblak-security-privacy-guard/SKILL.md).
- **Server Enforcement:** Authorization must always be enforced server-side via Supabase RLS policies and server-side action validation.

---

## 11. Framework Boundary & Specialist Handoffs

The UX guard focuses on interaction, layout, and visual fidelity. Implementation mechanics route to specialized skills:

| Concern | Routed Specialist Skill |
| :--- | :--- |
| Next.js App Router, Server/Client components, streaming | `zamblak-nextjs-framework-engineering` |
| Server Action hooks, state transitions (`useActionState`) | `zamblak-nextjs-framework-engineering` / `zamblak-supabase-data-engineering` |
| Supabase queries, RPC calls, SSR cookie sessions | `zamblak-supabase-data-engineering` |
| Measured performance bottlenecks, rendering metrics | `zamblak-nextjs-performance-engineering` |
| Non-trivial production code quality & refactoring | `zamblak-clean-code-guard` |
| Changed or generated test code quality | `zamblak-test-guard` |
| Fieldwork domain logic, respondent rules, form invariants | `zamblak-fieldwork-domain-guard` |
| Product requirements, PRD alignment, scope decisions | `zamblak-product-manager` |
| Database schema, migrations, RLS policies | `zamblak-db-rls-migration-guard` |

---

## 12. Review Discipline & Finding Severity Tiers

Evaluate UX implementations against three clear severity tiers:

- **`BLOCKING`:** Severe usability defects that prevent workflow completion:
  - Broken RTL layouts rendering text unreadable or controls inaccessible;
  - Misleading success/error states that deceive the user;
  - Missing keyboard accessibility for primary actions;
  - Dangerous, unconfirmed destructive actions;
  - Direct violations of approved screen contracts.
- **`MATERIAL`:** Significant usability or responsiveness issues that degrade efficiency:
  - Unhandled bidi punctuation inversion on critical identifiers;
  - Poor mobile responsiveness or horizontal overflow on supported viewports;
  - Validation errors separated far from affected inputs;
  - Missing touch target padding on high-frequency mobile controls.
- **`MINOR`:** Cosmetic or polish refinements:
  - Subtle spacing or typography adjustments;
  - Minor color contrast enhancements where current contrast is already acceptable;
  - Secondary icon alignment refinements.

*Cardinal Rule:* Never block a release or trigger HOLD over subjective aesthetic tastes, personal design trends, or sub-pixel spacing differences. Prefer the smallest durable UX correction.

