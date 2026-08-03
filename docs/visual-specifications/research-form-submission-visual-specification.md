# Research Form Submission — Visual Specification

## 1. Purpose, Status, Authority, and Scope

**Status:** `APPROVED — MOZFER PRODUCT AUTHORITY`

**Approval metadata:**
- **Approved by:** Mozfer
- **Approved date:** 2026-08-03
- **Approval scope:** visual presentation of the existing `/forms/new` page only
- **Existing-page direction:** improve the existing page
- **Rebuild authority:** not granted
- **Implementation status:** not started and not authorized by this approval
- **Runtime acceptance:** unclaimed
- **Approved under:** `ZAM-PHASE1-RESEARCH-FORM-SUBMISSION-VISUAL-SPECIFICATION-MOZFER-APPROVAL-24`

- Phase: Phase 1, Product and Workflow Canonicalization.
- Slice: Research Form submission Visual Specification.
- Primary route: `/forms/new`.
- Existing-page direction: improve the current page.
- Rebuild authority: not granted.
- Wireframe status: approved by Mozfer on 2026-08-03.
- Visual Specification approval: granted by Mozfer on 2026-08-03.
- Implementation status: not started and not authorized.
- Runtime acceptance: unclaimed.
- Created under: `ZAM-PHASE1-RESEARCH-FORM-SUBMISSION-VISUAL-SPECIFICATION-22`.

**Approval boundary:** the existing `/forms/new` page will be improved; no replacement route or parallel page is authorized; exact source changes require the later approved Implementation Slice; this approval is not an implementation claim.

**Scope:** This document specifies the visual appearance, spacing, responsive behavior, component presentation, and interaction states for the existing Owner Researcher Research Form submission page at `/forms/new`. It is a presentation-layer specification for the approved low-fidelity structure. It does not rebuild the page, does not modify source code, does not create a second submission page, does not create an image or screenshot, does not implement Data Contract corrections, does not run browser acceptance, and does not approve implementation or runtime behavior.

**Authority:**

1. Canonical product, role, schema, security, decision, and roadmap documents remain authoritative.
2. The Screen Contract governs screen scope, copy, navigation, states, and behavior.
3. The approved Data Contract governs data semantics.
4. The approved Wireframe governs structure and information hierarchy.
5. This Visual Specification governs visual presentation only after Mozfer approval.
6. Current source is implementation evidence, not automatic design authority.
7. This document does not authorize implementation.

## 2. Existing Page and Non-Rebuild Boundary

- `/forms/new` already exists and is functional.
- The later Implementation Slice will improve the existing component and CSS.
- The page must not be rebuilt from scratch.
- No parallel route or replacement page may be introduced.
- Current business logic, route behavior, and server action boundaries must be preserved unless a later authorized implementation task explicitly changes them.
- The Visual Specification may identify implementation deltas but must not implement them.

## 3. Design Intent

The intended feeling is:

- calm;
- trustworthy;
- operational;
- uncluttered;
- suitable for a senior Researcher entering field-interview records;
- Arabic-first and RTL-native;
- visually consistent with the current Zamblak application;
- clear enough for frequent daily use;
- professional without appearing corporate-heavy or decorative.

Avoid:

- dashboard-like density;
- gradients;
- glass effects;
- oversized illustrations;
- decorative charts;
- excessive shadows;
- neon use of the accent color;
- multi-step wizard styling;
- floating or sticky submit controls;
- unnecessary icons;
- visual reinvention of the application shell.

## 4. Existing Visual Foundation

**Typography:**

- Font: Tajawal (application font; unchanged).
- Available weights: 400, 500, 700.

**Existing colors (application tokens, used unchanged):**

- Page background: `#F6F5F1`.
- Foreground: `#102A2B`.
- Primary: `#0F3D3E`.
- Accent: `#A8E10C`.
- Surface: `#FFFFFF`.
- Surface hover: `#F7F9F8`.
- Border: `#DDE4E1`.
- Muted text: `#5D6B69`.
- Muted background: `#EEF2F0`.
- Danger: `#DC2626`.
- Danger background: `#FEF2F2`.
- Warning: `#D97706`.
- Warning background: `#FFFBEB`.
- Success: `#16A34A`.
- Success background: `#F0FDF4`.

