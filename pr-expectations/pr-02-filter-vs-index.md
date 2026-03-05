# PR #2 - .filter() vs Index (Convex Query Anti-pattern)

## Branch

`mikec/pr-02-filter-vs-index-v3`

## Cover Story

New `convex/reporting.ts` module with a single `internalQuery` for use via the Convex Dashboard.
`getActivityForUser` returns recent activity for a specific user within a project.

## What We Are Testing

Whether tools catch the use of `.filter()` where a database index should be used instead.
In Convex, `.filter()` performs a full table scan and discards non-matches in memory.
Using `.withIndex()` is the correct approach and avoids scanning irrelevant rows entirely.
The codebase rules file explicitly says: "Do NOT use filter in queries."

## The Anti-pattern

- The query uses NO index at all, filtering both `projectId` and `userId` via `.filter()`
- This causes a full scan of the entire `activityLog` table
- The `activityLog` table already has a `by_projectId` index that could narrow the scan
- The correct fix: use `.withIndex("by_projectId")` at minimum, or add a compound `by_projectId_and_userId` index

## What a Tool Should Say (true positives)

- "Use .withIndex() instead of .filter()"
- "A by_projectId index already exists on activityLog, use it"
- "This .filter() will cause a full table scan"
- "Add a compound index for projectId + userId for best performance"
- Any reference to the Convex rules file that prohibits .filter() usage

## What a Tool Should NOT Say (false positives)

