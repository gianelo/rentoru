# AGENTS.md

Read this before writing anything in this repository. It is agent-agnostic on purpose — Claude, Codex, Cursor, whatever comes next.

`rentoru.com` is a free long-stay residential rental marketplace for Distrito Capital and Maracaibo. Publishing and searching are free; the platform never holds money, writes contracts, or takes a commission. When a tenant finds something, they register and get the publisher's WhatsApp.

---

## 1. The rules that are not negotiable

**No business rules in the front. Ever.** This is the founder's permanent rule, stated in those words. Rules live in `src/modules/*/domain/` (pure) or `src/modules/*/application/` (orchestration). `app/` and `components/` render decisions that arrive already made — they never make one. If you find yourself writing an `if` in a component that decides *what the product does* rather than *what this pixel shows*, it belongs in a domain.

The practical reason sits next to the principle: the 90% coverage floor reaches `src/modules/` and does not reach `app/`. A rule written in a component is a rule nothing protects.

**Strict TDD.** RED before GREEN, literally. Write the failing test, watch it fail, then make it pass. A test you never saw fail is decoration, not coverage.

**Mutation-check what matters.** After a test passes, break its subject on purpose and confirm that test — not another one — turns red. Then restore. This repo has caught real defects this way and the habit is why.

**Every new rule ships with a test on the served HTML, not on the call.** A fully-tested domain with no caller, and an optional argument nobody passes, read identically to code that works — `return-to-results.ts` shipped at 100% coverage with a caller no results screen fed (tasks.md 8.7), and the ficha's fourth argument to `buildListingGrid` went unpassed the exact same way (tasks.md 22.30). Mechanical detection was tried and rejected — an unfilled optional argument is often legitimate, so the check would false-positive on purpose, not by accident. A test asserting on the rendered body cannot pass while the argument never travels; that is the guard, not a spy on the call.

**No `Co-Authored-By` and no AI attribution in commits.** Conventional commits, written in Spanish, matching `git log --oneline -20`.

---

## 2. The design system is the visual source of truth

**Do not invent a screen. Derive it.**

| Where | What |
|---|---|
| `design/reference/sistema/SISTEMA.md` | The system of record. Structure `compacto` + palette `menta` (D14/D16). |
| `design/reference/sistema/tokens.css` | The reference tokens. |
| `src/styles/tokens.css` | The tokens production actually uses. |
| `design/pantallas/*.dc.html` | 9 boards: Entrar, Ficha, Lista y Filtros, Publicar (mobile + desktop), plus Sistema. |
| `design/especificaciones/*.md` | Flows, mobile UX, and per-screen specs. |

**The boards cover 6 of the product's 22 surfaces.** The other 16 — empty states, rejected, expired, sign-up, contribution, emails — are explicitly **derived from the system, never improvised**: same tokens, same three-button hierarchy, same row anatomy. SISTEMA.md says it outright: *"Si una pantalla necesita un valor que el sistema no define, se extiende el sistema; no se inventa un valor local."*

**Tokens are enforced, not suggested.** `pnpm lint:tokens` runs `scripts/lint-tokens.mjs` and is its own CI job. A hardcoded colour, size, or shadow fails the build. If a token is missing, add it to the system — do not write the literal.

**The `.dc.html` boards are references, not code to copy.** They carry the design tool's own `support.js` runtime and inline styles; none of that reaches production. Recreate the design with this codebase's own patterns.

**Glyphs are text characters — plus exactly two inline SVGs.** `←`, `✓`, `✱`, `×`, `·` are characters, not images. The closed exception (founder, 2026-08-25) is the search pill's **filter** and **magnifying glass**: inline, `aria-hidden`, `stroke="currentColor"`, with an accessible label beside them. **No icon package, ever**, and a third icon is a change to the system rather than a use of it. `SISTEMA.md`'s Assets section is the authority.

**The read path WORKS without JavaScript, and may be better with it (D13).** Search, results, and the listing page must function with scripting disabled — forms are real `<form method="get">` / native POST, and every action has an `href` or a form underneath it. On top of that floor, JavaScript is welcome and expected: a search modal, live result counts, suggestions while typing, a photo viewer that does not reload.

This is progressive enhancement, not a ban. The distinction that matters: **the base must not depend on the script arriving.** A menu that only exists in JavaScript locks out anyone whose bundle failed; the same menu layered over a real link locks out nobody.

