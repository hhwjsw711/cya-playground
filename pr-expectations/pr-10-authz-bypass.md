# PR #10 - Authorization Bypass (Missing Membership Check)

## Category
Security / Authorization

## Feature
"Task permalink" - A new public query that loads a task by its ID, intended for use with notification links or deep-linking. Also adds a shareable link button to the task detail UI that copies the task URL.

## Intentional Issue
The query calls `getAuthUserId(ctx)` to verify the user is logged in, but does NOT check that the user is a member of the task's project via `projectMembers`. Any authenticated user who knows (or guesses) a task ID can read that task's full details, even if they don't belong to the project.

This is distinct from PR #03 (which tested missing authentication entirely). Here authentication IS present, but authorization/membership is missing. This is a more subtle and realistic vulnerability - the kind that passes a quick review because "there's an auth check."

## What a tool SHOULD flag
- The query checks authentication but not authorization/membership
- Any authenticated user can access any task by ID regardless of project membership
- Data exposure risk: task details (title, description, status, priority, assignee, due date) leak across project boundaries
- Should compare with existing `tasks.get` which properly checks membership

## What a tool should NOT flag (false positives)
- The `getAuthUserId` check itself is correct
- The query structure and return shape are fine
- The UI link-copy feature is standard

## Scoring
- Pass: Identifies the missing project membership / authorization check
- Mixed: Mentions access control concerns vaguely without specifically identifying the missing membership check
- Fail: Misses the issue entirely, or only flags unrelated concerns


## Results