**Rules:**

- Use dark teal as the primary action, link, and focus color.
- Use white surfaces above the warm off-white page background.
- Use the lime accent sparingly or not at all on this form.
- Do not use lime as a large background, body-text color, error color, or primary button color.
- Do not introduce new global color tokens.
- Do not change the application font.
- Do not create a second design language for this page.

## 5. Page Canvas and Content Width

**Desktop and tablet:**

- Application background remains `#F6F5F1`.
- Submission workflow content uses one centered column.
- Maximum workflow-column width: `48rem`.
- The BackLink, introduction, state cards, locked context, and form card align to the same column edges.
- Page block padding:
  - top: `2.5rem`;
  - bottom: `3.5rem`;
  - inline: at least `1rem`, including safe-area handling.
- No two-column form layout.
- No sidebar.

**Narrow/mobile:**

- Full available width.
- Inline page padding: `1rem`.
- Top padding: `1.5rem`.
- Bottom padding: `2.5rem`.
- No horizontal scrolling.
- No fixed or sticky action area.

The Header and global application shell are not changed.

## 6. Navigation and Page Introduction

**Back navigation:**

- Preserve the existing shared `BackLink`.
- Preserve its chevron.
- Minimum target height: `3rem`.
- Use the primary color.
- Do not add a surrounding card or button background.
- Retain the exact Arabic copy.

**Spacing:**

- BackLink to introduction: `1rem`.
- Introduction to the first state/context/form region: `1.75rem`.

**Page title:**

- Desktop size: `2rem`.
- Mobile size: `1.625rem`.
- Weight: 700.
- Line height: approximately 1.5.
- Foreground color.
- No icon.
- No decorative underline.
- No badge.

**Description:**

- Desktop size: `1.0625rem`.
- Mobile size: `1rem`.
- Muted color.
- Line height: approximately 1.75.
- Maximum readable width: `42rem`.
- Retain exact approved copy.

The page introduction is the only page heading.

## 7. Submission Form Card

One visually dominant but quiet form card:

- Surface: white.
- Border: `1px solid #DDE4E1`.
- Radius: `1.125rem`.
- Desktop padding: `2rem`.
- Mobile padding: `1.25rem`.
- Shadow: `0 0.375rem 1.5rem rgb(15 61 62 / 5%)`.
- No colored top bar.
- No gradient.
- No illustration.
- No duplicated form title inside the card.
- Vertical field-group gap: `1.5rem`.

## 8. Direct-Mode Field Presentation

Fields remain in this order:

1. Project.
2. Participant.
3. Interview date.
4. Notes.

Project and Participant are not placed side by side.

**Labels:**

- Tajawal.
- Size: `0.9375rem`.
- Weight: 700.
- Foreground color.
- Label-to-control gap: `0.5rem`.
- Required marker uses the danger color but is not the only required indication.

**Selects and date input:**

- Width: 100%.
- Minimum height: `3.25rem`.
- Border: `1px solid #DDE4E1`.
- Radius: `0.75rem`.
- Background: `#FBFCFB`.
- Text color: foreground.
- Horizontal padding: `0.875rem`.
- Font size: `1rem`.
- Normal state must not use a heavy shadow.

**Textarea:**

- Width: 100%.
- Minimum height: `6rem`.
- Radius: `0.75rem`.
- Background: `#FBFCFB`.
- Border and typography consistent with other controls.
- Padding: `0.875rem`.
- Vertical resize may remain available.
- No character counter is introduced by this specification.

**Helper text:**

- Size: `0.875rem`.
- Muted color.
- Line height: at least 1.6.
- Placed directly below the related control, or immediately before the textarea only when that matches the approved structure.
- Retain exact Arabic copy.

**Hover:**

- Border may move to a slightly stronger neutral.
- No movement or transform.

**Focus:**

- Preserve the global visible focus ring: 2px primary outline with 2px offset.
- Control border becomes primary.
- No glow animation.
- No focus movement claim.

**Disabled:**

- Muted background.
- Muted text.
- Opacity must not make text unreadable.
- Cursor may indicate an unavailable state.
- No hover transform.
- Disabled Participant remains visibly associated with its Project.

## 9. Prefilled Locked-Context Card

The locked-context region must be visually distinct from editable form fields without looking like an error.