Two things make it measurable rather than aspirational, and neither is optional:

- **`pnpm budget:bundle`** — 130 KB gzip of first-load JS on the read path. About 102 KB of that is Next.js plus React, a floor nobody controls, so roughly **28 KB is what this codebase may add**. It is a budget, not a prohibition.
- **The `crawlability` e2e project** runs the suite with scripting off. That is what turns "works without JavaScript" from a claim into a measurement.

Why it matters here specifically, and none of the three reasons is aesthetic: organic search is this product's acquisition channel and a zone page that needs JavaScript to render listings indexes badly; connections in Venezuela are poor and data is expensive, so a bundle that fails to arrive leaves a blank page rather than a degraded one; and listings circulate by WhatsApp, whose in-app browser is where scripts break most often.

Two surfaces are exempt because they are not the read path and sit behind a session: **publish step 2** (photo compression happens in the device, which is the difference between uploading 30 MB and 1) and **bulk import** (the file preview). `/mis-avisos` and the import screens are equally exempt for the same reason.

---

## 3. Architecture

```
src/modules/<capability>/
  domain/          pure rules, no I/O, no Date injected from outside
  application/     use cases + ports (interfaces the domain needs)
  infrastructure/  adapters (Drizzle, R2, Resend, Auth.js)
app/               Next.js routes and pages — render only
components/        atoms / molecules / organisms — render only
```

Ports are narrow on purpose. `ContactRevealEventPort` has only `record()` — no update, no delete — because the table is append-only evidence. When you need to read from a table whose write port is deliberately narrow, **add a read port beside it**; do not widen the write one.

A domain function should take what a port already found and answer one question. `src/modules/contact-reveal/domain/reveal-rate-limit.ts` is the idiom: it receives the listing ids already inside the window and decides one thing, with no `Date` and no I/O.

---

## 4. Commands

```
pnpm test:unit          vitest run
pnpm test:integration   needs: separately owned Postgres + intended local migrations (§6)
                        teardown: only confirmed task-owned disposable resources (§6)
pnpm test:e2e           playwright — runs against a preview, or a local production build
pnpm typecheck          tsc --noEmit
pnpm lint               biome check .        (your own formatting errors WILL fail the build;
                                              pnpm exec biome check --write <file> fixes them)
pnpm lint:tokens        the design-token gate
pnpm db:generate        drizzle-kit generate
```

Coverage floor: 90% statements/branches/functions over `src/modules/**`. `app/` and `components/` carry none.

CI note: heavy jobs are gated on `github.event_name == 'push'`, so the `pull_request` run shows many `skipping` lines on purpose — it is not a failure.

### Debugging without remote trial-and-error

These rules complement Gentle Shell; they do not replace its workflow or disable required tests, reviews, consent, or safety controls. Improve the diagnosis, not bypass the harness.

- Separate failures before fixing them. Different failing tests do not establish a shared cause.
- Capture discriminating evidence first: the exact assertion, relevant sanitized diff, and failing execution stage. Generic error categories are not a diagnosis. Never expose credentials or user data.
- Reproduce the failure through the smallest real caller using existing tools and a safe environment. If reproduction is only possible in CI, make the diagnostic distinguish concrete competing hypotheses. This never authorizes prohibited services or credential access.
- Every diagnostic push or rerun must name its hypothesis, expected evidence, and next decision. After two consecutive CI cycles without new discriminating evidence, stop speculative patches and re-examine the caller, framework, and test harness.
- Keep related diagnostics and checks in one coherent work unit where possible. Preserve required tests and reviews; do not multiply units merely to publish incremental logging.
- After 20 minutes without narrowing the failure, report what is known, what remains unknown, and the next discriminating check. Do not claim elapsed time unless measured.
- Never obtain green by weakening assertions, increasing timeouts, ignoring errors, or removing guards without a demonstrated reason. A later passing run does not prove the original cause was fixed.

---

## 5. The plan, and why a checkbox can lie

Planning artifacts live in `openspec/changes/mvp-rental-listings/`: `proposal.md`, `design.md`, `tasks.md`, and per-capability specs under `specs/`.

### Proportionate scope and verification

**Do not turn a small product change into a testing-infrastructure project.** Overengineering is a scope defect, not evidence of rigor. These rules complement the harness; they do not waive required checks.

