# Stitch V3 UI Handoff Inventory

## 1. Title and Scope
**Title:** Stitch V3 UI Handoff Inventory
**Scope:** Inventory of the approved Stitch V3 design handoff for Zamblak Field Research. This document serves as a visual and layout reference only. Stitch-generated code (HTML/CSS) is strictly forbidden from being imported or copied into the repository.

## 2. Source Paths Inspected
- `D:\Zamblak\handoff\stitch-v3-final\stitch_zamblak_design_system`

## 3. Tool/Context Policy Used
- **LeanCTX:** Yes, used to maintain minimal context and prevent scope creep.
- **Graphify:** No, not used for this task.
- **Context7:** No, not used as external library docs were not required.
- **Spec Kit:** No, not used.
- **External Anthropic References:** Yes, `frontend-design` and `webapp-testing` used purely for inspiration, visual critique, and UI testing ideas, without overriding any Zamblak project rules.

## 4. Known Stitch Issues & Implementation Corrections
- **Visual Reference Only:** Stitch is a visual reference only.
- **Not Pixel-Perfect:** Future implementation must not be pixel-perfect.
- **Intentional Correction:** Implementation must intentionally correct Stitch issues when they conflict with Zamblak rules.

**Correction Rules:**
- Fix header/logo placement if Stitch output is left-biased or not RTL-correct.
- Preserve phone numbers as LTR inside RTL layout.
- Prefer clarity, touch target size, and readability over visual exactness.
- Ignore rejected duplicate screens.
- Do not copy Stitch HTML/CSS into `src` or `app`.
- Do not treat Stitch labels, terms, layout, or interactions as product truth if they conflict with docs.
- Do not introduce maps, reports, analytics, teams, task management, billing screens, calendar, or AI assistant.

## 5. Approved Screen Inventory
| Screen Name | Folder Mapping | Purpose | Key UI Elements | Role Visibility Notes |
| :--- | :--- | :--- | :--- | :--- |
| **Login** | `_1` | Authenticate users. | Zamblak logo, Email/Username, Password, Login button. | owner and support_helper |
| **Owner Home Dashboard** | `_2` | Main dashboard for owners. | Mobile search input (9665xxxxxxxx), Quick action cards, Summary cards including financial summary. | **Owner only.** |
| **Support Helper Home Dashboard** | `_3` | Main dashboard for support helpers. | Mobile search input (9665xxxxxxxx), Quick action cards, Operational summary cards. No financial summary. | **Support Helper only.** |
| **Respondent Mobile Search** | `_4` | Search results for mobile numbers. | Search input, Result state cards (found, not found, warning), action buttons. | owner and support_helper |
| **Add Respondent Identity** | `_5` | Add a new respondent to the registry. | Form fields for respondent details. | owner and support_helper |
| **Add Respondent to Project** | `_6` | Link a respondent to a specific project. | Project selection, status updates. | owner and support_helper |
| **Project Detail Owner** | `_7` | View project details with financials. | Project info, financial summaries, pricing. | **Owner only.** |
| **Project Detail Support Helper** | `_8` | View operational project details. | Project info, operational tasks. No financial details. | **Support Helper only.** |
| **Projects List** | `_10` | List of all active projects. | List/grid of projects. | owner and support_helper |
| **Companies List** | `_11` | List of companies. | List/grid of companies. | owner and support_helper |
| **Company Detail** | `_13` | Detailed view of a company. | Company info, associated projects. | owner and support_helper |

## 6. Rejected/Duplicate Screen Inventory
| Folder | Reason Rejected |
| :--- | :--- |
| `_9` | Old Projects List (Duplicate/superseded by `_10`). |
| `_12` | Old Company Detail (Duplicate/superseded by `_13`). |

## 7. Visual Design Direction
- **Overall Feel:** Calm, professional digital field notebook.
- **Layout:** Tablet-first, Arabic RTL.
- **Accessibility:** Senior-friendly with large readable text and a minimum touch target size of 48px.
- **Branding:** The Zamblak logo MUST be visible in the top-right of the header on every screen, placed inside a white or very light rounded plate. It must never be placed directly on dark teal or dark backgrounds.
- **Text Branding:** Next to the logo, show exactly: "زمبلك للأبحاث الميدانية" (Avoid incorrect spellings like "زنبلَك").

## 8. Design Tokens
- **Background:** Light neutral close to `#F5F7F7`
- **Primary:** Teal `#0F3D3E`
- **Accent:** Lime `#A8E10C` (Use only for primary actions, active states, success badges, gentle highlights; NEVER for body text on light backgrounds).
- **Dark Text:** `#102A2B`
- **White:** `#FFFFFF`

