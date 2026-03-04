# PR Detailed Review

## Purpose

For each AI code review tool on a PR, fetch all comments/reviews from GitHub, list every distinct finding with a direct link, and assess whether each is valid, a false positive, or debatable. Also validate the existing results table.

## Critical Scoring Rule

**The expectations file is gospel.** Each PR's expectations file defines:
- **"What a Tool Should NOT Say/Flag"** - these are the false positives we are testing for
- **"What a Tool Should/Might Legitimately Say"** - these are acceptable/valid findings
- **Scoring criteria** with explicit pass/fail/mixed rules

If a tool triggers ANY item listed under the "Should NOT Say/Flag" section, that is an **automatic fail** for that tool on that PR, regardless of any other valid findings it may have made. Other valid findings are still noted in the detailed review but do not change the verdict.

**Verdict categories:** Use whatever verdicts the expectations file's Scoring section defines. Most files use Pass, Mixed, and Fail. Some may also use N/A (e.g. when a tool's review errored out). Do NOT force a binary Pass/Fail if the scoring rubric explicitly defines a Mixed category.

## Prerequisites

- `gh` CLI authenticated with access to the target repo
- The PR's expectations file exists at `pr-expectations/pr-NN-<slug>.md`
- `.cursor/rules/convex_rules.mdc` contains the Convex domain knowledge

## Workflow

1. Read the expectations file to understand what's being tested and the scoring rules
2. Extract the GitHub PR URL from the Results section (format: `https://github.com/{OWNER}/{REPO}/pull/{PR_NUMBER}`)
3. Fetch the PR's head commit SHA via `gh api repos/{REPO}/pulls/{PR_NUMBER} --jq '.head.sha'`
4. Extract each tool's existing Results table row to pass into its sub-agent prompt
5. Extract the "Should NOT Say/Flag" items to inline in each sub-agent prompt as auto-fail triggers
6. For each of the 9 tools, launch a **self-contained** sub-agent (type: `generalPurpose`) that:
   a. Reads `.cursor/rules/convex_rules.mdc` FIRST (MANDATORY, before any evaluation)
   b. Reads the expectations file to understand pass/fail criteria
   c. Fetches its own review data from GitHub via `gh api`
   d. Lists and evaluates each finding against the expectations
   e. Determines a verdict using the categories defined in the Scoring section
   f. Validates the existing results table row for its tool
7. Compile all sub-agent outputs into the expectations file under `## Detailed Tool Reviews`
8. If any sub-agent flags a table correction, **do NOT apply it automatically**. Instead, report the disagreement to the user and ask before making any table changes.

## Batching (max 4 concurrent sub-agents)

- Batch 1: CodeRabbit, Greptile, Macroscope, Cubic
- Batch 2: Graphite, Qodo, CodeAnt AI, Sourcery
- Batch 3: Copilot

## Bot Username Mappings

| Tool       | Bot Username             | Primary Data Source          |
| ---------- | ------------------------ | ---------------------------- |
| CodeRabbit | `coderabbitai[bot]`      | reviews + inline comments    |
| Greptile   | `greptile-apps[bot]`     | reviews + inline + issue     |
| Macroscope | n/a                      | check-runs only              |
| Cubic      | `cubic-dev-ai[bot]`      | reviews + inline comments    |
| Graphite   | n/a                      | check-runs only              |
| Qodo       | `qodo-code-review[bot]`  | reviews + inline + issue     |
| CodeAnt AI | `codeant-ai[bot]`        | issue comments               |
| Sourcery   | `sourcery-ai[bot]`       | reviews + inline + issue     |
| Copilot    | `copilot[bot]`           | per-review inline comments   |

## GitHub API Endpoints

Each sub-agent should fetch from these endpoints (filtering by bot username):

```
gh api repos/{REPO}/pulls/{PR}/reviews --paginate
gh api repos/{REPO}/pulls/{PR}/comments --paginate
gh api repos/{REPO}/issues/{PR}/comments --paginate
gh api repos/{REPO}/pulls/{PR}/reviews/{REVIEW_ID}/comments
gh api repos/{REPO}/commits/{SHA}/check-runs
```

Use `--jq` filters to reduce output volume, e.g.:
```bash
gh api repos/{REPO}/pulls/{PR}/reviews --paginate --jq '[.[] | select(.user.login == "{BOT}") | {id, body, html_url}]'
```

## Sub-agent Prompt Template

