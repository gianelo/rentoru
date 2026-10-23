# Lighthouse LCP diagnostic
Objective: preserve sanitized evidence for the observed 2707.167 ms LCP failure without changing the 2500 ms budget or PR411.
Branch: `ci/diagnostico-lcp`, base `1ece1663865fcfdbee46c8a32bc833935b3c42cb`; Vitest/public Node CLI; 279-line implementation plus closure, one PR to dev, commit/push/PR authorized, merge human-owned.

## Specs
- S1: "no pero si esta en rojo entoences debemos reivsar este caso en especifico hagamoslo y luego vemos el 411" — obtain evidence for the specific failing measurement before proposing an application change; PR411 remains untouched.
- S2: "listo hazlo" — accepted proposal: "un cambio diagnóstico mínimo en el workflow para conservar el reporte sanitizado y ejecutar `budget` una vez con esa instrumentación". Preserve existing assertions and timeout behavior, and the failed Lighthouse exit status; no reruns to seek green.
- S3: "listo hazlo" — accepted proposal: "No cambiaríamos el umbral ni tocaríamos el #411. La finalidad sería obtener evidencia". Sanitization must exclude raw LHR, URLs/queries, cookies, headers, screenshots, HTML/snippets and user content; retain only allowlisted numeric metrics/breakdown and safe element identification grounded in installed Lighthouse schema.

## Tasks
- T1 [done] S1–S3 — inline: `scripts/lighthouse-summary.mjs` and `.test.ts` («exports only allowlisted numeric diagnostics and safe element identity through the CLI»); workflow caller RED6/GREEN11, privacy mutation RED1/restored GREEN, hidden-file guard RED1/GREEN. Commit `e4fe256`.
- T2 [done locally] S1–S3 — independent verifier: no implementation blockers, focused11 + Node8 + scratch probes3 PASS. Parent typecheck, lint/tokens, syntax/diff PASS; full suite310 files/3410 tests/coverage PASS before final hidden-file assertion. Native review approved; implementation commit `e4fe256`. Real measurement still pending.
- T3 [blocked: human integration] S1–S3 — after publication/human merge, obtain one directed measurement and interpret preserved evidence; no speculative app fix or claim of live upload.

## Log
- L1 Original diagnostic request: "no pero si esta en rojo entoences debemos reivsar este caso en especifico hagamoslo y luego vemos el 411".
- L2 Authorization for diagnostic implementation: "listo hazlo".
- L3 Baseline: dev run38781719232 attempt2, SHA1ece166, failed only Lighthouse LCP2707.167ms >2500ms. Bypass resolved; preview/E2E/measure/bundle/rows passed. GitHub artifacts API reports zero artifacts: raw report remained only on removed runner. No cause or regression attribution established.
- L4 Isolation: fresh origin/dev fetched; registered sibling /Users/gianelo/Documents/Dev/py/rentoru-ci-diagnostico-lcp; dependencies installed. No app served, no DB/resources or credentials accessed; previous CI worktree and other agent's PR411 untouched.
- L5 Route: one cohesive bounded unit, inline writer; explorer only maps installed report schema. High risk: CI artifact/privacy surface, independent verification required. Use existing Vitest, Node and YAML parser; no new dependencies or test platform. No UI/business behavior changes, so served-HTML tests do not apply; test actual exporter CLI and actual workflow wiring.
- L6 Grounded schema: installed Lighthouse12.6.1 legacy element audit provides list/table/node and fixed four timing rows; labels may be localized, lhId terminal tag is mapped to constants, missing breakdown stays null. Raw JSON/HTML/flags are not uploaded. Source-proven synthetic fixtures are not measurements of Dev.
- L7 upload-artifact v4 excludes hidden directories by default (README v4); include-hidden-files=true is paired with the single exact sanitized path. Parent final focused11 + typecheck + Node8 + syntax/Biome/diff PASS; no unrelated code changes. Independent review observed279 lines, no implementation blockers, unchanged candidate and unchanged baseline workflow except diagnostic steps/id. Its synthetic checks do not establish the real LCP cause.
- L8 Native review `review-40ef076415e29625` approved four lenses; exact acknowledgement consumed authority for target5f4c5e3304f625ae11d127698a0c01f403b11ac2113d6786ecb8369adbd0d005. Commit `e4fe256` preserves that reviewed source tree. This later closure edit changes documentation only.
- L9 User authorized commit/push/PR with «si claro hazlo». No merge authority. Publish first; confirm remote CI and then human merge before measuring. PR411 remains OPEN/DRAFT at dc422af, untouched. No report has yet been captured by this instrumented workflow; no LCP cause established.
