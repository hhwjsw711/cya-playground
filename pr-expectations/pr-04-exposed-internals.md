# PR #4 - Exposed Internals (mutation vs internalMutation)

## Branch

`mikec/pr-04-exposed-internals`

## Cover Story

Add an hourly cron job to prune activity log entries older than 90 days.
Backend: `convex/maintenance.ts` with the cleanup function, `convex/crons.ts`
with the hourly schedule. No frontend changes.

## What We Are Testing

Whether tools detect that a cron-only maintenance function is incorrectly
exposed as a public `mutation` instead of `internalMutation`.

In Convex, `mutation` is callable from any client via the API.
`internalMutation` is only callable from other server-side functions
(crons, schedulers, other internal functions, or the Dashboard).

There are two signals pointing to the bug:

1. `maintenance.ts` uses `mutation` instead of `internalMutation`
2. `crons.ts` references it via `api.maintenance.*` instead of `internal.maintenance.*`

The existing codebase already uses `internalMutation` correctly for similar
cleanup operations:

- `tasks.cleanupTaskChildren` (internalMutation)
- `projects.cleanupProjectChildren` (internalMutation)

## The Anti-pattern

- Uses `mutation` instead of `internalMutation` for an hourly cron target
- The function deletes activity log entries (data destruction)
- Any client can call it directly since it's publicly exposed
- The cron references it via `api.*` instead of `internal.*`
- Existing cleanup functions in the codebase correctly use internalMutation

## What a Tool Should Say (true positives)

- "This should be an internalMutation, not a public mutation"
- "Cron targets should not be client-callable"
- "Other cleanup functions in this codebase use internalMutation"
- "Use internal.maintenance.* instead of api.maintenance.* in the cron"
- Any reference to the function being unnecessarily public

## What a Tool Should NOT Say (false positives)

