---
name: pr-reviewer-benchmark
description: Evaluate AI code reviewers on a single GitHub PR using a fixed rubric and produce a consistent results table. Use when benchmarking PR review bots, comparing false positives, or updating pr-expectations reports.
---

# PR Reviewer Benchmark

## Purpose
Score each reviewer on a PR with a repeatable process, then append a viewer-friendly table to `pr-expectations/pr-NN-*.md`.

## Workflow
1. Confirm the target PR number and target expectation file.
2. Collect evidence from GitHub:
   - PR review comments (`/pulls/{n}/comments`) - top-level inline comments
   - PR review summaries (`/pulls/{n}/reviews`) - get each review's `id` and `body`
   - Per-review inline comments (`/pulls/{n}/reviews/{review_id}/comments`) - CRITICAL: some tools (notably Copilot) only surface inline comments here, not in the top-level comments endpoint. Always enumerate review IDs and fetch comments for each.
   - Check-runs (`/commits/{sha}/check-runs`)
3. Evaluate each reviewer using separate fresh sub-agents (no resume) so each tool is judged independently.
4. Collate findings in a single table with fixed columns.
5. Add a short takeaway section with 3-5 bullets.

## Required Table Format
Use this exact column set:

| Tool | Responded | Primary Finding | Verdict | Evidence |
| --- | --- | --- | --- | --- |

Definitions:
- `Responded`: `Yes`, `No`, or `Check only`
- `Primary Finding`: one-line summary of the main actionable signal
- `Verdict`: one of:
  - `Pass`
  - `Fail - false positive`
  - `Mixed`
  - `Neutral`
  - `N/A`
- `Evidence`: short quote or artifact type, for example `inline comment on convex/overview.ts` or `check run only`

## Scoring Rubric (Convex-focused)
- Do not treat nested `ctx.db` calls in one Convex query as classic network N+1 by default.
- Legitimate concerns are still allowed (for example unbounded reads, real security leakage, schema mismatch).
- Check-only security bots can be `Neutral` when they do not provide code-level review.
- If a tool gives one false positive and one valid concern, mark `Mixed`.

## Sub-agent Instructions Template
For each reviewer, launch a fresh sub-agent and provide:
- PR number
- reviewer/tool name
- only that tool's comments/check output
- rubric above

Ask sub-agent to return strict JSON:

```json
{
  "tool": "ToolName",
  "responded": "Yes|No|Check only",
  "primaryFinding": "one line",
  "verdict": "Pass|Fail - false positive|Mixed|Neutral|N/A",
  "evidence": "short evidence string"
}
```

## Output Location
- Append/update the report section in `pr-expectations/pr-NN-*.md`.
- Keep wording concise for video readability.
- Keep table order consistent across PRs:
  1. CodeRabbit
  2. Greptile
  3. Macroscope
  4. Cubic
  5. Graphite
  6. Qodo
  7. CodeAnt AI
  8. Sourcery
  9. Copilot
