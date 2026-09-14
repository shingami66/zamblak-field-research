---
name: zamblak-nextjs-framework-engineering
description: Next.js framework mechanics and App Router conventions for Zamblak. Governs Server vs Client components, Server Actions, Route Handlers, streaming, and version-matched Next.js 16 APIs under AGENTS.md.
---

# Zamblak Next.js Framework Engineering

## Purpose & Scope
This skill provides framework engineering guidance for Next.js App Router applications in Zamblak. It establishes standards for component composition, data flow, server actions, route handlers, and request-lifecycle mechanics.

### Framework Version Baseline
- **Installed Repository Baseline:** Next.js `16.2.10` with React `19.2.4`.
- **Mandatory Pre-Check:** Always verify installed dependencies in `package.json` before relying on version-specific APIs or behavioral assumptions.
- **Authority Boundary:** Owns Next.js framework mechanics and patterns only. Does not make product decisions, database migrations, or performance assertions without evidence.

---

## 1. Next.js 15/16 Asynchronous Request APIs

In Next.js 15+ and 16, request-specific properties and headers are asynchronous:
- **Cookies & Headers:**
  ```typescript
  import { cookies, headers } from 'next/headers';

  // Mandatory: await cookies() and headers()
  const cookieStore = await cookies();
  const headerList = await headers();
  ```
- **Page & Layout Props (`params` and `searchParams`):**
  In Next.js 15 and 16 App Router, `params` and `searchParams` are passed as Promises and must be awaited:
  ```typescript
  interface PageProps {
    params: Promise<{ formId: string }>;
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
  }

  export default async function FormPage({ params, searchParams }: PageProps) {
    const { formId } = await params;
    const query = await searchParams;
    // ...
  }
  ```

---

## 2. Server Components vs Client Components

### Server Components (Default)
- Keep components as Server Components by default.
- Advantages: Zero client bundle overhead, direct access to server data sources, secure execution environment for tokens and business logic.
- Best Practices:
  - Fetch data high in the tree and pass plain serializable JSON props down.
  - Wrap slow or external data fetches in `<Suspense fallback={<LoadingSkeleton />}>`.
  - Colocate `loading.tsx` and `error.tsx` at route segment boundaries for resilient degradation.

### Client Components (`"use client"`)
- Place `"use client"` at the boundary only where client interactivity is required:
  - Browser event listeners (`onClick`, `onChange`, `onSubmit`).
  - React hooks (`useState`, `useEffect`, `useReducer`, `useRef`, custom hooks).
  - Browser-only APIs (e.g. geolocation, audio/video recording, web storage).
- Push client components to the leaves of the render tree to minimize client bundle size.
- Passing Server Components into Client Components: Use the `children` composition pattern to avoid forcing child server components into client rendering.

---

## 3. Server Actions & Mutations

- **Directive:** Mark mutation functions with `"use server"` (either top-of-file for dedicated action files or top-of-function in server modules).
- **Security & Authorization:**
  - Every Server Action must independently verify authentication (`await supabase.auth.getUser()`) and tenant boundary (`account_id`).
  - Never trust client-supplied user IDs or role assertions.
- **Input Validation:**
  - Validate all arguments using Zod schemas before executing business logic.
  - Return typed result objects rather than throwing unhandled exceptions:
    ```typescript
    export type ActionResponse<T> =
      | { success: true; data: T }
      | { success: false; error: string; fieldErrors?: Record<string, string[]> };
    ```
- **Revalidation:**
  - Use `revalidatePath('/forms/[formId]', 'page')` or `revalidateTag('tag-name')` upon successful mutation to update cached server views.

---

## 4. Route Handlers (`app/api/**/route.ts`)

- Implement Web standard Request / Response handlers: `export async function GET(request: Request) { ... }`.
- Validate incoming HTTP headers, body schemas, and authentication cookies.
- Set explicit HTTP status codes and cache-control headers where applicable.
- Handle unexpected errors with structured JSON responses and user-safe error messages.

---

## 5. Streaming, Suspense & Error Boundaries

- **Progressive Streaming:** Use `<Suspense>` to stream slow components asynchronously without blocking initial page shell rendering (TTFB).
- **Route Error Boundaries (`error.tsx`):**
  - Must be a Client Component (`"use client"`).
  - Must accept `error: Error & { digest?: string }` and `reset: () => void`.
  - Provide meaningful feedback in Arabic for field researchers with a retry action.
- **Not Found (`not-found.tsx`):**
  - Triggered via `notFound()` from `next/navigation`.
  - Displays clear contextual message when an account, project, or form does not exist.