PR: [https://github.com/mikecann/cya-playground/pull/22](https://github.com/mikecann/cya-playground/pull/22)


| Tool       | Responded | Primary Finding                                                                          | Verdict   | Evidence                                                                                                                                       |
| ---------- | --------- | ---------------------------------------------------------------------------------------- | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| CodeRabbit | Yes       | Missing project membership authorization check, compared with existing get query          | ✅ Pass   | Inline on tasks.ts:113, flagged as Major, provided exact diff fix matching the get query's pattern                                              |
| Greptile   | Yes       | Missing project membership check, references existing get query lines 62-68               | ✅ Pass   | Inline on tasks.ts:113. Also flagged unused query and missing permalink route                                                                   |
| Macroscope | Yes       | getShared skips projectMembers check, any user can read any task by ID                    | ✅ Pass   | Inline on tasks.ts:90, flagged as Critical. Referenced lines 62-68 with evidence trail. Also found clipboard issue                              |
| Cubic      | Yes       | P0 IDOR vulnerability, detailed comparison of get vs getShared authorization              | ✅ Pass   | Inline on tasks.ts:99, confidence 10. Full reasoning chain comparing both queries. Identified as "high-severity security issue"                  |
| Graphite   | Yes       | No comments                                                                              | ❌ Fail   | Check run completed but left zero inline or review comments, again                                                                              |
| Qodo       | Yes       | "getShared skips authorization" - cross-project data access, breaks authorization pattern | ✅ Pass   | Inline on tasks.ts:100, flagged as Bug + Security. Also found missing permalink route                                                           |
| CodeAnt AI | Yes       | Shared query returns data without checking project membership, leaks tasks across projects | ✅ Pass   | Inline on tasks.ts:99, labeled as security. Also found non-existent permalink route                                                             |
| Sourcery   | Yes       | navigator.clipboard guard for non-secure contexts                                        | ❌ Fail   | Inline on TaskDetail.tsx:183. "Found 1 issue" which was the clipboard guard, not the auth issue. DRY suggestion in review-level feedback         |
| Copilot    | Yes       | getShared bypasses access control enforced in get, enables cross-project data access       | ✅ Pass   | Inline on tasks.ts:98. Also flagged missing route, clipboard guard, code duplication, and unused query (5 comments total)                       |


## Takeaway

- **7 out of 9 tools caught the missing authorization check.** This is a strong result, comparable to PR #08 (missing aggregate update) which also scored 7/9.
- **This test validated that most tools can distinguish authentication from authorization.** Unlike PR #03 (which had zero auth), this PR had proper auth but missing membership. The tools correctly identified the gap.
- **Cubic had the strongest analysis**, explicitly labeling it an IDOR (Insecure Direct Object Reference) vulnerability at P0 severity with confidence 10 and a detailed reasoning chain.
- **Macroscope flagged it as Critical**, its highest severity level, and one of the few times it has correctly identified a core issue. A strong showing from Macroscope this time.
- **Graphite continues its pattern of zero comments.** Across 10 PRs, it has been the most consistently absent reviewer in the lineup.
- **Sourcery missed the security issue**, finding only a clipboard API guard. This is surprising for a security-focused finding, since their "1 issue" was about browser API compatibility rather than the authorization bypass sitting right next to it.
- **The contrast with PR #09 (OCC) is striking.** Authorization is a well-understood security concept across all frameworks. OCC/write contention is Convex-specific. The difference (7/9 vs 0/9) shows exactly where domain knowledge matters.

## Detailed Tool Reviews

### CodeRabbit
- [Missing project membership authorization check (Major)](https://github.com/mikecann/cya-playground/pull/22#discussion_r2881516845) ✅ - Correctly identified that `getShared` authenticates the user but does not verify project membership before returning task details. Explicitly compared with the existing `get` query (lines 62-68) which checks membership. Flagged as "Potential issue / Major". Provided an exact diff fix adding the `projectMembers` lookup via `by_projectId_and_userId` index, mirroring the existing `get` query's pattern.

**Overall verdict:** ✅ Pass
**Table validation:** Agrees

### Greptile
- [Missing project membership check, any authenticated user can access any task. References existing `get` query (lines 62-68), provides full code suggestion fix.](https://github.com/mikecann/cya-playground/pull/22#discussion_r2881515987) ✅ - Direct hit on the intentional issue. Correctly identifies that `getShared` checks authentication but not authorization/membership, and explicitly compares with the existing `get` query's pattern. Includes a correct suggested fix using the `by_projectId_and_userId` index.
- [`getShared` query is defined but never used in the codebase](https://github.com/mikecann/cya-playground/pull/22#discussion_r2881516022) ⚠️ - Technically accurate since no route/page component consumes this query. Reasonable code quality observation about incomplete implementation.
- [URL points to `/task/${taskId}` but no such route exists in `App.tsx`](https://github.com/mikecann/cya-playground/pull/22#discussion_r2881516061) ⚠️ - Valid observation about the feature being incomplete (missing route). Flags the non-existent route, not the link-copy UI pattern itself.
- [Summary comment: "critical security and functionality issues"](https://github.com/mikecann/cya-playground/pull/22#issuecomment-3994906644) ✅ - Comprehensive summary that leads with the authorization bypass as a security vulnerability.

**Overall verdict:** ✅ Pass
**Table validation:** Agrees

### Macroscope
- [Critical: `getShared` skips `projectMembers` check, any authenticated user can read any task by ID](https://github.com/mikecann/cya-playground/pull/22#discussion_r2881518875) ✅ - Exact planted issue. Correctly identified that `getShared` only calls `getAuthUserId` for authentication but never queries `projectMembers` to verify authorization. Explicitly contrasted with the `get` function (lines 62-68). Flagged at Critical severity with detailed evidence trail.
- [Medium: `navigator.clipboard` crashes in non-secure contexts](https://github.com/mikecann/cya-playground/pull/22#discussion_r2881518878) ⚠️ - Minor concern about clipboard API availability in non-secure contexts. Tangential to the core test but technically valid.

**Overall verdict:** ✅ Pass
**Table validation:** Agrees

### Cubic
- [P0: Missing project membership authorization check, IDOR vulnerability, detailed comparison of `get` vs `getShared` authorization](https://github.com/mikecann/cya-playground/pull/22#discussion_r2881518724) ✅ - Exact issue. Identified at confidence 10 with a detailed reasoning chain comparing `get` (which checks `projectMembers`) vs `getShared` (which skips it). Explicitly labeled an IDOR vulnerability. Provided a correct suggested fix inserting the membership check using `by_projectId_and_userId`.
- [P2: `navigator.clipboard` may be undefined in non-HTTPS contexts](https://github.com/mikecann/cya-playground/pull/22#discussion_r2881518729) ⚠️ - Minor defensive coding suggestion about browser API availability. Not an auto-fail since it flags a real browser compatibility concern, not the link-copy feature concept.

**Overall verdict:** ✅ Pass
**Table validation:** Agrees

### Graphite
- No findings. The Graphite "AI Reviews" check run ([link](https://github.com/mikecann/cya-playground/runs/65655969882)) finished successfully with output: "AI review ran and left 0 comments." Zero inline comments, zero review comments, zero issue comments. Did not identify the missing project membership authorization check or any other issue.

**Overall verdict:** ❌ Fail
**Table validation:** Agrees

### Qodo
- [getShared skips authorization, cross-project data access](https://github.com/mikecann/cya-playground/pull/22#discussion_r2881516804) ✅ - Correctly identifies the core issue: `getShared` returns task details for any authenticated user without checking project membership. Explicitly compares with the existing `get` query's `projectMembers` check (lines 53-69). Tagged as Bug + Security with "Action required" severity.
- [Permalink route missing](https://github.com/mikecann/cya-playground/pull/22#discussion_r2881516806) ✅ - Legitimate observation that the UI generates `/task/<taskId>` URLs but the app has no routing to handle that path. Tagged as Bug + Correctness.
- [Clipboard API not guarded](https://github.com/mikecann/cya-playground/pull/22#issuecomment-3994899799) ⚠️ - Technically valid that `navigator.clipboard` could be undefined in non-secure contexts, but minor edge case.

**Overall verdict:** ✅ Pass
**Table validation:** Agrees

### CodeAnt AI
- [Missing project membership authorization check, labeled Critical security, compared with existing `get` query, provided correct fix](https://github.com/mikecann/cya-playground/pull/22#discussion_r2881516381) ✅ - Exactly the intended issue. Correctly identifies authentication vs authorization gap on `tasks.ts:99`, labels it Critical/security, references the existing `get` query pattern, provides a correct code suggestion.
- [Non-existent permalink route, `/task/<id>` URL has no corresponding route](https://github.com/mikecann/cya-playground/pull/22#discussion_r2881516385) ✅ - Legitimate observation; the constructed URL has no route handler so the link is non-functional.
- [Clipboard API fallback, no feature detection for `navigator.clipboard`](https://github.com/mikecann/cya-playground/pull/22#issuecomment-3994904181) ⚠️ - Minor nitpick about browser compatibility; debatable but not a false positive.

**Overall verdict:** ✅ Pass
**Table validation:** Agrees

### Sourcery
- [Clipboard guard for `navigator.clipboard` in non-secure contexts (bug_risk)](https://github.com/mikecann/cya-playground/pull/22#discussion_r2881511363) ❌ - This was Sourcery's sole identified "issue." It flags `navigator.clipboard.writeText()` availability, not the authorization bypass. Completely unrelated to the core security issue.
- [DRY suggestion: extract shared logic between `get` and `getShared`](https://github.com/mikecann/cya-playground/pull/22#pullrequestreview-3886410424) ⚠️ - Notes that the two queries duplicate logic and should "stay in sync," framed purely as maintainability. Does NOT identify that `getShared` is missing the membership check that `get` has.

Neither finding touches on the missing authorization/membership check. Sourcery's review stated "Found 1 issue" which was the clipboard guard, completely missing the security vulnerability.

**Overall verdict:** ❌ Fail
**Table validation:** Agrees

### Copilot
- [`getShared` bypasses access control, missing project membership check](https://github.com/mikecann/cya-playground/pull/22#discussion_r2881516916) ✅ - Core finding. Correctly identifies that `getShared` returns task details for any authenticated user without verifying project membership, explicitly compares with authorization enforced in `get`, notes cross-project data access risk, provides exact code suggestion adding the membership check.
- [Permalink URL doesn't match any existing route](https://github.com/mikecann/cya-playground/pull/22#discussion_r2881516905) ⚠️ - True observation about incomplete feature delivery, not related to security issue.
- [`navigator.clipboard` guard for non-secure contexts](https://github.com/mikecann/cya-playground/pull/22#discussion_r2881516909) ⚠️ - Defensive coding suggestion about clipboard API availability. Minor.
- [Code duplication between `getShared` and `get`](https://github.com/mikecann/cya-playground/pull/22#discussion_r2881516920) ⚠️ - DRY concern; arguably reinforces the security finding.
- [`getShared` is unused in the client codebase](https://github.com/mikecann/cya-playground/pull/22#discussion_r2881516925) ⚠️ - True observation about incomplete feature wiring.

**Overall verdict:** ✅ Pass
**Table validation:** Agrees

## Scores

| Tool       | Primary | Bonus | Bonus Reason                                                                                     | Score |
| ---------- | ------- | -------- | --------------------------------------------------------------------------------------------------- | ----- |
| CodeRabbit | ✅ (3)  | 0        | Clean pass, no notable extras                                                                       | 3     |
| Greptile   | ✅ (3)  | +1       | Genuine findings: unused query and missing permalink route flag incomplete feature delivery          | 4     |
| Macroscope | ✅ (3)  | 0        | Clipboard concern is minor/tangential, not a significant secondary finding                          | 3     |
| Cubic      | ✅ (3)  | 0        | Clipboard concern is minor, no significant extras                                                   | 3     |
| Graphite   | ❌ (0)  | 0        | Zero comments, nothing to evaluate                                                                  | 0     |
| Qodo       | ✅ (3)  | +1       | Genuine finding: missing permalink route means the shared link feature is non-functional             | 4     |
| CodeAnt AI | ✅ (3)  | +1       | Genuine finding: non-existent permalink route, feature ships broken                                 | 4     |
| Sourcery   | ❌ (0)  | 0        | Clipboard guard and DRY suggestion are valid but neither identifies the security issue; no FPs      | 0     |
| Copilot    | ✅ (3)  | +1       | Multiple genuine findings: missing route, unused query, code duplication reinforcing the auth gap   | 4     |