- N+1 concerns about the enrichment loop (bounded by take(50), same reasoning as PR #1)
- Suggesting SQL-style JOINs or WHERE clauses
- Flagging anything about auth (it's an internal query, no auth needed)

## Scoring

- Catches .filter() anti-pattern and suggests index usage = Pass
- Points to the existing by_projectId index in the schema = Bonus (schema awareness)
- Suggests adding a compound index = Bonus (deep understanding)
- Misses .filter() entirely = Fail
- Flags .filter() but with wrong reasoning (e.g. "use WHERE clause") = Mixed

---

## Results

PR: https://github.com/mikecann/cya-playground/pull/12

| Tool | Responded | Primary Finding | Verdict | Evidence |
| --- | --- | --- | --- | --- |
| CodeRabbit | Yes | .filter() without index causes full scan; suggested composite index + withIndex() | ✅ Pass | Inline on reporting.ts:13-21, ran scripts to check schema, provided both schema fix and query fix with committable suggestion |
| Greptile | Yes | Full table scan, breaks codebase pattern; suggested existing index + compound index | ✅ Pass | 2 inline comments: one for existing by_projectId, one for compound index. Noted codebase pattern violation |
| Macroscope | Check only | "No issues identified" | ❌ Fail | Check run passed with no code-level findings. Missed the .filter() anti-pattern entirely |
| Cubic | Yes | P1: .filter() without .withIndex() causes full table scan; by_projectId exists | ✅ Pass | Inline on reporting.ts:15, referenced existing index, suggested compound index, noted reactive recomputation impact |
| Graphite | Check only | AI Reviews completed but no review comments | ❌ Fail | Check run passed but produced no inline comments or review feedback |
| Qodo | Yes | Unindexed activityLog scan; suggested compound index and by_projectId fallback | ✅ Pass | Inline on reporting.ts:12-21, labeled Bug + Performance, referenced existing listByProject usage pattern |
| CodeAnt AI | Yes | Vague index mention; primary focus was data leak and access control (both false positives on an internalQuery) | ❌ Fail | Did not flag .filter() or suggest .withIndex(). "Ordering & index" comment mentioned indexing tangentially but without identifying the actual anti-pattern. Also triggered automatic fail by flagging auth/access control on an internal query |
| Sourcery | Yes | Conditionally suggested index on projectId/userId for performance | ⚠️ Mixed | High-level feedback only, no inline comment. Said "if not already indexed" without checking schema or flagging .filter() explicitly |
| Copilot | Yes | Unindexed .filter() scan; suggested compound index or existing by_projectId fallback | ✅ Pass | Inline on reporting.ts:14-20, provided code suggestion replacing .filter() with .withIndex() |

## Takeaway

- **6 out of 9 tools caught the .filter() anti-pattern clearly** (CodeRabbit, Greptile, Cubic, Qodo, Copilot, plus CodeAnt AI partially).
- **Macroscope missed it again**, reporting "No issues identified" for a second consecutive PR. Consistent blind spot.
- **Graphite ran its AI Reviews check but produced zero feedback**, failing silently. A step back from PR #1 where it at least responded (albeit with a false positive).
- **Greptile, Cubic, Qodo, and Copilot stood out** by offering both the compound index solution AND the existing by_projectId fallback.
- **Greptile specifically noted the codebase pattern violation**, pointing out that all other queries use .withIndex().
- **CodeAnt AI and Sourcery were Mixed**: both hinted at index needs but didn't directly flag the .filter() vs .withIndex() anti-pattern. Sourcery's feedback was conditional ("if not already indexed") without actually checking the schema.
- **No tool referenced the Convex rules file** that explicitly prohibits .filter() usage, consistent with PR #1.
- **CodeAnt AI downgraded from ⚠️ Mixed to ❌ Fail** after detailed review: the "Ordering & index" finding never actually identified `.filter()` as the problem, and the tool triggered an automatic fail by flagging auth/access control on an `internalQuery`.

## Detailed Tool Reviews

### CodeRabbit
- [`.filter()` without index causes full table scan; suggested composite index + `withIndex()`](https://github.com/mikecann/cya-playground/pull/12#discussion_r2876322157) ✅ - Correctly identified lines 13-21 use `.filter()` without any index, forcing a full scan of `activityLog`. Noted the existing `by_projectId` index. Suggested adding a compound `by_projectId_and_userId` index and replacing `.filter()` with `.withIndex()`. Provided both schema diff and query diff, plus a committable suggestion. Ran scripts (`fd`, `cat`, `rg`) to inspect the schema before making the recommendation, demonstrating genuine schema awareness. Hits all four true-positive categories.

**Overall verdict:** ✅ Pass
**Table validation:** Agrees

### Greptile
- [Full table scan: query doesn't use `.withIndex()`, codebase pattern violation; suggests existing `by_projectId` index as minimum fix](https://github.com/mikecann/cya-playground/pull/12#discussion_r2876316052) ✅ - Correctly identifies the `.filter()` anti-pattern causing a full table scan. References specific codebase files (`convex/projects.ts:207-208`, `convex/tasks.ts:24-25`) as evidence of the established `.withIndex()` pattern. Provides a concrete code suggestion using the existing `by_projectId` index.
- [Suggests compound index `["projectId", "userId"]` for optimal performance](https://github.com/mikecann/cya-playground/pull/12#discussion_r2876316120) ✅ - Recommends adding a compound index and provides the exact `.withIndex("by_projectId_and_userId")` usage. Cross-references `projectMembers` schema as a pattern to follow.
- [Issue summary: confidence 2/5, flags critical performance issue](https://github.com/mikecann/cya-playground/pull/12#issuecomment-3988906692) ✅ - High-level summary correctly frames the issue as a performance problem that worsens as data grows. No false positives.

**Overall verdict:** ✅ Pass
**Table validation:** Agrees

### Macroscope
- [Check run reviewed `convex/reporting.ts` and reported "No issues identified (1 code object reviewed)"](https://github.com/mikecann/cya-playground/runs/65512790681) ❌ - Reviewed the file containing the `.filter()` anti-pattern but produced zero findings. The `.filter()` usage causes a full table scan of `activityLog` when a `by_projectId` index already exists.

**Overall verdict:** ❌ Fail
**Table validation:** Agrees

### Cubic
- [P1: `.filter()` without `.withIndex()` causes full table scan on `activityLog`; existing `by_projectId` index should be used; suggested compound index; noted reactive recomputation broadening](https://github.com/mikecann/cya-playground/pull/12#discussion_r2876315298) ✅ - Directly matches the primary test target. Correctly identifies that `.filter()` scans every document, references the existing `by_projectId` index by name, suggests `.withIndex("by_projectId")` for `projectId` equality, and proposes a compound index for full coverage. Adds a Convex-specific insight about reactive recomputations being unnecessarily broad without the index. No false positives.

**Overall verdict:** ✅ Pass
**Table validation:** Agrees

### Graphite
- [AI Reviews check run completed with 0 comments](https://github.com/mikecann/cya-playground/runs/65512852890) ❌ - Check run finished successfully but summary explicitly states "AI review ran and left 0 comments." No inline comments, no PR review, no issue comments. The `.filter()` anti-pattern was completely missed.

**Overall verdict:** ❌ Fail
**Table validation:** Agrees

### Qodo
- [Unindexed activityLog scan, `.filter()` without `withIndex` causes full table scan](https://github.com/mikecann/cya-playground/pull/12#discussion_r2876315990) ✅ - Correctly identifies that `getActivityForUser` queries `activityLog` without `withIndex`, filtering by `projectId` and `userId` via `.filter()`. Notes the existing `by_projectId` index and the `listByProject` pattern as evidence. Suggests both a preferred compound index (`by_projectId_and_userId`) and a fallback using the existing index. Labeled Bug + Performance. No false positives.

**Overall verdict:** ✅ Pass
**Table validation:** Agrees

### CodeAnt AI
- [Possible data leak, suggests sanitizing returned fields](https://github.com/mikecann/cya-playground/pull/12#issuecomment-3988905651) ❌ - False positive. This is an `internalQuery` used only from the Convex Dashboard. Raising PII/data-leak concerns about an internal-only function is noise.
- [Access control, "confirm who can call this"](https://github.com/mikecann/cya-playground/pull/12#issuecomment-3988905651) ❌ - False positive. Directly flags auth/access control on an `internalQuery`. Internal queries in Convex are not exposed to the public API. This is an automatic-fail trigger per the expectations: "Flagging anything about auth."
- [Ordering & index, "ensure an index supports the filter+order"](https://github.com/mikecann/cya-playground/pull/12#issuecomment-3988905651) ⚠️ - Closest thing to catching the `.filter()` anti-pattern, but does NOT explicitly identify `.filter()` as the problem, doesn't suggest `.withIndex()`, doesn't mention the existing `by_projectId` index, and doesn't suggest a compound index. Framed around ordering/sort fields, not the `.filter()` vs `.withIndex()` distinction.
- [Generated API registration concerns](https://github.com/mikecann/cya-playground/pull/12#issuecomment-3988905651) ❌ - False positive. Asks about Convex's auto-generated `api.ts` file, which is standard codegen behavior.

**Overall verdict:** ❌ Fail
**Table validation:** Disagrees - Changed from ⚠️ Mixed to ❌ Fail. The "Ordering & index" finding does not constitute catching the `.filter()` anti-pattern. More critically, the "Access control" finding is an automatic-fail trigger that overrides any partial credit.

### Sourcery
- [Extract the `50` limit into a named constant or argument](https://github.com/mikecann/cya-playground/pull/12#pullrequestreview-3880459800) ⚠️ - Minor code quality nit. Not related to the `.filter()` anti-pattern being tested. Harmless but irrelevant.
- [If the activityLog table isn't already indexed appropriately, you may want an index on projectId/userId](https://github.com/mikecann/cya-playground/pull/12#pullrequestreview-3880459800) ⚠️ - Directionally correct but never identifies `.filter()` as the problem, never says to use `.withIndex()`, and hedges with "if not already indexed" without checking the schema (which already has a `by_projectId` index). A developer reading this wouldn't know the query code itself needs changing.

**Overall verdict:** ⚠️ Mixed
**Table validation:** Agrees - The ⚠️ Mixed rating is on the generous end (strict reading would be ❌ Fail since `.filter()` was never mentioned), but defensible given the general indexing suggestion.

### Copilot
- [Unindexed `.filter()` causes full table scan; suggests compound index `by_projectId_and_userId` or existing `by_projectId` fallback, with code suggestion replacing `.filter()` with `.withIndex()`](https://github.com/mikecann/cya-playground/pull/12#discussion_r2876318069) ✅ - Correctly identifies the core anti-pattern: `.query("activityLog")` followed by `.filter()` on `projectId` and `userId` results in a full table scan. Suggests adding a compound index and using `.withIndex()`, notes the existing `by_projectId` index as a minimum fallback. Provides an inline code suggestion with the fix. No false positives.

**Overall verdict:** ✅ Pass
**Table validation:** Agrees

## Scores

| Tool       | Primary | Bonus | Bonus Reason                                                                       | Score |
| ---------- | ------- | -------- | ------------------------------------------------------------------------------------- | ----- |
| CodeRabbit | ✅ (3)  | 0        | Clean pass, no extras                                                                 | 3     |
| Greptile   | ✅ (3)  | 0        | Clean pass, codebase pattern note extends primary finding                             | 3     |
| Macroscope | ❌ (0)  | 0        | No findings at all                                                                    | 0     |
| Cubic      | ✅ (3)  | 0        | Reactive recomputation insight extends primary finding, not a separate secondary       | 3     |
| Graphite   | ❌ (0)  | 0        | No findings at all                                                                    | 0     |
| Qodo       | ✅ (3)  | 0        | Clean pass, no extras                                                                 | 3     |
| CodeAnt AI | ❌ (0)  | -1       | Auth/access control and data leak false positives on internalQuery; API registration FP | -1    |
| Sourcery   | ⚠️ (1)  | 0        | Magic number nit too minor for bonus; no significant false positives beyond primary    | 1     |
| Copilot    | ✅ (3)  | 0        | Clean pass, no extras                                                                 | 3     |
