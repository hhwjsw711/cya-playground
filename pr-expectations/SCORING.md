# Scoring Criteria

## Overview

Each of the 10 PRs is scored independently for each tool. The score has two components:

1. **Primary Verdict** (0-2 points) - Did the tool pass the core test for this PR?
2. **Quality Bonus** (-1 to +1) - How good was the tool's output beyond the primary test?

This gives a range of **-1 to 4 per PR**, and **-10 to 40 total** across all 10 PRs.

## Primary Verdict

The primary verdict is based on whether the tool caught (or correctly avoided) the specific issue each PR was designed to test.


| Verdict  | Points | Meaning                                                                                                 |
| -------- | ------ | ------------------------------------------------------------------------------------------------------- |
| ✅ Pass   | 3      | Correctly identified the core issue (true positive PRs), or correctly stayed silent (false positive PR) |
| ⚠️ Mixed | 1      | Partially identified the issue, or right idea with wrong reasoning                                      |
| ❌ Fail   | 0      | Missed the core issue entirely, or made the critical false positive                                     |


## Quality Bonus

The bonus scores everything OUTSIDE the primary test. It does not double-count the primary finding.

### +1 (Bonus)

The tool found at least one genuinely useful secondary finding that a developer would want to know about, AND made no significant false positives on that PR.

Examples:

- Greptile catching `assigneeName` null vs "Unknown" inconsistency (PR #1)
- Copilot catching `dueDate` truthy check treating `0` as no date (PR #5)
- Qodo catching cross-project label data integrity concern (PR #1)

A finding only qualifies as a bonus if it's a DIFFERENT issue from the primary test, not just restating the same thing with different words.

### 0 (Neutral)

Default state. Applies when:

- Clean pass or fail with no notable secondary findings
- Minor true positive and minor false positive cancel out
- Secondary findings just rephrase the primary issue (no double-dipping)

### -1 (Penalty)

The tool made a significant false positive that would actively mislead a developer, AND any valid secondary findings don't outweigh it.

"Significant" means:

- Factually wrong claims (e.g. claiming a correct API form is broken)
- Flagging auth on `internalQuery` when that's irrelevant to the function type
- Suggesting patterns that don't exist in the framework (SQL JOINs, batch APIs that don't exist)
- Framing correct code as a critical bug

**Weighting rule:** A minor true positive does not redeem a major false positive. If a tool says something genuinely wrong at high severity and also spots a minor code style thing, that's still a -1. But if the false positive is small and the true finding is significant, they wash out to 0.

## Score Table


| Primary Verdict | Bonus     | PR Score |
| --------------- | ------------ | -------- |
| Pass (3)        | Bonus (+1)   | **4**    |
| Pass (3)        | Neutral (0)  | **3**    |
| Pass (3)        | Penalty (-1) | **2**    |
| Mixed (1)       | Bonus (+1)   | **2**    |
| Mixed (1)       | Neutral (0)  | **1**    |
| Mixed (1)       | Penalty (-1) | **0**    |
| Fail (0)        | Bonus (+1)   | **1**    |
| Fail (0)        | Neutral (0)  | **0**    |
| Fail (0)        | Penalty (-1) | **-1**   |


## PR Test Types


| PR     | Test Type      | What We're Testing                                    |
| ------ | -------------- | ----------------------------------------------------- |
| PR #1  | False Positive | Nested `ctx.db` calls are NOT N+1 in Convex           |
| PR #2  | True Positive  | `.filter()` instead of `.withIndex()`                 |
| PR #3  | True Positive  | Missing auth check on public mutation                 |
| PR #4  | True Positive  | `mutation` should be `internalMutation`               |
| PR #5  | True Positive  | Unbounded `.collect()` on growable query              |
| PR #6  | True Positive  | `.collect().length` instead of bounded count          |
| PR #7  | True Positive  | Unbounded array in document schema                    |
| PR #8  | True Positive  | Missing aggregate update in new mutation              |
| PR #9  | True Positive  | OCC contention on singleton hot document              |
| PR #10 | True Positive  | Auth without authorization (missing membership check) |


## Notes

- PR #1 is the only false-positive test. A "Pass" there means the tool correctly did NOT flag N+1.
- PRs 2-10 are true-positive tests. A "Pass" means the tool correctly DID flag the issue.
- The bonus is intentionally conservative. Most PRs should score 0 on the bonus. Bonuses and penalties are for standout cases only.

