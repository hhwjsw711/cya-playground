# PR #09 - OCC Conflict on Hot Path

## Category
Performance / Concurrency

## Feature
"Platform stats" - Adds a global mutation counter. A single `platformStats` document tracks `totalMutations`, incremented by every mutation across the entire app (tasks, comments, projects, labels, members, users). The dashboard displays the running total.

## Intentional Issue
Every single mutation in the app does a read-modify-write on the same singleton document: read the current count, increment it, write it back. This is a textbook OCC (Optimistic Concurrency Control) hotspot. Under any concurrent load, all mutations contend on this one document, causing retries and potential failures.

In Convex, when two mutations read and write to the same document concurrently, one will be retried. A global singleton that every mutation touches is the worst possible write contention pattern. The correct approach would be sharded counters, an aggregate component, or simply not tracking this metric at the mutation level.

## What a tool SHOULD flag
- All mutations writing to the same singleton document creates extreme write contention
- Concurrent mutations will cause OCC conflicts and retries
- The read-modify-write pattern on a shared counter is a classic concurrency anti-pattern
- Suggestion to use sharded counters, aggregates, or a different tracking mechanism

## What a tool should NOT flag (false positives)
- The counter concept itself is fine
- The UI display is standard
- The schema change to add the table is correct

## Scoring
- Pass: Identifies the OCC / write contention / concurrency risk on the shared singleton document
- Mixed: Mentions "concurrent" or "contention" or "bottleneck" concerns without specifically tying it to the singleton document pattern
- Fail: Misses the issue entirely, or only flags unrelated concerns


## Results