## 9. Typography Recommendation
- **Font Families:** Tajawal, IBM Plex Sans Arabic, or Cairo.
- **Sizing:** Large, readable text suitable for senior users.

## 10. RTL and Senior-Friendly Requirements
- **RTL Enforcement:** Use logical CSS properties (e.g., `ms`, `me`, `ps`, `pe` in Tailwind).
- **Numeric Display:** Phone numbers (e.g., `9665xxxxxxxx`) and numeric IDs must remain Left-to-Right (LTR) inside the overall Arabic RTL layout. Do not mirror digit order or use formats like `+966 50 xxx xxxx`.
- **Usability:** Minimum 48px touch targets. Avoid generic AI SaaS aesthetics (glassmorphism, neon, heavy gradients, 3D cartoon illustrations).

## 11. Navigation Rules
- **Structure:** Top navigation only. **No sidebar.**
- **Owner Navigation:** الرئيسية / الشركات / المشاريع / المستحقات
- **Support Helper Navigation:** الرئيسية / الشركات / المشاريع (Never show المستحقات).

## 12. Role Visibility Rules
- **Owner:** Full visibility, including actual financial data (prices, payment amounts, due amounts, financial cards). Owner should see actual financial data only (no locked or blurred financial placeholders).
- **Support Helper:** Operational visibility only. MUST NOT see:
  - financial amounts
  - prices
  - payments
  - due amounts
  - financial summaries
  - financial cards
  - locked financial cards
  - blurred financial cards
  - disabled financial cards
  - hidden placeholder financial cards
  - المستحقات navigation

## 13. Component Inventory
- **Header:** Contains Logo (in white plate), Text Branding, and Top Navigation.
- **Search Card:** Very large search input with placeholder `9665xxxxxxxx` and "بحث" button.
- **Quick Action Cards:** "إضافة مشارك", "الشركات", "المشاريع".
- **Summary Cards (Operational):** "مشاريع نشطة", "مشاركات اليوم", "نماذج بانتظار المراجعة".
- **Summary Cards (Financial - Owner Only):** "مستحقات قريبة".
- **Result State Cards:** "تم العثور على المشارك", "لم يتم العثور على مشارك بهذا الرقم", "يوجد تحذير مشاركة خلال آخر 3 أشهر" (Warning card must be calm, clear, and non-blocking).

## 14. Proposed Next.js Route Map
- `/` - Home Dashboard (Renders Owner or Support Helper view based on role)
- `/search` - Respondent Mobile Search
- `/respondents/new` - Add Respondent Identity
- `/projects` - Projects List
- `/projects/[id]` - Project Detail (Renders Owner or Support Helper view based on role)
- `/projects/[id]/add-respondent` - Add Respondent to Project
- `/companies` - Companies List
- `/companies/[id]` - Company Detail
- `/financials` - (المستحقات) Owner only view. **Note:** It is an owner-only reserved route. Do not implement it in early UI batches unless a separate task explicitly authorizes it.

## 15. Implementation Warnings
- **NO COPYING:** Do not copy generated HTML/CSS from Stitch into the `src` or `app` folders.
- **BUSINESS LOGIC:** Do not use generic CRM/ERP terms (Quotations, Invoices, VAT, ZATCA, service bookings, supplier costing).
- **FORBIDDEN FEATURES:** Do not implement maps, sync, researcher teams, team chat, task management, advanced analytics, calendar modules, survey builders, AI assistants, or billing/subscription screens.
- **EXPORT/REPORTING:** Do not introduce export/reporting UI in Stitch UI implementation batches unless a separate approved MVP task explicitly authorizes it.
- **WARNINGS ONLY:** Same-domain participation within 3 months is a warning only, not a hard block.
- **BATCH CITATION:** Each future implementation batch must cite which handoff sections it follows and which Stitch issues it intentionally corrected.

## 16. Recommended Next Implementation Batches
1. **Batch 1: Foundation:** Setup Next.js layout, Design Tokens (Tailwind config), RTL support, Typography, and the unified Header component (Logo + Nav).
2. **Batch 2: Authentication:** Login screen implementation and role-based routing infrastructure.
3. **Batch 3: Dashboards:** Implement Owner and Support Helper home dashboards with their respective operational and financial summary cards.
4. **Batch 4: Search & Registry:** Implement the core Mobile Search flow and the "Add Respondent Identity" functionality.

## 17. Open Questions / Risks
- Ensure the Supabase Auth flow correctly sets and retrieves the custom roles (`owner`, `support_helper`) immediately on login to prevent flickering of the dashboard view.
- Confirm exact mechanism for enforcing LTR text direction strictly on the mobile number inputs while maintaining RTL for the surrounding form layout.
