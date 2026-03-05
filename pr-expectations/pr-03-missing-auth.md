# PR #3 - Missing Auth Check (Security)

## Branch

`mikec/pr-03-missing-auth`

## Cover Story

New "Export project" feature. Adds an Export button to the project view header
that queues a background job to compile and email a CSV of the project's tasks.
Backend: `convex/exports.ts` with a public `requestExport` mutation and an
`internalAction` placeholder. Frontend: `ExportButton` component in ProjectView.

## What We Are Testing

Whether tools detect that a public mutation is missing authentication.
The `requestExport` mutation does not call `getAuthUserId(ctx)`.
Every other mutation in the codebase checks authentication before proceeding.
Without this check, any unauthenticated client can trigger exports for any project.

This PR tests ONLY authentication (identity verification), not authorization
(project membership / role checks). The export is a project-level action where
auth is the primary gate.

## The Anti-pattern

- No `getAuthUserId(ctx)` call in the `requestExport` mutation
- An unauthenticated user can call this mutation and trigger an export
- They can also specify any email address, enabling data exfiltration
- Contrast with every other mutation in the codebase: `tasks.create`, `tasks.update`,
`projects.create`, `comments.create`, `members.add` - all check `getAuthUserId(ctx)`

## What a Tool Should Say (true positives)

- "Missing authentication check" / "No auth guard"
- "Unauthenticated users can trigger exports"
- "Other mutations in this codebase call getAuthUserId()"
- "Arbitrary email allows data exfiltration"
- Any reference to the missing identity verification

## What a Tool Should NOT Say (false positives)