- N+1 concerns about the delete loop (bounded by BATCH_SIZE, standard pattern)
- Suggesting auth checks (if it were internalMutation, no auth needed)
- Flagging .filter() usage (there's no _creationTime index, fair to mention but not the core issue)

## Scoring

- Flags mutation vs internalMutation = Pass
- Notes the contrast with existing cleanup functions = Bonus (codebase awareness)
- Notes the api.* vs internal.* reference in crons.ts = Bonus
- Flags missing auth instead (reasonable but misses the root cause) = Mixed
- Misses the exposure issue entirely = Fail
- Only flags unrelated issues = Fail

## Results

PR: [https://github.com/mikecann/cya-playground/pull/15](https://github.com/mikecann/cya-playground/pull/15)


| Tool       | Responded  | Primary Finding                                                            | Verdict | Evidence                                                                                                                                              |
| ---------- | ---------- | -------------------------------------------------------------------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| CodeRabbit | Yes        | Review failed to post comments; walkthrough only                           | ❌ Fail  | "Failed to post review comments" error. Review engine broke, no findings delivered                                                                     |
| Greptile   | Yes        | Should use internalMutation; also flagged missing by_creation_time index   | ✅ Pass  | 3 inline comments: internalMutation fix, missing index, api vs internal in crons.ts. Summary called both "critical bugs"                              |
| Macroscope | Check only | "No issues identified" (6 code objects reviewed)                           | ❌ Fail  | Missed the exposed mutation for the fourth consecutive PR                                                                                             |
| Cubic      | Yes        | P1: Public mutation should be internalMutation, cron should use internal.* | ✅ Pass  | Inline on crons.ts:9 with full fix instructions. Referenced codebase pattern explicitly                                                               |
| Graphite   | Check only | AI review ran and left 0 comments                                          | ❌ Fail  | Zero comments, missed the core issue entirely                                                                                                         |
| Qodo       | Yes        | Cleanup publicly callable (Bug + Security); also flagged missing index     | ✅ Pass  | 2 inline comments: public mutation exposure on maintenance.ts:9, missing index on maintenance.ts:15                                                   |
| CodeAnt AI | Yes        | Only flagged performance (one-by-one deletions); missed mutation exposure  | ❌ Fail  | "No security issues identified" header. Only recommended reviewing deletion loop performance                                                          |
| Sourcery   | Yes        | Only suggested Promise.all batching and multi-batch processing             | ❌ Fail  | High-level feedback only about delete loop efficiency. Did not flag mutation vs internalMutation                                                      |
| Copilot    | Yes        | Should be internalMutation; cron should use internal.*; also flagged index | ✅ Pass  | 3 inline comments: internalMutation (maintenance.ts:6), api vs internal (crons.ts:9), index concern (maintenance.ts:13). Referenced codebase patterns |


## Takeaway

- **4 out of 9 tools caught the mutation vs internalMutation issue** (Greptile, Cubic, Qodo, Copilot). This was the hardest test so far, requiring Convex-specific knowledge about function visibility.
- **CodeRabbit's review engine failed** with a "Failed to post review comments" error, delivering no findings. A broken review is still a fail.
- **Macroscope and Graphite continued their pattern** of producing zero findings.
- **CodeAnt AI and Sourcery both missed the core issue**, focusing only on performance nitpicks (delete loop batching). Neither recognized that a cron-only function should not be publicly callable.
- **Cubic nailed it** with a precise P1 on the exact line in crons.ts, including the full fix (change to internalMutation + import internal).
- **Copilot was the most thorough**, catching all three signals: internalMutation, api vs internal, and the index concern.
- **Several tools flagged `by_creation_time` as a missing index** (Greptile, Qodo, Copilot). This is debatable since Convex auto-creates this index on every table, but it's a reasonable concern if the tool doesn't know that.
- **This was the most Convex-specific test yet** and the results show it: tools without deep Convex knowledge defaulted to generic performance feedback.

## Detailed Tool Reviews

### CodeRabbit
- [Walkthrough-only post with "Review failed" error](https://github.com/mikecann/cya-playground/pull/15#issuecomment-3989243852) ❌ Fail - CodeRabbit posted a walkthrough summary describing the two new files (cron job + maintenance mutation) and passed all three pre-merge checks (description, title, docstring coverage). However, the actual code review failed with a "Failed to post review comments" error. No code-level findings were produced, no mention of `mutation` vs `internalMutation`, no `api.*` vs `internal.*` flag, nothing. A broken review engine that delivers zero findings is still a fail.

**Overall verdict:** ❌ Fail
**Table validation:** Disagrees - Changed from ➖ N/A to ❌ Fail. A tool that can't deliver a review doesn't get a free pass.

### Greptile
- [Missing `by_creation_time` index on `activityLog` table](https://github.com/mikecann/cya-playground/pull/15#discussion_r2876639838) ✅ - The code uses `.withIndex("by_creation_time", ...)` but no such index is defined in the schema. Would cause a runtime error. Legitimate finding, though not the core issue being tested.
- [Should use `internalMutation` instead of `mutation`](https://github.com/mikecann/cya-playground/pull/15#discussion_r2876639885) ✅ - Direct hit on the primary issue. Correctly identifies that any client can trigger the cleanup, and suggests changing to `internalMutation`.
- [Update `api.*` to `internal.*` in `crons.ts`](https://github.com/mikecann/cya-playground/pull/15#discussion_r2876639933) ✅ - Correctly flags that the cron reference should use the internal namespace. Bonus finding per expectations. Note: the suggested syntax `api.internal.maintenance.cleanupOldActivity` is technically wrong (should be `internal.maintenance.cleanupOldActivity`), but the intent is correct.
- [Summary comment](https://github.com/mikecann/cya-playground/pull/15#issuecomment-3989255370) - Called both the missing index and the public mutation exposure "critical bugs", gave a confidence score of 1/5.

**Overall verdict:** ✅ Pass
**Table validation:** Agrees

### Macroscope
- [No issues identified (6 code objects reviewed)](https://github.com/mikecann/cya-playground/runs/65518822835) ❌ Fail - Reviewed `convex/crons.ts` and `convex/maintenance.ts` but posted 0 comments. Completely missed that `pruneOldActivityLogs` is a public `mutation` instead of `internalMutation`, and that `crons.ts` references it via `api.maintenance.*` instead of `internal.maintenance.*`.

**Overall verdict:** ❌ Fail
**Table validation:** Agrees

### Cubic
- [P1 Security: Public mutation should be internalMutation, cron should use internal.*](https://github.com/mikecann/cya-playground/pull/15#discussion_r2876639247) ✅ - Single high-confidence (9/10) inline comment on `convex/crons.ts` line 9 identifying the exact core issue: the cleanup cron references a public `mutation` via `api`, exposing it to any client. Correctly prescribed both halves of the fix: change `maintenance.ts` to use `internalMutation`, and change the cron reference from `api.maintenance.cleanupOldActivity` to `internal.maintenance.cleanupOldActivity`. No false positives raised.

**Overall verdict:** ✅ Pass
**Table validation:** Agrees

### Graphite
- No findings. The AI review completed successfully but produced zero comments. Did not flag the public `mutation` vs `internalMutation` issue, the `api.*` vs `internal.*` reference in `crons.ts`, or any other concern.

**Overall verdict:** ❌ Fail
**Table validation:** Agrees

### Qodo
- [Missing cleanup index (Bug, Correctness)](https://github.com/mikecann/cya-playground/pull/15#discussion_r2876643275) ⚠️ Debatable - Flags that `withIndex("by_creation_time")` references an index not defined in the schema. Technically correct but not the core issue. Fair to mention per expectations.
- [Cleanup publicly callable (Bug, Security)](https://github.com/mikecann/cya-playground/pull/15#discussion_r2876643279) ✅ - Core issue. Correctly identified `cleanupOldActivity` as a public `mutation` instead of `internalMutation`, flagged `api.*` vs `internal.*`, and referenced existing internal cleanup patterns (`cleanupProjectChildren`, `cleanupTaskChildren`). Hits Pass plus both Bonus criteria.
- [No catch-up batching (Bug, Reliability)](https://github.com/mikecann/cya-playground/pull/15#issuecomment-3989243412) ⚠️ Debatable - Notes the function deletes only 100 entries per run without self-rescheduling. Reasonable reliability observation but tangential to what's being tested.

**Overall verdict:** ✅ Pass
**Table validation:** Agrees

### CodeAnt AI
- [Flagged one-by-one deletions; explicitly stated "No security issues identified"](https://github.com/mikecann/cya-playground/pull/15#issuecomment-3989252453) ❌ - Only raised a performance nitpick about sequential `await` in the delete loop (bounded by BATCH_SIZE, standard Convex pattern). Explicitly declared "No security issues identified" while missing that a destructive cron-only function is publicly callable. Missed the mutation exposure issue entirely.

**Overall verdict:** ❌ Fail
**Table validation:** Agrees

### Sourcery
- [Suggests `Promise.all` batching for the delete loop](https://github.com/mikecann/cya-playground/pull/15#pullrequestreview-3880809070) ❌ - Delete loop is bounded by BATCH_SIZE = 100, standard Convex pattern. Irrelevant performance nitpick.
- [Suggests multi-batch processing per cron invocation](https://github.com/mikecann/cya-playground/pull/15#pullrequestreview-3880809070) ❌ - Another delete-loop efficiency suggestion. Completely misses the security concern. The function being publicly callable via `mutation` is the real problem.
- [Reviewer's Guide walkthrough](https://github.com/mikecann/cya-playground/pull/15#issuecomment-3989242788) - The guide writes out `api.maintenance.cleanupOldActivity` in its sequence diagram without flagging it as problematic, confirming Sourcery saw the `api.*` reference but did not recognize it as an issue.

**Overall verdict:** ❌ Fail
**Table validation:** Agrees

### Copilot
- [Missing `by_creation_time` index will cause runtime error](https://github.com/mikecann/cya-playground/pull/15#discussion_r2876638828) ✅ - Correctly identifies that the code uses `.withIndex("by_creation_time", ...)` but no such index exists in the schema. Legitimate runtime bug.
- [Public `mutation` should be `internalMutation`](https://github.com/mikecann/cya-playground/pull/15#discussion_r2876638858) ✅ - Primary finding. Nails it: "This cleanup function is intended only for internal server-side use (called by the cron job), yet it is declared as a public `mutation`. This exposes a destructive bulk-delete operation to unauthenticated or unauthorized clients." Explicitly references codebase patterns (`projects.cleanupProjectChildren`, `tasks.cleanupTaskChildren`) demonstrating codebase awareness (Bonus).
- [`api.*` should be `internal.*` in crons.ts](https://github.com/mikecann/cya-playground/pull/15#discussion_r2876638885) ✅ - Correctly identifies the cron should use `internal.maintenance.cleanupOldActivity`. Bonus finding per expectations. Provides a code suggestion with the fix.

**Overall verdict:** ✅ Pass
**Table validation:** Agrees

## Scores

| Tool       | Primary | Bonus | Bonus Reason                                                                  | Score |
| ---------- | ------- | -------- | -------------------------------------------------------------------------------- | ----- |
| CodeRabbit | ❌ (0)  | 0        | Review engine failed, nothing to judge positively or negatively                   | 0     |
| Greptile   | ✅ (3)  | +1       | Genuine missing by_creation_time index catch (would cause runtime error)          | 4     |
| Macroscope | ❌ (0)  | 0        | No findings at all                                                               | 0     |
| Cubic      | ✅ (3)  | 0        | Clean pass on primary, no extras                                                 | 3     |
| Graphite   | ❌ (0)  | 0        | No findings at all                                                               | 0     |
| Qodo       | ✅ (3)  | +1       | Genuine missing index catch plus codebase-aware reference to existing patterns    | 4     |
| CodeAnt AI | ❌ (0)  | 0        | Delete loop performance nit is noise but not actively misleading                 | 0     |
| Sourcery   | ❌ (0)  | 0        | Delete loop batching suggestions are irrelevant but not factually wrong          | 0     |
| Copilot    | ✅ (3)  | +1       | Genuine missing by_creation_time index catch (runtime error), no false positives | 4     |
