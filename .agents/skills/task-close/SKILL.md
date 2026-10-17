---
name: task-close
description: "Trigger: task close, finish task, delivery, ready for review. Prepare truthful Rentoru closure evidence and parent-owned integration handoff."
---

## Activation Contract

Load automatically when preparing project task closure or delivery.
Do not require a human slash command. For new task setup, load task-start instead.

## Hard Rules

- Read [AGENTS.md §6](../../../AGENTS.md#6-delivery); it owns all lifecycle policy.
- Preserve historical evidence and distinguish current facts from superseded status.
- Leave commits, push, PRs, merges and cleanup orchestration to the parent.
  Do not equate local checks with CI, browser acceptance or delivered work.

## Decision Gates

| Situation | Action |
| --- | --- |
| Required check failing or missing | Report partial with exact evidence and next check |
| Screen changed since human acceptance | Require renewed acceptance before push |
| Final aggregate exceeds budget | Stop for explicit exception or coherent replan |
| Human merge not observed | Report ready-for-review, not merged |
| Resource ownership or loss unresolved | Preserve it; return concrete cleanup choices |

## Execution Steps

1. Read back acceptance criteria and diff, including untracked skills, tests and docs.
2. Collect observed RED/GREEN, mutation and served-output evidence, or the justified
   passive-documentation exception; list exact commands and results without reruns invented.
3. Record human browser acceptance for the actual served version when applicable.
4. Prepare closure/evidence inside the final candidate before integration;
   preserve later completed work when reconciling stale ledgers.
5. Hand off the route, complete additions + deletions and residual risks.
   After human integration, report actual dev verification and owned-service disposition
   only when observed under the authoritative cleanup gates.

## Output Contract

Return task ID, cwd/branch/base, actual URL or no app served, changed files,
complete budget, checks/results, acceptance, remaining limits and integration route.
Distinguish ready-for-review, published and human-merged facts. Report retained
resources, confirmed owned services stopped and any cleanup awaiting confirmation.

## References

- [Mandatory lifecycle](../../../AGENTS.md#6-delivery)
- [Task start](../task-start/SKILL.md)
