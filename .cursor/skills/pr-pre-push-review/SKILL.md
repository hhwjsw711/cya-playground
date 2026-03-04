---
name: pr-pre-push-review
description: Review a proposed benchmark PR before pushing. Checks that the code looks natural, the intentional issue is present but not obvious, and there are no accidental giveaways. Run as a sub-agent with clean context.
---

# PR Pre-Push Review

## Purpose
Quality-check a benchmark PR's code before it goes to the review bots. The reviewer sub-agent should have NO knowledge of the benchmark - it should review the code as if it were a normal colleague reviewing a feature PR.

## How to Use
1. Read the expectations file for the PR (e.g. `pr-expectations/pr-03-missing-auth.md`).
2. Read all changed/new files that will be in the PR.
3. Launch a sub-agent with a CLEAN context using the prompt template below. Do NOT mention the benchmark, the expectations, or what we are testing. The sub-agent should just be a Convex code reviewer.
4. Compare the sub-agent's findings against the expectations file.
5. Report back: does the PR look natural? Did the sub-agent spot the intended issue? Are there any accidental problems that could distract the review bots?

## Sub-agent Prompt Template

Use this template, filling in the placeholders:

---

You are an experienced Convex developer reviewing a pull request for a team task management app.

The app uses:
- Convex backend with React + Vite frontend
- Convex Auth (password-based)
- Tables: users, projects, projectMembers, tasks, comments, activityLog, labels, taskLabels

The PR adds the following new file(s):

{paste the full file contents here}

For context, here are the existing patterns in the codebase:

{paste 1-2 representative existing files that show the correct pattern, e.g. tasks.ts for auth patterns}

Please review this PR as you would in a normal code review. Focus on:
1. Security issues (auth, access control, data exposure)
2. Performance concerns (Convex-specific: indexes, .collect(), read limits)
3. Correctness (does it do what it claims?)
4. Consistency with existing codebase patterns

Be specific. Quote the problematic lines. Suggest fixes where appropriate.

---

## Evaluation Checklist (done by the parent agent AFTER the sub-agent returns)

- [ ] **Natural appearance**: Does the code look like a plausible feature addition? Would a human developer write this?
- [ ] **Intended issue present**: Is the bug/anti-pattern we want to test actually in the code?
- [ ] **No benchmark giveaways**: No comments, variable names, or patterns that hint at testing
- [ ] **No accidental issues**: Are there other bugs that would distract the review bots from the intended finding?
- [ ] **Consistent style**: Does the code match the rest of the codebase (imports, formatting, patterns)?
- [ ] **Cover story holds up**: Does the PR title/description match the code without revealing intent?

## Output Format

Report findings as:

```
## Pre-Push Review: PR #NN - <name>

### Sub-agent Findings
<summary of what the clean reviewer found>

### Checklist
- [x] or [ ] for each item above

### Verdict
READY TO PUSH / NEEDS CHANGES

### Notes
<any changes needed before pushing>
```