- Position: after page introduction and before the form card.
- Background: muted background `#EEF2F0`.
- Border: `1px solid #DDE4E1`.
- Radius: `1rem`.
- Padding:
  - desktop `1.5rem`;
  - mobile `1.125rem`.
- No strong shadow.
- Title weight 700 and size `1.125rem`.
- Rows stack vertically.
- Row gap: `0.75rem`.
- Label size: `0.875rem`.
- Value size: `1rem`.
- Values use foreground color and weight 700.
- Labels use muted color.
- Mobile number remains LTR-isolated.
- Long Project and Participant values wrap.
- Return link remains clearly interactive.
- Do not style display values as disabled inputs.
- Do not add edit, unlock, remove, or replace actions.
- No new Arabic badge or helper copy.

A restrained visual marker such as a subtle inline-start border may be specified only using the existing primary color. Do not introduce a new icon dependency.

## 10. Actions

The action region remains after the shared inline error region.

**Desktop:**

- Top divider: `1px solid #DDE4E1`.
- Top padding: `1.5rem`.
- Top margin: `0.5rem`.
- Display as one row.
- Gap: `0.75rem`.
- Align to the form's action edge according to RTL layout.
- Preserve DOM and keyboard order:
  1. Cancel.
  2. Save.

**Primary Save:**

- Minimum height: `3.25rem`.
- Minimum inline size: `9rem`.
- Radius: `0.75rem`.
- Background: primary.
- Text: white.
- Weight: 700.
- Existing restrained shadow may remain.
- Hover: darker teal.
- Active: no more than a subtle scale or movement already consistent with the application.
- Disabled/pending: no hover movement, reduced emphasis but readable.

**Secondary Cancel:**

- Minimum height: `3.25rem`.
- Surface background.
- Neutral border.
- Foreground text.
- Weight: 700.
- No danger styling.

**Mobile:**

- Actions stack vertically.
- Width: 100%.
- Order remains Cancel then Save.
- Gap: `0.75rem`.
- No sticky actions.
- Save remains visually dominant despite appearing after Cancel.

**Pending:**

- Primary copy becomes the existing `جاري الحفظ...`.
- No spinner is required.
- No progress bar.
- No page overlay.
- No skeleton.
- Primary remains disabled until completion.

## 11. State Presentation

**Ready direct:**

- Normal introduction and form card.
- No state banner.

**Ready prefilled:**

- Introduction.
- Locked-context card.
- Form card.

**Invalid prefilled:**

- Danger alert above the direct-mode form.
- Background: danger background.
- Border: danger color at restrained opacity or a clear inline-start danger border.
- Radius: `0.875rem`.
- Padding: `1rem 1.125rem`.
- Alert heading weight 700.
- Body text foreground or danger-safe text.
- Direct-mode form remains fully visible beneath it.
- No technical data displayed.

**No eligible projects:**

- Final Visual Specification decision: the submission form card is not displayed.
- Show only the page introduction and warning/status card.
- Warning background.
- Warning-colored inline-start border.
- Radius: `0.875rem`.
- Padding: `1.25rem`.
- Heading weight 700.
- Guidance below.
- `عرض المشاريع` action visible.
- No disabled empty form below the card.

**Project selected with no eligible participants:**

- Project remains visible.
- Participant select remains disabled.
- Helper appears directly below it.
- Helper uses warning color.
- No alert card.
- No invented live region.
- Save remains disabled.

**Client validation and server/action failure:**

- Use the same shared inline error box.
- Position after fields and before actions.
- Danger background.
- Danger border.
- Radius: `0.75rem`.
- Padding: `0.875rem 1rem`.
- Error text size: `0.9375rem`.
- Error text weight: 500.
- Retain `role="alert"` semantics.
- No toast.
- No modal.
- No technical error code.
- No automatic focus claim.

**Authorization redirects:**

- No local design is specified because these routes redirect.

**Success:**

- No success state is displayed on `/forms/new`.
- The destination owns the existing success banner.
- `/forms/[formId]` is not redesigned in this specification.

## 12. Responsive Specification

Use the existing `48rem` family of breakpoints.

**At and above `48rem`:**

- Centered workflow column.
- Desktop typography and padding.
- Actions in one row.
- Form remains one column.

