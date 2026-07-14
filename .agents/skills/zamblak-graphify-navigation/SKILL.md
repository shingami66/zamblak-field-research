---
name: zamblak-graphify-navigation
description: Repository-local Graphify navigation protocol. Query-first symbol/node navigation, source verification, targeted grep fallback, freshness classification, ignored graphify-out lifecycle, and explicit post-commit refresh before push. Graphify is navigation-only and never source authority.
---

# Zamblak Graphify Navigation

## Purpose

Graphify is repository **navigation and impact-discovery assistance** only.

It supports:

- symbol, node, and index navigation;
- dependency and impact tracing;
- token-efficient discovery of candidate files.

Graphify is **not**:

- a source of truth;
- a replacement for source inspection;
- a replacement for Git state, migrations, schema evidence, or canonical docs;
- authority for product, security, privacy, or runtime claims.

Every material conclusion must be verified against current repository source (and migrations or docs when those surfaces are in scope).

## When to use

Use this skill for:

- implementation planning;
- source review;
- dependency and impact tracing;
- locating symbols, functions, components, routes, database surfaces, and related files;
- precommit scope review;
- post-commit index refresh verification (after an authorized successful commit, before push).

Do **not** require Graphify for a task that only operates on exact known files and gains no navigation benefit, unless the task explicitly requires Graphify evidence.

## Authority order

Always respect this order:

1. `AGENTS.md` and selected project skills
2. Current Git state
3. Canonical source and migrations
4. Canonical project documentation
5. Graphify indexes and symbol graph
6. Targeted `grep` / `rg` fallback

Graphify must never override source truth, Git evidence, or higher authorities.

## Executable and commands

Primary refresh command (run from the repository root):

```text
graphify update .
```

If `graphify` is not available on `PATH`, use the verified absolute fallback only when that path exists:

```text
C:\Users\Mozfer\.local\bin\graphify.exe update .
```

Do not invent metadata formats beyond what the tool and existing output provide.
Do not create Git hooks. Refresh remains an **explicit workflow step**.
Do not install Graphify.

## Generated-output lifecycle (Policy A)

### Canonical output location

- The verified default repository-local Graphify output directory is:
  `graphify-out/`
- The primary index path is expected at:
  `graphify-out/graph.json`
- Additional Graphify-generated files under `graphify-out/` (for example reports or HTML) are generated navigation artifacts only.
- Do **not** assume files outside `graphify-out/` are Graphify output.

### Ignore requirement

Repository Git policy (`.gitignore`) must ignore:

```text
graphify-out/
```

**Before every authorized refresh**, require:

```text
git check-ignore -v "graphify-out/graph.json"
```

**HOLD before refresh** if:

- the path is not ignored;
- the ignore source is missing or unexpected (must resolve to the repository `.gitignore` `graphify-out/` rule);
- Graphify is configured to write outside `graphify-out/` without a separately reviewed policy.

### Expected generated output

Ignored files under:

```text
graphify-out/**
```

are **expected** generated Graphify navigation output and do **not** violate the clean-tree requirement for refresh/push gates.

They must:

- never be staged;
- never be committed;
- never be included in commit manifests;
- never be treated as source authority;
- remain available locally for Graphify navigation.

Do **not** require deletion of `graphify-out/` after refresh.

### Clean-tree definition

**Before refresh:**

- tracked files must be clean;
- staged files must be empty;
- non-ignored untracked files must be absent;
- an existing **ignored** `graphify-out/` directory is allowed.

**After refresh:**

- tracked files must remain clean;
- staged files must remain empty;
- non-ignored untracked files must remain absent;
- changes confined to ignored `graphify-out/**` are allowed and expected.

### Post-refresh verification

After `graphify update .`, require:

```text
git status -sb
git status --short --untracked-files=all
git diff --name-only
git diff --cached --name-only
git status --ignored --short -- graphify-out
git check-ignore -v "graphify-out/graph.json"
```

Expected result:

- no tracked modification;
- no staged file;
- no non-ignored untracked file;
- `graphify-out` appears only as ignored output;
- no Graphify artifact exists outside `graphify-out/`.

**HOLD** if any generated file appears outside the ignored canonical path.

### Freshness evidence

Do **not** claim **FRESH** solely because the refresh exit code is zero.

Require:

- record the exact Git HEAD before refresh (`git rev-parse HEAD`);
- run refresh only after the authorized commit succeeds;
- record refresh exit code and relevant output;
- inspect Graphify metadata for an indexed commit SHA when available.

| Classification | Meaning |
|---|---|
| **FRESH** | Reliable Graphify metadata **explicitly** matches the current HEAD |
| **UNKNOWN** | Refresh succeeded at the recorded current HEAD, but Graphify provides no reliable indexed-HEAD metadata |
| **STALE** | Reliable metadata identifies an earlier commit |

A successful refresh with **UNKNOWN** metadata may proceed to push with a **nonblocking warning** only when:

- exit code is zero;
- refresh ran after the exact authorized commit;
- tracked and non-ignored repository state remained clean;
- Graphify output stayed entirely inside ignored `graphify-out/**`;
- source verification remains mandatory.

Do **not** falsely label UNKNOWN as FRESH.

### Push gate

Before push, require:

