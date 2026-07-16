# Zamblak branded loading mark — design freeze

**Status:** DESIGN APPROVED — documentation complete

**Task:** `ZAM-BRAND-LOADING-MARK-DESIGN-1`

**Implementation:** **not started** (no React component, SVG asset, CSS animation, or route integration in source)

**Future implementation task:** `ZAM-BRAND-LOADING-MARK-IMPLEMENT-1`

**Exact next product feature task:** `ZAM-PROJECTS-CREATE-PAGE-1`

This document freezes the approved **concept, motion, variants, accessibility, and technical direction** for a Zamblak branded loading mark. It does **not** implement UI, commit artwork, or claim production readiness.

---

## 1. Purpose

Define a respectful, original, lightweight loading mark that:

- reinforces Zamblak identity during meaningful waits;
- communicates speed, responsiveness, timing, and continuity;
- works with existing skeletons and list/page loaders;
- remains accessible (including reduced motion);
- stays implementable with inline SVG + CSS and design tokens.

The mark is a **loading identity element**, not a progress meter and not decorative filler.

---

## 2. Brand origin and approved story

The product name **Zamblak** comes from the nickname of Mozfer’s father.

The nickname refers to the **fast-moving seconds mechanism / spring-like movement of a clock**.

During football, Mozfer’s father was known for being:

- fast;
- short;
- quick in movement.

Because of that, people nicknamed him **Zamblak**. The product name was inspired by that family story.

### Story boundaries

- Record the story **respectfully and concisely**.
- Do **not** invent additional family history, dates, clubs, or personal details.
- Do **not** use the story for marketing slogans in this design task.
- The loading mark may **evoke** the stopwatch/seconds-hand idea; it must **not** claim biographical accuracy beyond the approved summary above.

### What the mark should communicate

| Quality | Intent |
|---|---|
| Speed | Quick, controlled rotation |
| Responsiveness | Lightweight feel on every wait |
| Movement | Clear seconds-hand motion |
| Timing | Clock/stopwatch metaphor |
| Continuity | Smooth, repeating cycle (not a progress bar) |
| Personal heritage | Quiet nod to the nickname origin — not a biography graphic |

---

## 3. Design principles

1. **Original** — geometry and composition must be original Zamblak work.
2. **Simple** — readable at compact icon sizes; few strokes, no clutter.
3. **Token-driven** — colors from the existing Zamblak system, not a one-off palette.
4. **Motion with purpose** — animation only while something is loading.
5. **Accessible** — reduced-motion fallback; no color-only loading signals.
6. **Complementary** — works with skeletons; does not replace all of them.
7. **Light** — inline SVG + CSS preferred; no remote assets or GIF/video.

---

## 4. Originality and external-reference restrictions

A stopwatch/clock image may have been used as **general inspiration** for the idea of a stopwatch and a seconds hand only.

### Forbidden

- copying the uploaded PNGTree (or any commercial) artwork;
- copying its geometry, orange/black composition, watermarks, or layout;
- downloading, embedding, or committing external commercial templates;
- tracing premium stock illustrations into repository assets;
- claiming third-party art as the Zamblak mark.

### Required

- create an **original** Zamblak symbol;
- keep legal/brand ownership clear: product design, not stock reuse;
- if reference images exist outside the repo, they must **not** be committed as source of truth for the mark.

No external artwork is part of this design freeze artifact set.

---

## 5. Primary stopwatch concept

**Preferred primary mark**

- clean **circular stopwatch** outline;
- **minimal** internal markings (avoid dense tick rings that vanish at small size);
- **one prominent seconds hand**;
- clear **center pivot**;
- overall silhouette readable as “time / seconds / quick motion.”

### Clarity rules

- Prefer two to four primary stroke shapes (bezel, hand, pivot, optional crown/button).
- Avoid ornate engravings, dual sub-dials, or heavy shadows.
- The hand must remain the dominant motion cue.
- At compact size, internal detail may reduce further; the circle + hand + pivot must remain.

---

## 6. Optional Z integration

Optional subtle integration of the letter **Z** into:

- the seconds hand shape;
- the center pivot shape; or
- restrained negative space.

### Constraints

- Optional only — not mandatory for v1 implementation.
- Must **not** reduce legibility of the stopwatch.
- Must not require reading “Z” to understand “loading.”
- If Z is used, it must remain secondary to the seconds-hand metaphor.