**Below `48rem`:**

- Mobile typography and padding.
- Cards use smaller padding.
- Actions stack.
- All controls full width.
- Context labels and values stack where necessary.
- Long Arabic names wrap naturally.
- Mobile and date tokens stay LTR-isolated.
- No horizontal scroll.
- No sticky actions.

Do not define additional breakpoints unless current source provides a direct need.

## 13. Accessibility and Interaction Presentation

- RTL document direction remains.
- Labels remain explicitly associated with controls.
- Required state is communicated through label text/semantics, not color only.
- Focus-visible treatment remains consistent globally.
- All actionable controls meet at least `3rem` minimum target height.
- Errors use `role="alert"` only where already approved.
- No-eligible state uses `role="status"`.
- No-participants helper remains ordinary visible helper text.
- Mobile numbers and dates use LTR isolation.
- Disabled contrast must remain readable.
- Pending state must not rely only on color.
- Reduced-motion behavior remains respected.
- No focus trap.
- No autofocus.
- No programmatic focus behavior is claimed by this specification.
- No automated or manual accessibility acceptance claim.

## 14. Source-to-Spec Delta Map

| Region | Current source approach | Approved visual target | Later implementation impact | Scope classification |
| --- | --- | --- | --- | --- |
| Overall page width | `.page` class uses `width: min(100%, 80rem)` centered with `2.5rem`/`3.5rem` block padding and safe-area inline padding | Workflow content limited to a centered `48rem` column; BackLink, intro, state cards, locked context, and form card share the same column edges | Adjust page container width/alignment; preserve existing block and safe-area padding | Refine |
| Inline styles in `CreateResearchFormClient.tsx` | Numerous inline style props: control heights and paddings; hex colors `#ef4444`, `#f59e0b`, `#dc2626`, `#92400e`; font-size overrides on actions and helper text | All presentation expressed through existing tokens and bounded CSS classes; no inline hex presentation | Remove only directly affected inline styles during the later bounded slice | Replace screen-local styling |
| Current use of `detailCard` | `detailCard` is reused as the surface for the prefilled alert, the no-eligible card, the locked-context card, and the submission form | Dedicated presentation per region: form card (white, `1.125rem` radius, `2rem` padding), muted locked-context card, state cards | Stop using `detailCard` as the universal surface on this page | Replace screen-local styling |
| Current use of `rejectTextarea` for select/date/textarea controls | Selects, date input, and textarea all reuse `rejectTextarea` (`0.5rem` radius, `0.5rem` padding) with inline height/padding overrides | Dedicated control presentation: `3.25rem` minimum height, `0.75rem` radius, `#FBFCFB` background, `0.875rem` horizontal padding; textarea `6rem` minimum height | Introduce bounded control styling for this surface | Replace screen-local styling |
| Existing `formContainer`, `formInput`, `formTextarea`, and `formActions` classes | Classes already match the approved tokens (`48rem` max width, `1.125rem` radius, `2rem` padding, 5% shadow; inputs `3.25rem`/`0.75rem`/`#FBFCFB`; textarea `6rem`; actions row) but are not used by this surface | Reuse these classes for the form card and controls; tune `formActions` spacing (divider, `1.5rem` top padding, `0.5rem` top margin) | Minor bounded adjustments; no new global tokens | Reuse (actions: refine) |
| Current locked-context presentation | White `detailCard` with `descriptionList`/`descriptionRow` labels and values | Muted-background card `#EEF2F0`, `1rem` radius, `1.5rem`/`1.125rem` padding, muted labels `0.875rem`, foreground values `1rem` weight 700, LTR-isolated mobile number, interactive return link | Bounded restyle of the locked-context region only | Refine |
| Current no-eligible state | Status card is rendered above a fully disabled empty form | Only the page introduction and the warning/status card are shown; the submission form card is not displayed | Conditional render change: suppress the form card in this state | Later implementation only |
| Current validation error presentation | Plain red text via `.validationError` under the fields | Shared inline error box after fields and before actions: danger background, danger border, `0.75rem` radius, `0.875rem 1rem` padding, `0.9375rem` weight 500 text, `role="alert"` retained | Bounded restyle of the error region | Refine |
| Current action layout | `.dialogActions` row, `flex-end` alignment, `0.75rem` gap, no divider, no mobile stacking rule | Divider `1px solid #DDE4E1`, `1.5rem` top padding, `0.5rem` top margin, one row on desktop, stacked full-width on mobile, Cancel then Save order | Bounded action-region styling including a mobile stacking rule | Refine |
| Mobile behavior | Existing `48rem` media-query family; no action-stacking rule; page intro already stacks | Mobile typography (`1.625rem` title, `1rem` description), `1rem`/`1.5rem`/`2.5rem` paddings, stacked actions, full-width controls, natural Arabic wrapping, LTR token isolation, no sticky actions | Add bounded mobile rules within the existing `48rem` breakpoints | Refine |
| Focus-visible foundation | Global `:focus-visible` ring: 2px primary outline with 2px offset; control focus border primary | Unchanged global treatment; control borders become primary on focus; no glow | None | Reuse |
| Reduced-motion foundation | Global `prefers-reduced-motion` query disables animations and transitions | Unchanged; all specified transitions and movements fall under the existing query | None | Reuse |
| Business logic, route behavior, and server action boundaries | Form submission, prefilled context handling, eligibility logic, server action boundaries, and success navigation are implemented in the client and `actions.ts` | All business behavior is preserved exactly; only presentation changes are specified | No logic change is authorized by this specification | Preserve behavior |