- ignore rule verified for `graphify-out/graph.json`;
- refresh command succeeded (exit 0);
- ignored-output checks passed;
- no tracked, staged, or non-ignored untracked changes exist;
- Graphify freshness is **FRESH**, or **UNKNOWN** with the bounded warning conditions above;
- **STALE** is **HOLD** when a post-commit refresh was required for the push.

This definition eliminates the refresh → non-ignored untracked files → push deadlock.

### Failure rules (generated output)

**HOLD** when:

- `graphify-out` is not ignored;
- refresh creates output outside `graphify-out/`;
- tracked files change;
- staged files appear;
- non-ignored untracked files appear;
- refresh fails;
- metadata proves the graph is **STALE** after a required post-commit refresh;
- Graphify output conflicts with current source.

Do **not** HOLD merely because ignored `graphify-out/**` exists.

## Query-first navigation

When using Graphify:

1. Record current `HEAD` (`git rev-parse HEAD`).
2. Inspect Graphify index freshness when metadata supports it (FRESH / STALE / UNKNOWN).
3. Start with the **smallest relevant** node or symbol.
4. Follow symbol relationships to mapped files.
5. Open only the mapped source surfaces needed.
6. Verify every important conclusion against current source.
7. Avoid broad repository reads when the graph already identifies candidate files.

## Targeted grep fallback

When a node, edge, or symbol is missing or stale:

1. Derive exact search terms from known Graphify symbols or task identifiers.
2. Restrict `grep` / `rg` to mapped directories or likely file types.
3. Search exact symbol names before semantic phrases.
4. Expand scope only when the bounded search fails.
5. Report why fallback was needed.

Do **not** use blind whole-repository scanning as the default.

## Freshness classification (navigation use)

| State | Meaning | Behavior |
|---|---|---|
| **FRESH** | Graph/index metadata corresponds to current HEAD | Use Graphify normally as navigation |
| **STALE** | Graph/index metadata corresponds to an earlier commit | Use only as a candidate map; verify with targeted grep and source |
| **UNKNOWN** | No reliable indexed-HEAD metadata exists | Treat all symbol results as hints; verify directly |

Do not claim HEAD alignment without evidence.

## Post-commit refresh policy

After every **authorized successful commit**, and **before push**:

1. Confirm the commit succeeded.
2. Confirm clean-tree preconditions (tracked clean; staged empty; no non-ignored untracked files; ignored `graphify-out/` allowed).
3. Verify ignore: `git check-ignore -v "graphify-out/graph.json"` (HOLD if not ignored by `.gitignore`).
4. Record current HEAD SHA to be indexed.
5. Run `graphify update .` (or absolute executable fallback if needed).
6. Record exit code and relevant output.
7. Run post-refresh verification (status, diffs, ignored `graphify-out`, check-ignore).
8. Classify freshness: FRESH / UNKNOWN / STALE using metadata evidence (never invent FRESH).
9. Do **not** stage or commit ignored Graphify output.
10. Do **not** push until the push gate passes (or explicit WARN/HOLD per task rules for UNKNOWN).

Do **not** install Graphify.
Do **not** create automatic Git hooks.

## Read-only task policy

For read-only review and verification:

- do not refresh unless explicitly authorized;
- use the existing index;
- report FRESH, STALE, or UNKNOWN;
- use targeted grep and source verification when stale or unknown;
- never mutate repository state.

## Dirty-tree policy

Do not refresh Graphify while unrelated or unreviewed changes exist (tracked modifications, staged files, or non-ignored untracked files).

A docs or implementation task may use an existing graph while the tree is dirty, but must **not** claim the graph includes those uncommitted changes.

Ignored `graphify-out/**` alone does **not** make the tree “dirty” for Graphify refresh purposes.

## Failure and HOLD rules

**HOLD** when:

- a task requires a fresh graph and freshness cannot be established **and** targeted source verification is insufficient for the claims;
- `graphify-out` is not ignored before a required refresh;
- refresh creates tracked, staged, non-ignored untracked files, or output outside `graphify-out/`;
- refresh fails and the task requires a successful refresh;
- post-commit refresh is required and metadata proves **STALE**;
- Graphify results conflict with current source or Git evidence.

Do **not** HOLD merely because:

- ignored `graphify-out/**` exists;
- Graphify is STALE when targeted source verification can safely complete the task and freshness was not mandatory;
- freshness is UNKNOWN after a successful post-commit refresh that meets the push-gate warning conditions.

## Required reporting

Every task that uses Graphify must report:

```text
Graphify:
- Skill: zamblak-graphify-navigation
- Executable:
- Refresh command:
- Canonical output location:
- Ignore rule verified:
- Ignore rule source:
- Output/index location:
- Indexed HEAD:
- Indexed HEAD metadata available:
- Freshness: FRESH | STALE | UNKNOWN
- Nodes/symbols consulted:
- Symbol-to-file mappings used:
- Targeted grep fallback: YES | NO
- Source verification:
- Refresh performed: YES | NO
- Refresh exit code:
- Generated files confined to canonical output:
- Non-ignored files created:
- Repository files created:
- Push gate:
- Verdict:
```

## Token-efficiency rules

- Smallest relevant graph traversal only.
- No repeated opening of already inspected files.
- Bounded symbol-based grep.
- No broad scans without a documented reason.
- Concise reporting of consulted symbols and paths.