- Before writing, name the acceptance criteria, changed behavior, concrete risks and smallest real caller that can prove them. Separate necessary checks from unrelated behavior already protected by existing tests.
- Reuse existing tests, fixtures and tools first. Every new fixture, abstraction, invariant or infrastructure change must address a named acceptance criterion or demonstrated risk—not hypothetical future coverage. Explain why existing support cannot exercise the required check before replacing or extending it.
- For presentation-only changes, verify the applicable rendered output, accessibility and browser interactions. Do not automatically add destructive CRUD, upload/storage, authentication redesign or full persistence coverage when those behaviors are unchanged.
- Validate new fixture facts against the real schema, caller and relevant runtime policies before treating fake-port GREEN as readiness. A passing fake does not establish valid SQL, session lifetime or served behavior.
- Estimate normally formatted code, tests, fixtures and complete documentation together before implementation. If verification support outweighs the accepted change or requires additional review units, reassess the minimum necessary scope before writing more. Splitting into more PRs does not cure unnecessary scope; split only the coherent work that remains necessary.
- After two inaccurate estimates or repeated stops on the same blocker without new discriminating evidence, stop implementation and revise the approach. Report what is verified, what remains blocked and one bounded next check. Ask for authorization when the revised approach expands the approved scope; do not make the human manage internal paths or repeated budget guesses.
- Never solve scope or schedule pressure by weakening assertions, dropping required coverage, skipping TDD/mutation/review/safety gates or claiming pending checks passed. Keep unrelated improvements as follow-ups, not additions to the current task.

**Keep visible TODO lists short and bounded.** Each item has one short action title and, only when necessary, one brief current-status note. Show the current work unit, not every diagnostic attempt or historical step. Keep commands, evidence, resource IDs, explanations and history in the task document, not in the visible TODO. Group related work without hiding unfinished work; refresh the list as the scope changes.

**`design.md` is where decisions and their reasons live.** Read the relevant section before changing anything it covers — especially "Open Questions", which holds real founder decisions that block real work.

**Before building a task, check whether it already exists.** This has bitten the project more than once: a whole phase sat unmarked in `tasks.md` while its code was merged and tested. An agent that trusts the checkbox writes a second migration for a table that is already there.

Before final integration, record each completed task with **the file and the named test that proves it** — not a bare `[x]`; for passive documentation, name the structural check instead. Apply §6 to distinguish verified work from delivered/merged facts. And when the implementation deviates from the task text for a good reason, record it as a correction with the reason. Two examples already in the file: `listing_reminder`'s unique key is `(listing_id, kind, expires_at)` and not the two columns the task named, because one cycle sends two notices; and the auto-hide state is `hidden`, not the `hidden_by_reports` the task text invented.

---

## 6. Delivery

### Mandatory task lifecycle — single source of authority

Agents MUST load `.agents/skills/task-start/SKILL.md` before task work and `.agents/skills/task-close/SKILL.md` when preparing closure. No user slash command is required. These skills guide agents; they are not runtime hooks. Pi discovers project `.agents/skills/` through cwd ancestors up to the repository root; no install or settings change is needed.

**Start and isolation.** Before task edits, the parent updates `origin/dev` in `rentas.com.ve` and creates a sibling worktree under `/Users/gianelo/Documents/Dev/py` from that fresh base. Use names such as `rentoru-phase36-task-36-11`; documentation/nonphase tasks may use descriptive names such as `rentoru-workflow-task-lifecycle`. Branch names: `type/description` — `feat/`, `fix/`, `docs/`, `test/`, `chore/`, `refactor/`, `perf/`, `ci/`.

- The parent owns setup, delegation, tracking, Git and resource lifecycle; do not make the human maintain internal paths or orchestration. All writers and checks target the task sibling. Do not write task code/artifacts in the main checkout.
- Report actual cwd, branch, base SHA, scope, checks and resource ownership. Report the actual served URL, or explicitly state no app is served. `localhost:3000` does not identify a checkout; confirm the serving cwd rather than assuming a port switches worktrees.

**Manual environment and data.** Preserve stable manual `rentas-pg` data so the human can run `pnpm dev` in the task worktree before push and while correcting it. Reuse existing Docker, proxy and tools; do not build a new fixture platform. Current Compose uses fixed name `rentas-pg`, host port `5433`, PostgreSQL 18 and no persistent volume: retention is NOT a durability guarantee. A second `docker compose -p` does not bypass the fixed name.