## 15. Implementation Guardrails

- Later implementation must modify the existing page and component.
- No second form component unless extraction is necessary and explicitly justified in the implementation task.
- Prefer existing CSS variables.
- Prefer existing shared `BackLink`.
- Do not introduce a UI library.
- Do not introduce a new icon package.
- Do not create global tokens for one screen.
- Avoid unrelated cleanup of all `forms.module.css`.
- Remove only directly affected inline styles during the later bounded implementation slice.
- Do not redesign `/forms`, `/forms/[formId]`, Projects, Header, or the app shell.
- No Data Contract fix is implemented by this document.
- Implementation must be a separately approved task.

## 16. Explicit Exclusions and Non-Claims

Excluded:

- Rebuilding the page.
- New route.
- New form workflow.
- New Arabic copy.
- Screen Contract changes.
- Data Contract changes.
- Product decisions.
- Pricing.
- Financial information.
- Review Accept/Reject.
- Cancellation.
- Correction/resubmission.
- Collections.
- Sample domain.
- Support Helper submission.
- Future roles.
- Excel.
- WhatsApp.
- Success-detail redesign.
- Header redesign.
- Global design-system consolidation.
- Component-library migration.
- New dependencies.
- Image generation.
- Screenshot generation.
- Source implementation.
- SQL.
- Migrations.
- Tests.
- Browser smoke.
- Runtime acceptance.
- Production readiness.
- Phase 1 closure.

## 17. Visual Acceptance Checklist

Unchecked; reserved for the later implementation review.

- [ ] Content column alignment matches Section 5.
- [ ] Title and description hierarchy matches Section 6.
- [ ] One-column field flow matches Section 8.
- [ ] Form-card surface matches Section 7.
- [ ] Locked-context distinction matches Section 9.
- [ ] Field state consistency (hover, focus, disabled) matches Section 8.
- [ ] No-eligible form suppression matches Section 11.
- [ ] Inline error presentation matches Section 11.
- [ ] Desktop action row matches Section 10.
- [ ] Mobile action stacking matches Section 10.
- [ ] RTL behavior matches Sections 5 and 12.
- [ ] LTR token isolation matches Sections 9 and 13.
- [ ] Focus-visible treatment matches Section 13.
- [ ] Disabled readability matches Section 8.
- [ ] No new copy or scope leakage.

## 18. Mozfer Visual Review Checklist

Unchecked; reserved for Mozfer review.

- [x] Overall look is calm and professional.
- [x] Existing page is being improved rather than rebuilt.
- [x] Page width feels appropriate.
- [x] Form card hierarchy is clear.
- [x] Locked participant context is visibly read-only.
- [x] Project and Participant order is clear.
- [x] No-eligible state hides the unusable form.
- [x] Primary and secondary actions are visually clear.
- [x] Mobile stacking is acceptable.
- [x] No unnecessary decoration or feature leakage.
- [x] Approve or request one bounded correction.