---

## 7. Color and token contract

Use **existing Zamblak system design tokens** (semantic CSS variables / brand tokens already used by the app shell).

### Requirements

- inherit current brand/accent color(s);
- work on **light** surfaces;
- work on **dark** surfaces;
- maintain **sufficient contrast** for the mark against its container;
- avoid introducing a new unrelated palette.

### Forbidden

- hardcoding the orange and black colors from any reference image;
- baking colors into a raster asset that cannot adapt;
- inventing a second brand accent solely for the loader.

### Implementation preference

- SVG `stroke` / `fill` via **`currentColor`** and/or semantic tokens (for example brand foreground/accent CSS variables already in the system);
- container sets color; the mark inherits.

Exact token names are resolved at implementation against current CSS/theme sources — not invented here.

---

## 8. Animation sequence

Primary motion (full cycle):

1. Seconds hand starts near **12 o’clock**.
2. Hand **rotates quickly** around the dial (clockwise, consistent with clock metaphor).
3. Near completion, a **small spring-like rebound** (short reverse ease, then settle).
4. Brief **pause**.
5. Cycle **repeats smoothly**.

### Explicit non-goals for motion

- must **not** imply fake loading progress or a percentage;
- must **not** complete a “bar fill” or multi-segment progress story;
- must **not** flash, strobe, or thrash.

---

## 9. Motion timing

| Parameter | Guidance |
|---|---|
| Cycle duration | approximately **0.9–1.2 seconds** |
| Feel | quick, controlled, lightweight, energetic |
| Avoid | frantic, jerky, distracting, sluggish, mechanically heavy |
| Technique | prefer **transform** rotation on the hand (not layout thrashing) |

Easing should support a short **overshoot/rebound** near the end of the rotation, then settle into the pause. Exact keyframes belong to implementation; this document freezes intent only.

---

## 10. Full-page variant

**Use for**

- initial protected application loading (where the framework permits);
- major route loading;
- full-page waiting states that are already full-page in nature.

**Contents**

- animated stopwatch mark (large);
- **Zamblak** wordmark / product name below or beside the mark;
- optional short loading label only when it improves understanding.

**Do not** force this variant on every list skeleton or button wait.

---

## 11. Compact variant

**Use for**

- buttons;
- cards;
- list refresh states;
- form submissions;
- bounded component loading.

**Contents**

- stopwatch mark **only**;
- **no** product wordmark;
- compact geometry suitable for control-adjacent placement.

---

## 12. Static / reduced-motion variant

**Use for**

- `prefers-reduced-motion: reduce`;
- environments where continuous animation is disabled;
- documentation and static previews.

**Behavior**

- remove continuous rotation and rebound;
- show a **static** mark; **or**
- one **minimal, non-looping** opacity change if consistent with repository accessibility rules.

No looping animation for reduced-motion users.

---

## 13. Accessibility

Future implementation **must**:

| Requirement | Detail |
|---|---|
| `prefers-reduced-motion: reduce` | Static mark (or single non-looping subtle change) |
| Decorative SVG | `aria-hidden` when adjacent text explains the loading state |
| Meaningful containers | Use repository-established status semantics (`aria-busy`, live regions, or existing loading patterns) |
| No spam | Do not announce repeated animation cycles |
| Not color-alone | Loading state needs motion **or** text/context — not color alone |
| Text | Preserve visible labels where users need context |
| Motion safety | No flashing, rapid contrast thrash, or vestibular-hostile motion |

The animation must not violate motion-sensitivity expectations.

---

## 14. Responsive sizing

Approximate guidance (implementation may refine pixels against tokens):

| Variant | Role | Guidance |
|---|---|---|
| Compact | buttons, inline controls | Legible at small icon size; minimal internal detail |
| Standard | cards, page sections | Comfortable mid size; hand clearly visible |
| Large | full-page loading | Room for mark + **Zamblak** name |

### Scaling rules

- stroke widths scale cleanly with size;
- avoid tiny decorative tick marks that disappear when compact;
- no layout shift when the loader mounts/unmounts (reserve space or replace an equivalent region);
- wordmark appears only on large/full-page contexts.

---

## 15. Usage rules

### Use the branded loader when

- the product is loading a **meaningful** application surface;
- a short wait needs visible system feedback;
- identity reinforcement helps without delaying interaction.

