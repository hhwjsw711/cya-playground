# PR #7 - Unbounded Array in Document

## Branch
`mikec/pr-07-unbounded-array`

## Cover Story
Add a checklist feature to tasks, allowing users to add and toggle checklist items.

## What We Are Testing
Whether tools flag storing an unbounded array of objects inside a document as a schema design anti-pattern. Instead of creating a separate `checklistItems` table with a `taskId` reference, checklist items are stored as a growing `v.array(...)` field directly on the task document.

## The Pattern Being Introduced
- Schema: adds `checklist: v.optional(v.array(v.object({ text: v.string(), completed: v.boolean() })))` to the `tasks` table
- `convex/checklist.ts` - mutations to add and toggle checklist items by reading the array, modifying it, and patching it back
- `src/components/TaskDetail.tsx` - small UI section to display and interact with the checklist

## What a Tool SHOULD Say (true positive)
- Storing an unbounded array in a document risks hitting the 1MB document size limit
- Each update rewrites the entire array (read/write amplification)
- Individual checklist items can't be indexed or queried independently
- Suggest a separate table with a foreign key reference instead

## What a Tool Should NOT Say (false positive / distractor)
- Issues with auth/membership (properly implemented)
- Issues with function types (mutations are correct)
- N+1 concerns (no nested loops)
- Issues with index usage

## Scoring
- Flags unbounded array / document size risk = Pass
- Flags general "array grows" concern without document size context = Mixed
- Only flags unrelated issues = Fail
- No findings = Fail

## Results

