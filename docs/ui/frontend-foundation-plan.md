# Frontend Foundation Plan

## 1. Title and Scope
**Title:** Frontend Foundation Plan (Batch 1)
**Scope:** This document is a planning document for the first frontend batch (Batch 1) only. It does not authorize implementation by itself. The focus is exclusively on the layout, RTL handling, typography, design tokens, header, and role-aware navigation contract.

## 2. Source Documents Used
- `docs/leanctx.md`
- `docs/project-status.md`
- `docs/ui/stitch-v3-handoff.md`
- `docs/product-requirements.md`
- `docs/roles-permissions.md`
- `docs/security-foundation.md`

## 3. Tool Policy
- **LeanCTX:** Used to maintain a focused, small context window.
- **Graphify:** Not used (navigation only if used).
- **Context7:** Not used (external library docs were not needed for this foundation planning).
- **Spec Kit:** Not used.
- **External References:** External references were not read in this planning task. The external Anthropic reference pack remains available as optional inspiration only and must not override Zamblak rules.

## 4. Batch 1 Objective
Batch 1 is strictly for setting up the frontend foundation. Batch 1 planning does **not** authorize:
- Real auth integration
- Live role fetching
- Supabase calls
- Dashboard content implementation beyond the completed role-aware empty shell slice
- Financial route implementation

Specifically, Batch 1 is restricted to:
- App shell and layout direction setup.
- RTL handling and conventions.
- Typography configuration.
- Design tokens setup (Tailwind configuration).
- Header and top navigation components.
- Role-aware navigation contract structure.
- Basic page container conventions.
- **No** dashboard, search, or auth implementation yet unless explicitly approved in a later task.

## 5. Non-goals for Batch 1
Batch 1 must explicitly exclude:
- Dashboard cards.
- Respondent search logic.
- Forms.
- Supabase auth integration.
- Database reads/writes.
- Financial screen implementation.
- Reports/export UI.
- Any new product scope.

## 6. Proposed File Areas for Future Implementation
*Note: This is planning only. Do not create these files yet.*
- **App Layout:** `app/layout.tsx` or similar root layout file (example path).
- **Shared UI Shell/Header:** `components/layout/Header.tsx`, `components/layout/Navigation.tsx` (example paths).
- **Design Tokens:** `tailwind.config.ts`, `app/globals.css` (example paths).
- **Font Setup:** Likely in `app/layout.tsx` using `next/font/google` (example path).

**Inspection Rule:** The future implementation task must inspect the actual existing Next.js/Tailwind structure before editing any token or style files.

## 7. Design Token Plan
- **Background:** `#F5F7F7`
- **Primary Teal:** `#0F3D3E`
- **Accent Lime:** `#A8E10C`
  - *Guidance:* Accent lime is strictly for primary actions, active states, and gentle highlights. It must **never** be used for body text on light backgrounds.
- **Dark Text:** `#102A2B`
- **White:** `#FFFFFF`

## 8. Typography and Readability Plan
- **Font Preference:** Tajawal, IBM Plex Sans Arabic, or Cairo.
- **Sizing:** Senior-friendly sizing with large, readable text.
- **Usability:** Minimum 48px touch targets for all interactive elements.
- **Accessibility:** Clear focus states must be defined.
- **Forbidden Styles:** No glassmorphism, neon, heavy gradients, or 3D cartoon SaaS aesthetics.

## 9. RTL and LTR Numeric Plan
- **Direction:** Arabic RTL root/container direction (`dir="rtl"`).
- **Spacing:** Use logical CSS spacing properties where possible (e.g., `ps-4`, `me-2`).
- **Numeric Display:** Phone numbers and IDs must be rendered LTR (e.g., `dir="ltr"` on specific spans/inputs).
- **Format:** Do not mirror digit order. Maintain the `9665xxxxxxxx` display format precisely.

## 10. Header and Navigation Plan
- **Structure:** Top navigation only (no sidebar).
- **Branding:** Logo positioned in the top-right area for the RTL layout, inside a light/white rounded plate.
- **Text Branding:** Exactly: "زمبلك للأبحاث الميدانية".
- **Owner Navigation:** `الرئيسية / الشركات / المشاريع / المستحقات`
- **Support Helper Navigation:** `الرئيسية / الشركات / المشاريع`
  - *Constraint:* `support_helper` must not see `المستحقات` or any placeholder for it.

## 11. Role Visibility Contract
- **Owner:**
  - Sees actual financial data only when authorized.
  - No locked or blurred financial placeholders are needed for owner.
- **Support Helper:**
  - Operational data only.
  - MUST NOT see:
    - financial amounts
    - prices
    - payments
    - due amounts
    - financial summaries
    - financial cards
    - hidden, locked, blurred, disabled, or placeholder financial cards
    - المستحقات navigation
  - Do not rely on CSS hiding alone when live data is introduced.

## 12. Stitch Correction Checklist for Future Implementation
- Implementation must **not** be pixel-perfect compared to Stitch.
- Correct any RTL layout, header, or logo positioning issues present in the Stitch designs.
- Ignore rejected folders `_9` and `_12`.
- Use approved screen references `_1`, `_2`, and `_3` for shell, header, and visual direction **only**.
- Do **not** copy HTML/CSS from the Stitch exports.

## 13. Validation Plan for Future Implementation Batch
Checks for the later implementation task:
- Linting and build verification (if applicable).
- Visual smoke test for RTL header alignment.
- Role navigation smoke test:
  - Verify `owner` sees `المستحقات`.
  - Verify `support_helper` does not see `المستحقات`.
- Phone number LTR smoke test (confirm `9665xxxxxxxx` stays LTR within the RTL flow).
- Ensure no financial placeholders exist in the `support_helper` UI.

## 14. Proposed Next Task After This Plan
- The dashboard shell slice is already complete.
- The next persisted activity is workflow-governance adoption, starting with agent-control strengthening.

## 15. Open Questions / Risks
- Existing app structure (e.g., Next.js app router vs pages router) must be inspected before beginning implementation.
- Font loading choice may require consulting current Next.js documentation.
- Tailwind version and configuration structure must be verified before modifying tokens.
- Role source (`owner` vs `support_helper`) must be stubbed or read safely during this batch until full authentication is implemented.