### Do not use it

- as decoration when nothing is loading;
- on every tiny network request;
- to hide avoidable performance delays;
- where a **skeleton** is more informative;
- simultaneously with multiple competing spinners on the same surface.

Loading strategy remains **contextual**.

---

## 16. Skeleton versus branded-loader guidance

| Situation | Preferred pattern |
|---|---|
| Content layout loading (lists, detail shells) | **Skeleton** (existing Companies/Projects patterns) |
| Bounded action (save, submit, refresh) | **Compact** branded mark |
| Major transition / full-page wait | **Full-page** branded loader (when appropriate) |
| Reduced motion | Static mark + text context |

The branded loader **complements** skeletons; it does **not** automatically replace all of them.

---

## 17. Performance requirements

Future implementation must:

- avoid layout shift;
- avoid unnecessary client JavaScript;
- use **transform-based** motion (rotation) rather than expensive layout properties;
- avoid continuous animation after loading completes;
- render **without** external network requests for the mark;
- remain lightweight on mobile devices;
- prefer CSS animation over animation libraries unless a later task explicitly proves a need.

---

## 18. Technical implementation direction

**Preferred stack**

| Choice | Direction |
|---|---|
| Graphic | Inline **SVG** |
| Motion | **CSS** animation / keyframes |
| Color | `currentColor` and/or semantic design tokens |
| Packaging | Reusable **React** component(s) |
| Sizing | props or CSS size variants (compact / standard / large) |

**Avoid unless later approved**

- GIF;
- video;
- canvas (unless proven necessary);
- remote asset URLs;
- third-party animation libraries by default.

**Benefits to preserve**

- sharp rendering at every size;
- low payload;
- easy color adaptation;
- light/dark compatibility;
- accessibility control;
- reusable sizing.

**Implementation inspection surface** (for `ZAM-BRAND-LOADING-MARK-IMPLEMENT-1` only):

- existing `loading.tsx` files;
- Companies and Projects skeleton patterns;
- dashboard shell;
- design tokens;
- reduced-motion conventions;
- shared UI component architecture.

---

## 19. Out of scope (this task)

- React components, SVG files under `public/` or `src/`, CSS animation source;
- route or dashboard shell wiring;
- replacing every existing spinner/skeleton;
- slogans, marketing campaigns, or expanded family biography;
- downloading or committing external reference art;
- SQL, migrations, package changes, tests, or browser smoke;
- production-readiness claims.

---

## 20. Acceptance criteria (design freeze)

This design freeze is complete when:

1. Brand origin story is recorded accurately and without invented detail.
2. Primary stopwatch concept is specified (circle, seconds hand, pivot, minimal marks).
3. Optional Z integration is documented as optional and non-blocking.
4. Color contract requires Zamblak tokens / `currentColor` — not reference orange/black.
5. Animation sequence includes rotation + small spring rebound + pause + repeat.
6. Cycle duration is approximately **0.9–1.2 s**.
7. Full-page, compact, and static/reduced-motion variants are defined.
8. Accessibility and `prefers-reduced-motion` are specified.
9. Skeleton vs branded-loader usage is clear.
10. Performance and technical direction prefer inline SVG + CSS.
11. Originality restrictions forbid copying external commercial art.
12. Implementation is explicitly **future work**.
13. Next product feature task remains **`ZAM-PROJECTS-CREATE-PAGE-1`**.

---

## 21. Future implementation task

**`ZAM-BRAND-LOADING-MARK-IMPLEMENT-1`**

Implement the reusable branded loading mark and wire it only where authorized by a later task scope. That task must **not** expand into unrelated domain feature work unless explicitly authorized.

Do **not** treat this design document as runtime evidence of an implemented component.

---

## 22. Exact next product task

**`ZAM-PROJECTS-CREATE-PAGE-1`**

Continue the Projects MVP UI sequence (create page) after the completed list page. Brand loading implementation remains a separate future task and must not block or replace Projects create work unless product prioritization changes under a new authorized task.

---

## Explicit non-claims

- Branded loading mark is **not implemented** in application source.
- No SVG asset, CSS animation module, or shared loader component is delivered by this task.
- No browser/manual smoke was performed for the mark.
- Production readiness is **not** claimed.
- Projects create/detail/edit pages are **not** claimed complete by this document.