The orchestrator must fill in ALL placeholders before dispatching:
- `{TOOL}` - tool name (e.g. "CodeRabbit")
- `{BOT}` - bot username from mapping table (e.g. "coderabbitai[bot]")
- `{REPO}` - full repo path (e.g. "mikecann/cya-playground")
- `{PR}` - GitHub PR number (extracted from expectations file URL)
- `{SHA}` - head commit SHA (fetched from GitHub API)
- `{EXPECTATIONS_FILE}` - filename of expectations file (e.g. "pr-02-filter-vs-index.md")
- `{AUTO_FAIL_ITEMS}` - the actual "Should NOT Say" items, copied verbatim from the expectations file
- `{TABLE_ROW}` - the tool's existing row from the Results table, copied verbatim
- `{SCORING_SECTION}` - the Scoring section from the expectations file, copied verbatim

For **check-run-only tools** (Macroscope, Graphite): replace Step 2 fetch instructions with the check-runs variant shown below.

---

### Standard Template (bot-username tools)

You are evaluating **{TOOL}**'s code review of PR #{PR} on `{REPO}` (head commit: `{SHA}`).

#### Step 1: Read Context (MANDATORY - DO THIS BEFORE ANYTHING ELSE)
- Read `.cursor/rules/convex_rules.mdc` FIRST. This is the AUTHORITATIVE source for Convex API correctness. You MUST read this file before evaluating any findings. Do NOT judge whether Convex API usage is correct or incorrect without consulting this file.
- Read `pr-expectations/{EXPECTATIONS_FILE}` - this is the PRIMARY reference for all scoring decisions.
- IMPORTANT: The convex rules file contains examples but does not exhaustively document every overload. If code in the PR uses a Convex API in a way not shown in the examples, do NOT assume it is wrong. Only flag API usage as incorrect if the rules file explicitly says it is wrong, or if it contradicts a documented pattern.

#### Step 2: Fetch Review Data
{TOOL}'s bot username is `{BOT}`. Fetch all review data using `gh api`:

```
gh api repos/{REPO}/pulls/{PR}/reviews --paginate --jq '[.[] | select(.user.login == "{BOT}") | {id, body, state, html_url}]'
gh api repos/{REPO}/pulls/{PR}/comments --paginate --jq '[.[] | select(.user.login == "{BOT}") | {id, body, path, line, html_url}]'
gh api repos/{REPO}/issues/{PR}/comments --paginate --jq '[.[] | select(.user.login == "{BOT}") | {id, body, html_url}]'
```

For each review ID found, also fetch per-review inline comments:
```
gh api repos/{REPO}/pulls/{PR}/reviews/{REVIEW_ID}/comments --jq '[.[] | {id, body, path, line, html_url}]'
```

#### Step 3: Evaluate Each Finding
For every distinct issue/concern raised:
- Brief description of what was flagged
- Link to the specific GitHub comment (`html_url`)
- Verdict on the individual finding: ✅ (legitimate), ❌ (false positive), or ⚠️ (debatable)
- Brief explanation referencing the expectations file and Convex rules

#### Step 4: Determine Overall Verdict

**Auto-fail triggers** (if the tool said ANY of these, it is an automatic ❌ Fail regardless of other findings):
{AUTO_FAIL_ITEMS}

**Scoring rubric from expectations file:**
{SCORING_SECTION}

Apply the scoring rubric using the verdict categories it defines (typically Pass, Mixed, Fail). If the tool triggered any auto-fail item, override to ❌ Fail.

#### Step 5: Validate Existing Table Row
The existing Results table row for {TOOL} is:
{TABLE_ROW}

If your assessment disagrees with what's recorded (especially the Verdict), explain what should change and why.

#### Output Format
Return exactly:

```
### {TOOL}
- [description](link) verdict - explanation

**Overall verdict:** ✅ Pass / ⚠️ Mixed / ❌ Fail
**Table validation:** Agrees / Disagrees - explanation
```

---

### Check-Run Template (Macroscope, Graphite)

Same as above but replace Step 2 with:

#### Step 2: Fetch Review Data
{TOOL} is a check-run-only tool. Search the check-runs endpoint:

```
gh api repos/{REPO}/commits/{SHA}/check-runs --jq '[.check_runs[] | {name, app_slug: .app.slug, status, conclusion, output_title: .output.title, output_summary: .output.summary, output_text: .output.text, html_url}]'
```

Look for check runs from {TOOL} (search by app slug or name). If output text is truncated, fetch the full check run by ID.

Also check for any PR comments or reviews in case the tool posted there too:
```
gh api repos/{REPO}/pulls/{PR}/reviews --paginate --jq '[.[] | {user: .user.login, id, state}]'
gh api repos/{REPO}/issues/{PR}/comments --paginate --jq '[.[] | {user: .user.login, id}]'
```

---

## Output Location

Append `## Detailed Tool Reviews` section to the expectations file, below the existing Takeaway section, with one `### ToolName` sub-section per tool in standard order:
CodeRabbit, Greptile, Macroscope, Cubic, Graphite, Qodo, CodeAnt AI, Sourcery, Copilot.

If a `## Detailed Tool Reviews` section already exists (from a previous run), replace it entirely with the new results.
