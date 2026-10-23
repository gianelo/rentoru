---
name: task-start
description: "Trigger: task start, begin task, implementation, new work unit. Establish the mandatory Rentoru task workspace and gates before edits."
---

## Activation Contract

Load automatically before starting project task work, including documentation.
Do not require the human to invoke a slash command. For closure, load the
sibling task-close skill instead.

## Hard Rules

- Read [AGENTS.md §6](../../../AGENTS.md#6-delivery) as the authoritative lifecycle;
  follow its isolation, data, verification and human acceptance gates.
- Read the task's intent, acceptance criteria and relevant design decisions.
  Check existing implementation and evidence before assuming unchecked means absent.
- Leave workspace setup, Git, delegation and resource orchestration to the parent.
  Do not edit until the parent supplies a verified task sibling and allowed surfaces.

## Decision Gates

| Situation | Action |
| --- | --- |
| Workspace or scope unverified | Stop; return concrete choices for parent resolution |
| Manual DB also proposed for destructive tests | Require separately owned test resources |
| Screen change | Plan human browser acceptance before push |
| Passive documentation | Name proportionate structural checks; no fabricated RED |

## Execution Steps

1. Confirm task cwd, branch, fresh dev base SHA and pre-existing changes.
2. Identify acceptance criteria, smallest real caller, risks and exact checks.
3. Record manual versus test resource ownership and actual served URL, or no app served.
4. Estimate complete additions + deletions, including tests, docs and closure room.
   Select direct-dev delivery or a bounded chain under the authoritative budget.
5. Return the start record before implementation; surface unresolved decisions.

## Output Contract

Return task ID, cwd, branch, base SHA, allowed surfaces, acceptance criteria,
checks, budget/route, resource ownership, actual URL and unresolved gates.
State whether ready to edit; never claim browser acceptance or checks not observed.

## References

- [Mandatory lifecycle](../../../AGENTS.md#6-delivery)
- [Task closure](../task-close/SKILL.md)