- Never automatically delete the manual container, run `db:test:down`/`down -v` against it or run `db:test:seed:e2e` on its DB. Potentially destructive automated tests require separately owned DBs/resources, not the manual baseline. Identify each target before running a command; do not infer isolation from cwd.
- Apply migrations only to the intended local DB after checking the target. Serialize migration generation as required below. Never read or publish real credential/env values.
- Local DB wiring: configure the existing `scripts/neon-http-proxy.mjs` with a direct local `TEST_DATABASE_URL`; reuse a verified proxy or run `pnpm e2e:proxy` in the task worktree (default port `5544`, override `NEON_PROXY_PORT` for an owned free port). Configure app `DATABASE_URL` with the same local DB and a fake `-pooler.` host, plus loopback `NEON_FETCH_ENDPOINT=http://127.0.0.1:<proxy-port>/sql`. Then run `pnpm dev` in that worktree and report its actual URL. This DB recipe does not configure login, uploads or mail; preserve their separately authorized setup without exposing secrets.

**Verification and human browser gate.** Preserve functional, TDD, mutation and served-HTML obligations; browser acceptance supplements them. Every screen-changing task requires explicit human browser acceptance of the task-served version BEFORE PUSH. Keep manual services/data available for inspection and corrections. Corrections touching accepted UI require renewed acceptance. Passive documentation needs proportionate structural checks, not invented functional RED or browser acceptance.

**Review and integration.** A focused PR of **at most 400 additions + deletions** goes directly to `dev`, never `main`. Count normally formatted reviewable code, all tests and complete documentation, including untracked files and closing evidence. Reserve closure space before implementation; do not golf or discard evidence to fit. Past that, plan coherent review slices; unnecessary scope remains a defect even when split.

- For a feature/integrator chain, merge in reverse: newest child → immediate parent → integrator → `dev`. Every child PR targets its immediate parent, not `dev`; only the final integrator targets `dev`. Work reaches production through the separate `dev → main` PR because Vercel deploys are rate-limited.
- The human performs normal merges only: no squash, rebase or agent merges. After each actual merge, run applicable checks on the integrated parent before proceeding. Child approval does not waive the final accumulated 400-line budget (code + tests + complete docs); obtain an explicit final-aggregate exception if needed.
- Include closure, decisions, named tests/checks, observed results, browser acceptance when applicable and remaining limits in the final integrator BEFORE its merge. Do not plan a postmerge closure-only PR. Keep unrelated improvements out of scope.
- Ready-for-review means the candidate and required evidence are prepared, not published or merged. Record publication only after actual commit/push/PR evidence, and delivery/merge only after actual human integration; a local GREEN is neither CI nor human acceptance.

PR bodies are written in Spanish and explain **why**, with verification evidence at the end. There is no template, no issue-first requirement, and no `type:*` labels. Preserve Spanish conventional commits and the no-attribution rule in §1.

**After final human merge.** Verify the actual resulting `dev` and applicable integrated checks. Stop ONLY task-owned app/proxy/test services after confirming their identity. Preserve shared manual data/services and historical resources. Before destructive removal of containers, data, worktrees or branches, freshly identify ownership and exact consequences, verify no uncommitted/unpublished work would be lost, and obtain explicit confirmation. Completion does not authorize cleanup by itself.

**Two migrations cannot be generated in parallel.** Drizzle's `_journal.json` collides visibly, but the `000N_snapshot.json` files collide *silently* — each is generated from the schema its author saw, so the second one describes a database without the first one's tables and merges clean. Never run two agents that both touch the schema.

That silent class of defect is this project's most expensive one: PR #103 exists because two branches touched different files, merged without conflict, and the types did not compose. Each branch passed its own gates; neither tested the meeting.

---

## 7. Fail closed

A recurring pattern here, and it is deliberate every time:

- Missing `CRON_SECRET` leaves the job route **closed**, not open.
- Missing mail configuration makes the reminder job answer `500` rather than start a batch it cannot deliver — starting one would burn each listing's ledger reservation with nothing sent, and the next run would not retry.
- The locked contact state has **no `value` property at all**, so a render physically cannot leak it.
- `contact_reveal_event.message` is nullable with a `NOT VALID` check rather than `NOT NULL DEFAULT ''`, because backfilling would write a fact that never happened into an append-only log. **That constraint is never validated**, and the migration says so inside itself.

When you add a guard, prefer the shape where the failure mode is refusal.