- Issues with the TODO/placeholder in generateAndSend (it's explicitly a stub)
- Flagging the _creationTime sort order or query patterns
- N+1 concerns (there's no loop)

## Scoring

- Flags missing auth = Pass
- Notes contrast with other mutations = Bonus (codebase awareness)
- Notes the arbitrary email exfiltration risk = Bonus (deep security thinking)
- Misses the auth issue entirely = Fail
- Only flags unrelated issues = Fail

## Results

PR: [https://github.com/mikecann/cya-playground/pull/14](https://github.com/mikecann/cya-playground/pull/14)


| Tool       | Responded  | Primary Finding                                                                        | Verdict | Evidence                                                                                                                          |
| ---------- | ---------- | -------------------------------------------------------------------------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------- |
| CodeRabbit | Yes        | Critical: missing auth + arbitrary email is data exfiltration risk                     | ✅ Pass  | Inline on exports.ts:17, flagged as "Critical", noted codebase pattern contrast. Also correctly dismissed false ctx.db.get report |
| Greptile   | Yes        | Missing auth and authorization, any user can export any project                        | ✅ Pass  | 2 inline comments: missing auth check + missing getAuthUserId import. Summary called it "Critical Issue"                          |
| Macroscope | Check only | "No issues identified" (4 code objects reviewed)                                       | ❌ Fail  | Missed the auth issue entirely for the third consecutive PR                                                                       |
| Cubic      | Yes        | P0: Missing auth/authz, codebase pattern violation; P1: client email trusted           | ✅ Pass  | 2 issues: P0 on exports.ts:10 referencing other mutations' patterns, P1 on ExportButton.tsx:19 for email trust                    |
| Graphite   | Check only | AI review ran and left 0 comments                                                      | ❌ Fail  | Zero comments, missed the auth issue entirely                                                                                     |
| Qodo       | Yes        | Unauthed export scheduling (Bug + Security)                                            | ✅ Pass  | Inline on exports.ts:18, flagged unauthenticated caller + arbitrary email                                                         |
| CodeAnt AI | Yes        | Missing auth identified, but flagged intentional placeholder as an issue               | ❌ Fail  | Caught the auth gap, then also flagged the intentional generateAndSend TODO/placeholder, which is a disqualifying false positive  |
| Sourcery   | Yes        | Security: missing auth + arbitrary email; also false positive on ctx.db.get            | ⚠️ Mixed | Caught the auth issue (inline on exports.ts:14) but also incorrectly flagged ctx.db.get("projects", id) as wrong API usage        |
| Copilot    | Yes        | Missing auth/authz enables exfiltration; also flagged PII logging and misleading toast | ✅ Pass  | 3 inline comments: auth (exports.ts:16), PII logging (exports.ts:29), misleading toast (ExportButton.tsx:20)                      |


## Takeaway

- **7 out of 9 tools caught the missing auth** (CodeRabbit, Greptile, Cubic, Qodo, CodeAnt AI, Sourcery, Copilot). This was the most universally detected issue across all PRs so far.
- **Macroscope and Graphite failed again**, producing zero findings. Macroscope has now missed the intended issue in 3 out of 4 PRs (only catching nothing in the false-positive test). Graphite has been inconsistent, passing the false-positive test but failing both true-positive tests.
- **Cubic stood out** by rating this as P0 (highest severity) and explicitly referencing the codebase pattern where other mutations check auth.
- **Copilot found three valid issues**: the auth gap plus two secondary findings (PII in logs, misleading toast text) that are genuinely useful.
- **Sourcery caught the auth issue but also produced a false positive**, incorrectly claiming `ctx.db.get("projects", id)` is wrong. This is the same false positive CodeRabbit made on PR #1 (though CodeRabbit caught it this time and even self-corrected).
- **Several tools also noted the arbitrary email exfiltration angle** (Cubic, Qodo, CodeRabbit, Copilot), showing deeper security reasoning beyond just "missing auth check."

## Detailed Tool Reviews

### CodeRabbit

- [Critical: Missing auth + arbitrary email enables data exfiltration](https://github.com/mikecann/cya-playground/pull/14#discussion_r2876601725) ✅ - Inline on `convex/exports.ts` lines 6-17, rated "Critical". Correctly identifies the `requestExport` mutation has no authorization checks and trusts a client-provided email, calling it "a direct data-exfiltration risk." Suggests resolving the authenticated user server-side and verifying project access. Earns both the "Flags missing auth" Pass and the "arbitrary email exfiltration risk" Bonus.
- [Major: generateAndSend is a no-op while UI reports success + PII logging](https://github.com/mikecann/cya-playground/pull/14#discussion_r2876601731) ⚠️ - Inline on `convex/exports.ts` lines 27-30, rated "Major". Notes the frontend shows "Export queued" success while the backend is a placeholder, and flags PII logging of raw email. The PII concern is legitimate; the no-op framing is presented as a UX mismatch rather than just "implement the TODO."
- [Correctly dismissed false ctx.db.get report](https://github.com/mikecann/cya-playground/pull/14#pullrequestreview-3880775972) ✅ - In the review body, CodeRabbit proactively noted the `ctx.db.get()` usage is correct and dismissed a potential false positive. Demonstrates codebase awareness and correct understanding of the Convex API. Notably, Sourcery fell for this exact false positive on the same PR.

**Overall verdict:** ✅ Pass
**Table validation:** Agrees

---

### Greptile

- [Missing authentication and authorization checks](https://github.com/mikecann/cya-playground/pull/14#discussion_r2876589924) ✅ - Inline on `convex/exports.ts` line 12, flagged "missing authentication and authorization checks - any user can export any project" with a code suggestion adding `getAuthUserId(ctx)` and project membership check.
- [Missing getAuthUserId import](https://github.com/mikecann/cya-playground/pull/14#discussion_r2876589990) ✅ - Inline on `convex/exports.ts` line 1, flagged the missing import and suggested adding it.
- [Summary: Critical Issue](https://github.com/mikecann/cya-playground/pull/14#issuecomment-3989201110) ✅ - Issue-level summary called it a "Critical Issue" with confidence 0/5, correctly elevating the auth gap. No false positives in the summary.

**Overall verdict:** ✅ Pass
**Table validation:** Agrees

---

### Macroscope

- No findings. Macroscope ran as a check run ("Macroscope - Correctness Check") and reviewed 4 code objects (`convex/exports.ts`, `ExportButton.tsx`, `api.d.ts`, `ProjectView.tsx`). Posted zero comments on any file and produced no PR reviews or issue comments. Did not flag the missing `getAuthUserId(ctx)` call despite reviewing `exports.ts` directly.

**Overall verdict:** ❌ Fail
**Table validation:** Agrees

---

### Cubic

- [P0: Missing auth/authz, codebase pattern violation](https://github.com/mikecann/cya-playground/pull/14#discussion_r2876601339) ✅ - Inline on `exports.ts:10`, correctly flagged missing auth as P0 (highest severity, confidence 10/10). Explicitly references codebase pattern: "Every other mutation in this codebase calls `getAuthUserId(ctx)`." Also mentions the arbitrary email exfiltration angle. Earns both bonuses.
- [P1: Client-provided email trusted by server without verification](https://github.com/mikecann/cya-playground/pull/14#discussion_r2876601344) ✅ - Legitimate secondary security finding on `ExportButton.tsx:19`. Correctly identifies that the email should be derived server-side, not passed from the client. Confidence 9/10.

**Overall verdict:** ✅ Pass
**Table validation:** Agrees

---

### Graphite

- No findings. Graphite's check run completed successfully but produced zero comments. Did not flag the missing `getAuthUserId(ctx)` call or any other issue.

**Overall verdict:** ❌ Fail
**Table validation:** Agrees

---

### Qodo

- [Unauthed export scheduling (Bug + Security)](https://github.com/mikecann/cya-playground/pull/14#discussion_r2876595408) ✅ - Inline on `exports.ts:18`, correctly identifies that `requestExport` does not authenticate the caller or verify project membership, and that the caller-supplied email allows sending sensitive data to arbitrary addresses. Evidence section explicitly contrasts with other project-scoped functions (`tasks.ts`, `projects.ts`, `members.ts`) that use `getAuthUserId(ctx)`. Earns both bonuses.
- [Success toast is red (Bug + Correctness)](https://github.com/mikecann/cya-playground/pull/14#issuecomment-3989191572) ✅ - Correctly notes that `addToast` on the success path omits the `type` parameter, and the `ToastProvider` defaults to `"error"`, so users see red error styling for a successful action. Valid secondary UX bug.
- [Email logged to server (Bug + Security)](https://github.com/mikecann/cya-playground/pull/14#issuecomment-3989191572) ✅ - Flags that `generateAndSend` logs the recipient email (PII) to server logs. Legitimate privacy concern, not flagging the stub itself.

**Overall verdict:** ✅ Pass
**Table validation:** Agrees

---

### CodeAnt AI

- [Missing auth/membership in requestExport mutation - Critical severity](https://github.com/mikecann/cya-playground/pull/14#discussion_r2876591625) ✅ - Inline on `exports.ts:10` with detailed reproduction steps citing `convex/projects.ts`, `convex/tasks.ts`, and `convex/members.ts` for codebase pattern contrast. Excellent finding.
- [Client-supplied email enables spoofing/exfiltration](https://github.com/mikecann/cya-playground/pull/14#issuecomment-3989202495) ✅ - Notes accepting client-provided email enables sending exports to arbitrary addresses. Deep security thinking bonus.
- [Incomplete action - generateAndSend is only a placeholder](https://github.com/mikecann/cya-playground/pull/14#issuecomment-3989202495) ❌ - False positive / auto-fail trigger. The stub is intentional and marked with a TODO. This is explicitly listed as "What a Tool Should NOT Say."
- [Rate Limiting - no throttling on scheduler endpoint](https://github.com/mikecann/cya-playground/pull/14#issuecomment-3989202495) ⚠️ - Debatable. Not unreasonable as a hardening note but adds noise.
- **"No security issues identified" header** contradicts the security findings listed below it. Confusing presentation.

**Overall verdict:** ❌ Fail (auto-fail triggered by flagging the generateAndSend placeholder)
**Table validation:** Agrees - final row and score now reflect the disqualifying placeholder false positive.

---

### Sourcery

- [Enforce authorization and tie export email to authenticated user](https://github.com/mikecann/cya-playground/pull/14#discussion_r2876584330) ✅ - Correctly identifies missing auth check and arbitrary email exfiltration risk. Tagged as `issue (security)`. Primary finding caught.
- [Double-check ctx.db.get usage](https://github.com/mikecann/cya-playground/pull/14#discussion_r2876584335) ❌ - Flagged `ctx.db.get("projects", args.projectId)` as wrong API usage. This is a false positive for this codebase's Convex API usage.
- [Consider handling loading state in ExportButton](https://github.com/mikecann/cya-playground/pull/14#pullrequestreview-3880756962) ⚠️ - Minor UX suggestion. Debatable nit.

**Overall verdict:** ⚠️ Mixed
**Table validation:** Agrees - mixed verdict stands because Sourcery caught the primary auth issue but also raised the ctx.db.get false positive.

---

### Copilot

- [Missing auth/authz enables data exfiltration via arbitrary email](https://github.com/mikecann/cya-playground/pull/14#discussion_r2876592611) ✅ - Correctly identifies missing auth check, explicitly references existing mutations (tasks.create, projects.remove) as the established pattern. Recommends `getAuthUserId(ctx)`, membership verification, and deriving email server-side. Primary finding caught with both bonuses.
- [PII logging of email in plaintext](https://github.com/mikecann/cya-playground/pull/14#discussion_r2876592633) ✅ - Flags raw email logged in `generateAndSend`, recommending redaction. Valid secondary finding.
- [Misleading success toast](https://github.com/mikecann/cya-playground/pull/14#discussion_r2876592659) ✅ - Notes toast says "check your email shortly" but backend only logs. Recommends adjusting message. Valid UX observation, not flagging the stub itself.

**Overall verdict:** ✅ Pass
**Table validation:** Agrees

## Scores

| Tool       | Primary | Bonus | Bonus Reason                                                                          | Score |
| ---------- | ------- | -------- | ---------------------------------------------------------------------------------------- | ----- |
| CodeRabbit | ✅ (3)  | +1       | Genuine PII logging concern; correctly dismissed ctx.db.get false positive others missed  | 4     |
| Greptile   | ✅ (3)  | 0        | Clean pass, import suggestion is part of the auth fix                                    | 3     |
| Macroscope | ❌ (0)  | 0        | No findings at all                                                                       | 0     |
| Cubic      | ✅ (3)  | 0        | Client email finding is part of the primary auth/security test                           | 3     |
| Graphite   | ❌ (0)  | 0        | No findings at all                                                                       | 0     |
| Qodo       | ✅ (3)  | +1       | Genuine toast color bug (UX) and PII logging concern, no false positives                 | 4     |
| CodeAnt AI | ❌ (0)  | 0        | Auto-fail captured in primary for flagging generateAndSend placeholder; no additional extras | 0     |
| Sourcery   | ⚠️ (1)  | 0        | ctx.db.get false positive already reflected in Mixed verdict                             | 1     |
| Copilot    | ✅ (3)  | +1       | Genuine PII logging and misleading toast findings, no false positives                    | 4     |
