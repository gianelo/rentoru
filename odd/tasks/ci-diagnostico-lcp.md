# Lighthouse LCP diagnostic
Objective: preserve sanitized evidence for the observed 2707.167 ms LCP failure without changing the 2500 ms budget or PR411.
Branch: `ci/diagnostico-lcp`, base `1ece1663865fcfdbee46c8a32bc833935b3c42cb`; Vitest/public Node CLI; forecast 220–300 changed lines including tests/docs/closure, one PR to dev, publication/merge not yet authorized.

## Specs
- S1: "no pero si esta en rojo entoences debemos reivsar este caso en especifico hagamoslo y luego vemos el 411" — obtain evidence for the specific failing measurement before proposing an application change; PR411 remains untouched.
- S2: "listo hazlo" — accepted proposal: "un cambio diagnóstico mínimo en el workflow para conservar el reporte sanitizado y ejecutar `budget` una vez con esa instrumentación". Preserve existing assertions and timeout behavior, and the failed Lighthouse exit status; no reruns to seek green.
- S3: "listo hazlo" — accepted proposal: "No cambiaríamos el umbral ni tocaríamos el #411. La finalidad sería obtener evidencia". Sanitization must exclude raw LHR, URLs/queries, cookies, headers, screenshots, HTML/snippets and user content; retain only allowlisted numeric metrics/breakdown and safe element identification grounded in installed Lighthouse schema.

## Tasks
- T1 [implemented; self-checks PASS] S1–S3 — inline: exporter CLI + actual workflow tests RED6/GREEN11; privacy mutation RED1 then restored GREEN. Hidden-file upload guard RED1/GREEN. Commit pending explicit authorization.
- T2 [in_progress: native review] S1–S3 — independent verifier: no implementation blockers, focused11 + Node8 + additional scratch probes3 PASS, no candidate edits. Parent typecheck, lint/tokens, syntax/diff PASS; full suite310 files/3410 tests and scoped coverage PASS before final hidden-file assertion. Real measurement still pending.
- T3 [pending] S1–S3 — after authorized publication/human integration, obtain one directed measurement and interpret the preserved evidence; no speculative app fix.

## Log
- L1 Original diagnostic request: "no pero si esta en rojo entoences debemos reivsar este caso en especifico hagamoslo y luego vemos el 411".
- L2 Authorization for diagnostic implementation: "listo hazlo".
- L3 Baseline: dev run38781719232 attempt2, SHA1ece166, failed only Lighthouse LCP2707.167ms >2500ms. Bypass resolved; preview/E2E/measure/bundle/rows passed. GitHub artifacts API reports zero artifacts: raw report remained only on removed runner. No cause or regression attribution established.
- L4 Isolation: fresh origin/dev fetched; registered sibling /Users/gianelo/Documents/Dev/py/rentoru-ci-diagnostico-lcp; dependencies installed. No app served, no DB/resources or credentials accessed; previous CI worktree and other agent's PR411 untouched.
- L5 Route: one cohesive bounded unit, inline writer; explorer only maps installed report schema. High risk: CI artifact/privacy surface, independent verification required. Use existing Vitest, Node and YAML parser; no new dependencies or test platform. No UI/business behavior changes, so served-HTML tests do not apply; test actual exporter CLI and actual workflow wiring.
- L6 Grounded schema: installed Lighthouse12.6.1 legacy element audit provides list/table/node and fixed four timing rows; labels may be localized, lhId terminal tag is mapped to constants, missing breakdown stays null. Raw JSON/HTML/flags are not uploaded. Source-proven synthetic fixtures are not measurements of Dev.
- L7 upload-artifact v4 excludes hidden directories by default (README v4); include-hidden-files=true is paired with the single exact sanitized path. Parent final focused11 + typecheck + Node8 + syntax/Biome/diff PASS; no unrelated code changes. Independent review observed279 lines, no implementation blockers, unchanged candidate and unchanged baseline workflow except diagnostic steps/id. Its synthetic checks do not establish the real LCP cause; native review and authorized execution remain pending.
