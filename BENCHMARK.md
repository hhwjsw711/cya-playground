# CYA Playground - Convex CI Code Review Tools Benchmark

## Goal

Evaluate how well AI code review / CI checking tools catch issues in **newly added code
via pull requests** on a Convex project. Test whether they catch security holes, performance
problems, best practice violations, and subtle bugs, and whether their suggestions are
Convex-aware or generic.

**Scope**: PR-based code review only. Some tools also offer full codebase scanning
(Cubic, Aikido, CodeAnt), but that's a separate capability not tested here.

## Tools Under Test

| Tool | Type | URL |
|------|------|-----|
| CodeRabbit | AI code review | coderabbit.ai |
| Greptile | AI code review | greptile.com |
| Macroscope | AI review + team insights | macroscope.com |
| Cubic | AI code review (YC-backed) | cubic.dev |
| Graphite AI Review | AI review in Graphite | graphite.com |
| Qodo | AI code review | qodo.ai |
| Aikido | Security + code quality | aikido.dev |
| CodeAnt AI | Review + security + quality | codeant.ai |
| Sourcery | AI code review | sourcery.ai |

## The App: TaskFlow

A team task management app built with Convex + React + Vite + Convex Auth.

Tables: users, projects, projectMembers, tasks, comments, activityLog, labels, taskLabels

Features: Authentication, project CRUD, kanban task board, comments, activity logging,
member management, labels.

## PR Structure

All tools installed on this repo. Each PR targets one issue category.
Each PR adds NEW features with naturally embedded issues (not modifying existing clean code).

### PR #0 - Baseline (Control)

**Branch**: `mikec/baseline-feature`

Clean, well-implemented feature addition. Purpose: measure false-positive rates and
establish what each tool says about good code.

### PR #1 - Security Issues

**Branch**: `mikec/feature-user-profiles`
**Cover story**: Adding user profile management and project permissions

Intentional issues: missing auth checks, exposed internal functions, data leaks,
missing ownership validation, missing argument validators.

### PR #2 - Performance Issues

**Branch**: `mikec/feature-task-filtering`
**Cover story**: Adding advanced task filtering and reporting

Intentional issues: full table scans, N+1 patterns, missing indexes, no pagination,
overly broad data fetching.

### PR #3 - Best Practice Violations

**Branch**: `mikec/feature-notifications`
**Cover story**: Adding notification system and integrations

Intentional issues: HTTP calls in mutations, v.any() validators, raw string IDs,
missing scheduled functions, poor error handling, non-deterministic calls in mutations.

### PR #4 - Subtle / Advanced Issues

**Branch**: `mikec/feature-analytics`
**Cover story**: Adding analytics dashboard and counters

Intentional issues: hot counter OCC conflicts, missing cascading deletes, race conditions,
partial state updates.

## Scoring Rubric

For each intentional issue, score each tool:

- **Detection** (0/1): Did it flag the issue?
- **Accuracy** (0-3): 0=wrong, 1=vague, 2=correct but generic, 3=correct and Convex-aware
- **Actionability** (0-3): Did it suggest a fix? Was the fix correct for Convex?
- **False positives**: Count of non-issues flagged per PR

### PR #5 - Bonus: Orphan Branch (Full Codebase Review)

**Branch**: `mikec/broken-full-app` -> targets orphan branch `mikec/empty-base`
**Purpose**: Entire broken codebase added as new code via orphan branch.
Tests whether tools catch issues when reviewing a full app dump, not the core benchmark.

Issues: unbounded `.collect()`, missing auth, no batched cascading deletes,
missing indexes, and other issues from PRs #1-4 baked in from the start.

## Status

- [x] App built and deployed on main
- [ ] Baseline PR created
- [ ] Security issues PR created
- [ ] Performance issues PR created
- [ ] Best practices PR created
- [ ] Subtle issues PR created
- [ ] Orphan branch bonus PR created
- [ ] All tools signed up and installed
- [ ] Benchmark run completed
- [ ] Results compiled
