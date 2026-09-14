---
name: zamblak-nextjs-performance-engineering
description: Evidence-first performance engineering protocol for Zamblak Next.js and Supabase applications. Enforces symptom measurement, bottleneck layer identification, before/after benchmarking, and targeted optimization under AGENTS.md.
---

# Zamblak Next.js Performance Engineering

## Purpose & Scope
This skill provides an **evidence-first** methodology for diagnosing, measuring, and optimizing performance bottlenecks in Zamblak web applications. It prevents speculative optimizations, premature memoization, and unvalidated architectural changes.

### Core Cardinal Rule
**Never claim a performance improvement without concrete before-and-after evidence.**
Avoid speculative caching, indiscriminate `useMemo`/`useCallback` additions, unmeasured index additions, or dynamic/static rendering conversions without measured proof of a bottleneck.

---

## 1. Six-Step Evidence-First Optimization Lifecycle

Every performance task must strictly progress through these 6 steps:

1. **Identify the Measured Symptom:**
   - Establish the observable problem (e.g., slow Time to First Byte (TTFB), poor Largest Contentful Paint (LCP), sluggish UI typing, slow API response time, or excessive database query duration).
2. **Determine the Responsible Architectural Layer:**
   - Pinpoint the exact layer causing the delay:
     - **React Rendering:** Excessive re-renders, expensive client computations, missing virtualization on large lists.
     - **Next.js Rendering & Streaming:** Sequential waterfall fetches in Server Components, missing Suspense boundaries blocking TTFB.
     - **Network & Data Payloads:** Oversized JSON responses (`select *`), unnecessary repetitive network requests.
     - **Supabase / PostgreSQL:** Slow database queries, unindexed scans, unpaginated results, lock contention.
     - **Client Bundle Size:** Large third-party libraries bundled into client components, missing dynamic imports.
     - **Asset Delivery:** Unoptimized images, blocking web fonts, missing responsive breakpoints.
3. **Inspect Evidence Before Prescribing Optimizations:**
   - Gather concrete metrics (e.g., Chrome DevTools performance traces, Next.js build bundle analyzer, network timing waterfalls, or PostgreSQL execution timings).
4. **Formulate Minimal Targeted Hypothesis:**
   - Propose the smallest targeted change that addresses the measured bottleneck.
5. **Implement Bounded Optimization:**
   - Apply the fix strictly within authorized task boundaries.
6. **Revalidate with Before/After Metrics:**
   - Measure the exact same benchmark under comparable conditions and record the concrete before vs. after metrics.

---

## 2. Layer-Specific Diagnostics & Guidance

### React Client Layer
- **Common Anti-Patterns:**
  - Putting heavy state at high root levels causing subtree re-render cascades.
  - Adding `useMemo` or `useCallback` to trivial arithmetic or string operations (increases GC and code overhead without measurable benefit).
- **Targeted Solutions:**
  - Push state down to leaf components where user interaction occurs.
  - Apply `React.memo` or memoization only to computationally expensive subtrees that re-render frequently with identical props.
  - Use list virtualization for large respondent or participation lists.

### Next.js Server & Streaming Layer
- **Common Anti-Patterns:**
  - Sequential `await` waterfalls for independent data queries in Server Components:
    ```typescript
    // BAD: Sequential Waterfall
    const project = await fetchProject(id);
    const respondents = await fetchRespondents(id);
    ```
- **Targeted Solutions:**
  - Parallelize independent server fetches using `Promise.all`:
    ```typescript
    // GOOD: Parallel Execution
    const [project, respondents] = await Promise.all([
      fetchProject(id),
      fetchRespondents(id),
    ]);
    ```
  - Defer non-critical or slow components behind `<Suspense fallback={<Skeleton />}>` so the main page shell streams immediately to field devices.

### Data & Payload Layer
- **Common Anti-Patterns:**
  - Using `.select('*')` on large tables with wide columns or JSONB survey responses.
  - Querying thousands of unpaginated historical records.
- **Targeted Solutions:**
  - Select only essential display columns in initial queries.
  - Implement bounded pagination (`.range(0, 24)`).

### Bundle Size & Asset Layer
- **Common Anti-Patterns:**
  - Importing large packages (e.g. date formatting, charting, PDF generators) into Client Components.
- **Targeted Solutions:**
  - Move heavy data transformations to Server Components.
  - Use `next/dynamic` with `ssr: false` for client-only modals or heavy interactive widgets.

---

## 3. Cross-Skill Routing

When performance investigation reveals the primary bottleneck:
- **Next.js Framework Mechanics:** Route `zamblak-nextjs-framework-engineering` for component architecture, App Router boundaries, and streaming setups.
- **Database Query & Index Shape:** Route `zamblak-postgres-query-index-guidance` for query optimization, join structure, and index analysis.
- **Schema & Migration Work:** If an optimization requires adding an index or altering a table, hand off to `zamblak-db-rls-migration-guard` under a separate authorized migration task.