PR: [https://github.com/mikecann/cya-playground/pull/23](https://github.com/mikecann/cya-playground/pull/23)


| Tool       | Responded | Primary Finding                                                                               | Verdict    | Evidence                                                                                                                                           |
| ---------- | --------- | --------------------------------------------------------------------------------------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| CodeRabbit | Yes       | OCC contention: singleton platformStats document causes retries under concurrent load          | ✅ Pass    | Nitpick on platformStats.ts:11-19 explicitly names "OCC retries" on "the same singleton document" as a bottleneck. Reinforced in comments.ts:77. Suggests sharding or scheduled aggregation |
| Greptile   | Yes       | "Database hotspot, every mutation updates the same single row, causing transaction contention" | ✅ Pass    | Inline on platformStats.ts:20. Explicitly mentions serialization, retries, and performance bottleneck at scale                                     |
| Macroscope | Yes       | False positive about db.patch API, BUT also identified OCC contention in secondary findings   | ⚠️ Mixed   | Primary finding on platformStats.ts:11 was wrong API signature. Secondary on labels.ts:47 explicitly names "Convex's optimistic concurrency control model" and "serial execution and high retry rates" |
| Cubic      | Yes       | Hot document / OCC contention, researched Convex docs to confirm anti-pattern                 | ✅ Pass    | Inline on platformStats.ts:11, confidence 9. Searched for "Convex OCC contention hot document counter pattern". Suggests sharded counters           |
| Graphite   | Yes       | No comments                                                                                   | ❌ Fail    | Zero comments for the 10th consecutive PR                                                                                                          |
| Qodo       | Yes       | Two bugs: singleton race on first insert AND "Global counter write hotspot"                   | ✅ Pass    | Inline on platformStats.ts:19 and tasks.ts:137. Bug #2 explicitly says "serialize/retry writes and cause latency spikes or reduced throughput"     |
| CodeAnt AI | Yes       | Race condition on concurrent initial insert (TOCTOU)                                          | ⚠️ Mixed   | Inline on platformStats.ts:19. Identified concurrency issue but focused on the insert race, not the ongoing hot document contention                 |
| Sourcery   | Yes       | "Read-modify-write can lose increments under concurrent mutations"                            | ⚠️ Mixed   | Review-level feedback. Sees concurrency problem but frames it as data loss rather than as a performance/contention bottleneck                       |
| Copilot    | Yes       | "Hot-spot document, increasing contention/retries, slowing unrelated mutations"               | ✅ Pass    | Inline on platformStats.ts:18. Suggests sharded counter or background job. Clear identification of the bottleneck                                  |


## Takeaway

- **5 out of 9 tools clearly identified the OCC / write contention issue** (CodeRabbit, Greptile, Cubic, Qodo, Copilot). 3 more partially identified concurrency concerns (Macroscope, CodeAnt AI, Sourcery). Only Graphite missed entirely.
- **Making the pattern more extreme worked.** The previous attempt (per-project lastActiveAt, PR #21) scored 0/9. This version (global singleton counter across all 14 mutations) scored 5/9 with 3 more mixed. The more obvious the anti-pattern, the more tools can detect it.
- **Greptile's biggest win.** After consistently missing issues or giving false confidence scores, Greptile nailed this one with a clear, specific description of the hotspot problem. A significant improvement.
- **Cubic was the most thorough**, actively searching for "Convex OCC contention hot document counter pattern best practice" and finding documentation confirming the anti-pattern. This is the gold standard for tool behavior.
- **Macroscope repeated its false positive** about the `ctx.db.patch` API signature (same as PR #21) but this time ALSO identified the real OCC issue in secondary findings, explicitly naming "Convex's optimistic concurrency control model."
- **CodeRabbit caught it in nitpick comments.** Originally scored as a Fail, but detailed review found OCC contention explicitly named in a nitpick on platformStats.ts:11-19 and reinforced in comments.ts:77. Downplayed as a nitpick, but the identification was clear and specific.
- **Graphite produced zero comments for the 10th consecutive PR.** At this point it is effectively not functioning as a code reviewer in this benchmark.

## Detailed Tool Reviews

### CodeRabbit
- [Counter increments even when no label was removed (labels.ts nitpick)](https://github.com/mikecann/cya-playground/pull/23#pullrequestreview-3887020990) ✅ - Legitimate minor logic observation: `incrementMutationCount` is called unconditionally in `removeFromTask` even when no label existed to delete.
- [Potential contention under high concurrency (platformStats.ts:11-19 nitpick)](https://github.com/mikecann/cya-playground/pull/23#pullrequestreview-3887020990) ✅ - Explicitly identifies "OCC (Optimistic Concurrency Control) retries when multiple mutations run concurrently, since they all touch the same singleton document." Names the single row as a bottleneck and suggests sharding or scheduled aggregation.
- [OCC operational note (comments.ts:77)](https://github.com/mikecann/cya-playground/pull/23#pullrequestreview-3887020990) ✅ - Reinforces the core finding: "multiple concurrent mutations incrementing the same `platformStats` document will cause OCC conflicts and retries."

**Overall verdict:** ✅ Pass
CodeRabbit explicitly identified the OCC / write contention / concurrency risk on the shared singleton document, named OCC by name, and suggested sharding. Although labeled as a "Nitpick" and downplayed in severity, the identification is clear and specific.

**Table validation:** Agrees - row is now aligned with the final score table and README (✅ Pass / 4).

### Greptile
- [Database hotspot, every mutation updates the same single row, causing transaction contention (platformStats.ts:20)](https://github.com/mikecann/cya-playground/pull/23#discussion_r2881943750) ✅ - States "every mutation across the entire platform updates the same single row, causing transaction contention. With concurrent mutations, Convex will serialize access to this document, forcing retries." Precisely identifies the OCC/write contention issue.
- [Summary: critical performance issue with single-row hotspot](https://github.com/mikecann/cya-playground/pull/23#issuecomment-3995440223) ✅ - Reinforces the inline finding, calling it "critical performance issue." Suggests aggregate components, scheduled functions, or sampling.

**Overall verdict:** ✅ Pass
**Table validation:** Agrees - No changes needed.

### Macroscope
- [`ctx.db.patch` called with 3 arguments flagged as incorrect API signature (platformStats.ts:11, HIGH severity)](https://github.com/mikecann/cya-playground/pull/23#discussion_r2881954106) ❌ False positive - Claims `ctx.db.patch` only accepts 2 arguments. The convex_rules.mdc documents the 3-argument form as valid. Same false positive as PR #21.
- [OCC scalability bottleneck on singleton platformStats document (secondary finding, consolidated under labels.ts:47)](https://github.com/mikecann/cya-playground/pull/23#discussion_r2881954106) ✅ - Explicitly names "Convex's optimistic concurrency control model," "every concurrent execution to conflict on this document," and "forcing serial execution and causing high retry rates under load."

**Overall verdict:** ⚠️ Mixed
The OCC finding is thorough and specific, but the primary/high-severity finding was a false positive about the `db.patch` API. A user would first encounter the incorrect claim before discovering the buried-but-correct OCC warning.

**Table validation:** Agrees - No changes needed.

### Cubic
- [Global OCC contention bottleneck on singleton platformStats document (platformStats.ts:11, P0, confidence 9)](https://github.com/mikecann/cya-playground/pull/23#discussion_r2881945168) ✅ - Identified exactly the intended issue: every mutation conflicts on the same single document, serializing all writes and causing retries. Actively researched "Convex OCC contention hot document counter pattern best practice" via Exa search to confirm. Suggests sharded counters or scheduled aggregation. Also correctly validated `db.patch` 3-argument API as valid.

**Overall verdict:** ✅ Pass
**Table validation:** Agrees - No changes needed.

### Graphite
- No findings produced. Check run completed with "AI review ran and left 0 comments." No inline comments, reviews, or issue comments.

**Overall verdict:** ❌ Fail
**Table validation:** Agrees - No changes needed.

### Qodo
- [Singleton race creates multiple rows (platformStats.ts:19)](https://github.com/mikecann/cya-playground/pull/23#discussion_r2881947365) ✅ - Flags the read-then-insert pattern where concurrent first mutations could insert multiple documents.
- [Global counter write hotspot (tasks.ts:137)](https://github.com/mikecann/cya-playground/pull/23#discussion_r2881947368) ✅ - "All public mutations now contend on updating the same global counter document, which can serialize/retry writes and cause latency spikes or reduced throughput." Exact match for the intended issue.
- [Type import may break runtime](https://github.com/mikecann/cya-playground/pull/23#issuecomment-3995433213) ⚠️ - Suggests `import type` for `MutationCtx`. Not a real runtime bug given Convex's bundler.
- [get() returns inconsistent shape](https://github.com/mikecann/cya-playground/pull/23#issuecomment-3995433213) ⚠️ - Minor API design nitpick about return type inconsistency.

**Overall verdict:** ✅ Pass
**Table validation:** Agrees - No changes needed.

### CodeAnt AI
- [Race condition on concurrent initial insert (TOCTOU) (platformStats.ts:19)](https://github.com/mikecann/cya-playground/pull/23#discussion_r2881946958) ⚠️ - Correctly identifies a concurrency issue on the singleton: two concurrent mutations on empty table could both insert. However, entirely misses the core issue of ongoing OCC write contention across all 14 mutations. No mention of OCC, retries, or sharded counters.

**Overall verdict:** ⚠️ Mixed
**Table validation:** Agrees - No changes needed.

### Sourcery
- [Read-modify-write on platformStats can lose increments under concurrent mutations](https://github.com/mikecann/cya-playground/pull/23#pullrequestreview-3887000747) ⚠️ - Correctly identifies the read-modify-write pattern and concurrent mutation risk, but frames it as data loss rather than as OCC contention/retries/performance bottleneck. In Convex, OCC means retries, not silent data loss.
- [Mutation rollback if counter update fails; suggest try/catch](https://github.com/mikecann/cya-playground/pull/23#pullrequestreview-3887000747) ⚠️ - Valid insight about coupling, but try/catch doesn't apply in Convex's atomic transaction model.

**Overall verdict:** ⚠️ Mixed
**Table validation:** Agrees - No changes needed.

### Copilot
- [Missing auth on platformStats.get query](https://github.com/mikecann/cya-playground/pull/23#discussion_r2881947740) ✅ - Reasonable consistency observation, not related to target issue.
- [Hot-spot document causing contention/retries under concurrent load (platformStats.ts:18)](https://github.com/mikecann/cya-playground/pull/23#discussion_r2881947767) ✅ - "This counter update reads then patches a single shared document on every mutation. Under concurrent write load this will create a hot-spot document, increasing contention/retries and potentially slowing or failing unrelated user mutations." Suggests sharded counter or background job. Textbook identification.
- [Inconsistent return shape from get](https://github.com/mikecann/cya-playground/pull/23#discussion_r2881947780) ✅ - Minor code quality observation.
- [Singleton not enforced by schema](https://github.com/mikecann/cya-playground/pull/23#discussion_r2881947795) ✅ - Design improvement suggestion, not flagging schema as wrong.

**Overall verdict:** ✅ Pass
**Table validation:** Agrees - No changes needed.

## Scores

| Tool       | Primary  | Bonus | Bonus Reason                                                                                        | Score |
| ---------- | -------- | -------- | ------------------------------------------------------------------------------------------------------ | ----- |
| CodeRabbit | ✅ (3)   | +1       | Genuine logic finding: counter increments unconditionally even when no label was removed in removeFromTask | 4     |
| Greptile   | ✅ (3)   | 0        | Clean pass, summary reinforces core finding but no distinct secondary discoveries                      | 3     |
| Macroscope | ⚠️ (1)   | -1       | Factually wrong claim that `ctx.db.patch` only accepts 2 arguments (repeated false positive from PR #21) | 0     |
| Cubic      | ✅ (3)   | 0        | Clean pass, thorough doc research but no secondary findings                                            | 3     |
| Graphite   | ❌ (0)   | 0        | Zero comments, nothing to evaluate                                                                     | 0     |
| Qodo       | ✅ (3)   | 0        | Singleton insert race is adjacent to primary test; `import type` nitpick is minor; neutral             | 3     |
| CodeAnt AI | ⚠️ (1)   | 0        | TOCTOU finding is within the primary concurrency test area; no other secondary findings                 | 1     |
| Sourcery   | ⚠️ (1)   | 0        | Coupling insight has merit; try/catch suggestion is wrong for Convex but not actively harmful           | 1     |
| Copilot    | ✅ (3)   | 0        | Auth, return shape, schema observations are all minor code quality nits                                | 3     |