PR: [https://github.com/mikecann/cya-playground/pull/18](https://github.com/mikecann/cya-playground/pull/18)


| Tool       | Responded  | Primary Finding                                                                          | Verdict   | Evidence                                                                                                                                |
| ---------- | ---------- | ---------------------------------------------------------------------------------------- | --------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| CodeRabbit | Yes        | Unbounded checklist array risks 1MB doc limit; suggested separate table                  | ✅ Pass   | Inline on schema.ts:54-56, flagged as Major, recommended splitting into own table with back-reference                                   |
| Greptile   | Yes        | Array mutation pattern issues; missing activity logging; React key concern                | ❌ Fail   | 4 inline comments on checklist.ts and TaskDetail.tsx, none about unbounded array or document size                                        |
| Macroscope | Yes        | Form double-submit UX issue in checklist submission handler                              | ❌ Fail   | 1 issue on TaskDetail.tsx:245 about clearing input and pending state. First time finding something, but missed the core issue            |
| Cubic      | Yes        | Checklist items lack unique ID; also non-integer index and untrimmed input                | ⚠️ Mixed  | P1 on schema.ts:55 about missing stable IDs making index-based ops unreliable. Related to the array design but not about document size  |
| Graphite   | Check only | AI review ran and left 0 comments                                                        | ❌ Fail   | Zero comments for the seventh time                                                                                                      |
| Qodo       | Yes        | Unbounded checklist bloats task documents and list query payload                         | ✅ Pass   | Bug #3 on schema.ts:54-56 flagged "Checklist bloats task list", noted listByProject spreads full doc including growing checklist array   |
| CodeAnt AI | Yes        | Schema migration concern, race condition on array mutation, index safety                 | ⚠️ Mixed  | Flagged "Schema Change" and "Possible Race" but didn't explicitly mention unbounded growth or document size limit                        |
| Sourcery   | Yes        | Array mutation pattern, index-by-index fragility; false positive on ctx.db.get API       | ❌ Fail   | 2 inline issues + high-level feedback about immutable patterns. No mention of unbounded array or document size                           |
| Copilot    | Yes        | Input validation + "unbounded document growth" warning; also integer index check         | ⚠️ Mixed  | 2 inline comments: one flagged "unbounded document growth" via unchecked appends, but framed as input validation rather than schema design |


## Takeaway

- **Only 2 out of 9 tools clearly flagged the unbounded array issue** (CodeRabbit, Qodo), with Copilot and Cubic getting partial credit. This was expected to be a harder test since tools need to understand document database design patterns.
- **CodeRabbit was the strongest**, explicitly calling out the 1MB document size limit and recommending a separate table - exactly the right fix.
- **Qodo took a different angle**, flagging that the growing array bloats the `listByProject` query response since it uses `...task` spread. A valid secondary concern that flows from the same root cause.
- **Cubic got close** with its P1 about lacking stable IDs, which is a real consequence of the array design, but didn't connect it to the document size or schema design concern. Mixed verdict.
- **Macroscope found something for the first time** across all PRs - a UX issue about form double-submit. While not the intended issue, it's notable they finally produced a finding.
- **Greptile focused entirely on array mutation patterns** (immutable vs mutable), which is a code style concern but not the architectural problem we were testing.
- **Sourcery produced a false positive** on the `ctx.db.get("tasks", id)` API, incorrectly claiming it should be `ctx.db.get(id)`. CodeRabbit caught and corrected this same false positive in its own review.
- **Most tools focused on tactical issues** (validation, mutation patterns, React keys) rather than the strategic schema design flaw. This suggests they struggle with "should this data live in an array or a table?" architectural reasoning.

## Detailed Tool Reviews

### CodeRabbit
- [Unbounded checklist array risks 1 MiB document limit](https://github.com/mikecann/cya-playground/pull/18#discussion_r2881418106) ✅ - Flagged as Major on `convex/schema.ts` line 56. Explicitly called out Convex's 1 MiB per-document limit, noted each add/toggle rewrites the entire parent document, and recommended splitting into a separate `taskChecklistItems` table with back-reference. Exactly the core issue.
- [Non-integer index validation on toggleItem](https://github.com/mikecann/cya-playground/pull/18#discussion_r2881418101) ✅ - `v.number()` allows fractional values that pass bounds checks but access undefined array elements. Legitimate input validation concern.
- [Submit trimmed checklist text, not raw input](https://github.com/mikecann/cya-playground/pull/18#discussion_r2881418110) ✅ - Minor UX fix: emptiness check trims but mutation receives untrimmed string.
- [Extract shared auth helper (nitpick)](https://github.com/mikecann/cya-playground/pull/18#pullrequestreview-3886317535) ✅ - DRY refactor suggestion for duplicated auth+membership checks. Not claiming auth is wrong.
- [Confirmed Convex API is correct (informational)](https://github.com/mikecann/cya-playground/pull/18#pullrequestreview-3886317535) ✅ - Proactively noted `ctx.db.get("tasks", id)` / `ctx.db.patch("tasks", id, ...)` are correct for Convex v1.31+ and flagged that another tool's suggestion to revert to legacy single-arg form would be incorrect.

**Overall verdict:** ✅ Pass
**Table validation:** Agrees

### Greptile
- [Immutable array pattern for addItem](https://github.com/mikecann/cya-playground/pull/18#discussion_r2881406244) ❌ - Flags mutable array push as a "critical logic bug" and suggests spread operator. Code style preference, not a correctness issue.
- [Immutable array pattern for toggleItem](https://github.com/mikecann/cya-playground/pull/18#discussion_r2881406271) ❌ - Same theme: flags direct index assignment, suggests `.map()`. Stylistic concern, not about schema design.
- [Missing activity logging for checklist changes](https://github.com/mikecann/cya-playground/pull/18#discussion_r2881406306) ⚠️ - Reasonable consistency observation, entirely unrelated to core issue.
- [Array index as React key](https://github.com/mikecann/cya-playground/pull/18#discussion_r2881406348) ⚠️ - Standard React best practice, unrelated to unbounded array concern.
- [Summary comment](https://github.com/mikecann/cya-playground/pull/18#issuecomment-3994762522) - Frames review as "critical logic bugs" about array mutation patterns. No mention of unbounded growth, document size, or separate table suggestion.

**Overall verdict:** ❌ Fail
**Table validation:** Agrees

### Macroscope
- [Form double-submit UX issue in checklist submission handler](https://github.com/mikecann/cya-playground/pull/18#discussion_r2881409275) ❌ - Flagged low-severity UX concern about async `.then()` callback clearing input. Notable as Macroscope's first finding across all PRs, but entirely unrelated to the unbounded array issue.

**Overall verdict:** ❌ Fail
**Table validation:** Agrees

### Cubic
- [P1: Checklist items lack unique identifier, index-based ops unreliable](https://github.com/mikecann/cya-playground/pull/18#discussion_r2881413939) ⚠️ - Targets schema.ts:55 and identifies a real design flaw with embedding items in an array (positional indices are fragile under concurrent edits). A consequence of the array design but doesn't flag document size or unbounded growth.
- [P2: Untrimmed input sent to mutation](https://github.com/mikecann/cya-playground/pull/18#discussion_r2881413946) ✅ - Valid minor observation, unrelated to core test.
- [P2: `v.number()` allows non-integer floats/NaN for index](https://github.com/mikecann/cya-playground/pull/18#discussion_r2881413948) ✅ - Valid input validation concern, unrelated to core test.

**Overall verdict:** ⚠️ Mixed
**Table validation:** Agrees

### Graphite
- No findings. AI review check ran successfully but produced zero comments. ([check run](https://github.com/mikecann/cya-playground/runs/65652395032))

**Overall verdict:** ❌ Fail
**Table validation:** Agrees

### Qodo
- [Bug #1: Non-integer index crash](https://github.com/mikecann/cya-playground/pull/18#discussion_r2881408521) ⚠️ - `toggleItem` accepts any `number` including NaN/floats. Legitimate minor input validation concern.
- [Bug #2: No checklist text validation](https://github.com/mikecann/cya-playground/pull/18#issuecomment-3994756610) ⚠️ - Flags that `addItem` doesn't trim or length-check `args.text`, notes risk of oversized documents. Tangentially touches growth but primarily an input validation concern.
- [Bug #3: Checklist bloats task list](https://github.com/mikecann/cya-playground/pull/18#issuecomment-3994756610) ✅ - Explicitly states storing an "unbounded" checklist array bloats `listByProject` response since it uses `...task` spread. Identifies the core architectural problem: the array grows without bound, inflating query payload on the main project board. References schema lines 54-56 and the existing query.

**Overall verdict:** ✅ Pass
**Table validation:** Agrees

### CodeAnt AI
- [Schema Change](https://github.com/mikecann/cya-playground/pull/18#issuecomment-3994762914) ⚠️ - Flags that adding the optional checklist array changes the schema. About backward compatibility, not about unbounded growth.
- [Possible Race](https://github.com/mikecann/cya-playground/pull/18#issuecomment-3994762914) ⚠️ - Notes read-modify-write pattern on the array, recommends immutable updates. Tangentially related to array design without naming the core concern.
- [Index Safety](https://github.com/mikecann/cya-playground/pull/18#issuecomment-3994762914) ⚠️ - Flags numeric indices as fragile under concurrent edits. Real consequence of embedded-array design but doesn't connect to document size.
- [UI Consistency](https://github.com/mikecann/cya-playground/pull/18#issuecomment-3994762914) ❌ - React keys using array indices and lack of optimistic updates. Frontend UX concern unrelated to schema design.

**Overall verdict:** ⚠️ Mixed
**Table validation:** Agrees

### Sourcery
- [Index-based identification is brittle](https://github.com/mikecann/cya-playground/pull/18#pullrequestreview-3886303879) ❌ - Code style opinion about using stable IDs instead of array indices. Unrelated to unbounded growth.
- [Mutable array push pattern](https://github.com/mikecann/cya-playground/pull/18#pullrequestreview-3886303879) ❌ - JavaScript style preference (spread over push). Not related to document size.
- [`ctx.db.get` uses incorrect two-argument signature](https://github.com/mikecann/cya-playground/pull/18#discussion_r2881403134) ❌ - Claims `ctx.db.get("tasks", id)` should be `ctx.db.get(id)`. This is directly contradicted by the Convex rules file which documents the table-name-first format. CodeRabbit explicitly corrected this same false positive.
- [`ctx.db.patch` uses incorrect three-argument signature](https://github.com/mikecann/cya-playground/pull/18#discussion_r2881403139) ❌ - Same API false positive for `ctx.db.patch`. The Convex rules file documents `ctx.db.patch('tasks', taskId, { completed: true })`.

**Overall verdict:** ❌ Fail
**Table validation:** Agrees

### Copilot
- [Input validation + unbounded document growth warning on addItem](https://github.com/mikecann/cya-playground/pull/18#discussion_r2881407741) ⚠️ - Mentions "unbounded document growth" which references the core concern, but frames it entirely as input validation (trim, validate, add max length). Doesn't mention 1MB limit, read/write amplification, or suggest a separate table. The proposed remedy doesn't address the architectural issue.
- [Non-integer array index check on toggleItem](https://github.com/mikecann/cya-playground/pull/18#discussion_r2881407751) ✅ - Valid edge case: `v.number()` allows non-integer values that pass bounds check but yield undefined.

**Overall verdict:** ⚠️ Mixed
**Table validation:** Agrees

## Scores

| Tool       | Primary  | Bonus | Bonus Reason                                                                                    | Score |
| ---------- | -------- | -------- | -------------------------------------------------------------------------------------------------- | ----- |
| CodeRabbit | ✅ (3)   | +1       | Genuine non-integer index validation bug + proactively corrected another tool's API false positive  | 4     |
| Greptile   | ❌ (0)   | -1       | Framed valid mutable array operations as "critical logic bugs", actively misleading                 | -1    |
| Macroscope | ❌ (0)   | 0        | Form double-submit finding is minor UX noise, not clearly actionable                               | 0     |
| Cubic      | ⚠️ (1)   | +1       | Genuine input validation bugs (untrimmed text, non-integer float index)                            | 2     |
| Graphite   | ❌ (0)   | 0        | No findings at all                                                                                 | 0     |
| Qodo       | ✅ (3)   | +1       | Genuine non-integer index crash edge case                                                          | 4     |
| CodeAnt AI | ⚠️ (1)   | 0        | Secondary findings are tangential and imprecise, no clear actionable extras                         | 1     |
| Sourcery   | ❌ (0)   | -1       | Two false positives claiming ctx.db.get/patch two-arg API form is incorrect                        | -1    |
| Copilot    | ⚠️ (1)   | +1       | Genuine non-integer array index edge case bug                                                      | 2     |
