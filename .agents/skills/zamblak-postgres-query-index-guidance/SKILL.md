---
name: zamblak-postgres-query-index-guidance
description: Advisory PostgreSQL query and index optimization guidance for Zamblak. Governs query shaping, index design reasoning, selectivity analysis, write amplification tradeoffs, and tenant-aware indexing under AGENTS.md.
---

# Zamblak PostgreSQL Query & Index Guidance

## Purpose & Scope
This skill provides advisory engineering principles for analyzing SQL queries, evaluating index designs, and diagnosing database performance in Zamblak.

### Authority Boundaries & Strict Limitations
- **Advisory & Analytical Only:** This skill analyzes queries and suggests index strategies.
- **NO Migration Authority:** This skill does **NOT** authorize creating or editing migration files (`supabase/migrations/**`).
- **NO Schema Mutation Authority:** This skill cannot execute `CREATE INDEX`, `DROP INDEX`, or alter tables.
- **Handoff Requirement:** When query analysis demonstrates that a new index or schema modification is required, hand off the recommendation to `zamblak-db-rls-migration-guard` under a separately authorized task.

---

## 1. Tenant-Aware Querying & Composite Index Design

### Mandatory Tenant Boundary (`account_id`)
- Zamblak enforces multi-tenancy via `account_id`.
- Queries almost always filter by `account_id` (either explicitly in application queries or implicitly via RLS policies).
- **Index Column Ordering Rule:**
  - Composite indexes must generally lead with `account_id` (e.g. `(account_id, project_id, created_at)`).
  - Putting `account_id` first ensures queries immediately narrow execution to the tenant partition, avoiding cross-tenant table or index scans.

---

## 2. Index Suitability, Selectivity & Types

### B-Tree Indexes (Default)
- Suitable for equality (`=`), range (`<`, `<=`, `>`, `>=`), and `IN` queries.
- Column ordering in composite B-tree indexes:
  1. Equality columns first (highest filtering selectivity).
  2. Range / Inequality columns next.
  3. Ordering / Sort columns (`ORDER BY`) last to avoid separate in-memory sorting.

### Partial Indexes
- Indexes that include a `WHERE` clause:
  - Example: Soft-delete filtering (`CREATE INDEX ... WHERE deleted_at IS NULL;`).
  - Example: Active state filtering (`CREATE INDEX ... WHERE status = 'accepted';`).
- Benefits: Drastically reduces index size, keeps index pages in buffer pool cache, and reduces write amplification on inactive/deleted rows.

### Cardinality & Selectivity Reasoning
- High-Cardinality Columns (e.g., UUIDs, timestamps, unique identifiers): Excellent candidates for indexing.
- Low-Cardinality Columns (e.g., boolean flags, 3-value enum status): Rarely beneficial on their own; only useful as trailing columns in composite indexes or inside partial index `WHERE` predicates.

---

## 3. Query Shape & Pagination Analysis

### Unbounded Reads vs Bounded Queries
- Queries must always specify an explicit `LIMIT`.
- Avoid unbounded `.select('*')` without limits or range boundaries.

### Keyset (Cursor) vs Offset Pagination
- **Offset Pagination (`OFFSET 1000 LIMIT 25`):**
  - Causes PostgreSQL to scan and discard 1000 rows before returning 25. Degrades linearly as offset increases.
- **Keyset Pagination (`WHERE created_at < $cursor ORDER BY created_at DESC LIMIT 25`):**
  - Leverages index seeks directly to the target cursor position. O(1) performance regardless of pagination depth.
  - Highly recommended for respondent registries, audit logs, and participation feeds.

---

## 4. Write Amplification & Maintenance Tradeoffs

- Every index added to a table imposes a direct cost:
  - **Write Penalty:** Every `INSERT` and `DELETE` must update every index on the table.
  - **HOT Updates (Heap-Only Tuples):** `UPDATE` operations can only use HOT optimization if no indexed columns are modified. Over-indexing eliminates HOT updates and increases table bloat.
  - **Memory & Storage:** Indexes consume shared buffer cache space that could otherwise cache table pages.
- **Rule:** Do not add speculative indexes. Add an index only when query-plan evidence demonstrates sequential scans on growing tables.

---

## 5. Query Plan Evidence (`EXPLAIN`)

When analyzing queries with query-plan output:
- Look for `Seq Scan` on tables with >1,000 rows where an index could provide an `Index Scan` or `Index Only Scan`.
- Check for high `Buffers: shared hit=... read=...` indicating large I/O read volumes.
- Check for `Sort Method: external merge Disk` indicating insufficient `work_mem` or missing index for `ORDER BY`.
- Verify filter conditions match index leading columns.
