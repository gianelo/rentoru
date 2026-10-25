# Legales v2 — Términos, Privacidad, Cookies y Normas (tasks.md 23.5)

Rewrites four /legal drafts using Airbnb's policy structure (not its text), with an anonymous natural-person operator, exports them as PDFs for the founder, and brings them to the site. DraftNotice stays until founder ratification.

## Specs

- S1 — "vamos a llevarlo al sitio": the four texts replace `app/legal/{terminos,privacidad,cookies,normas}/page.tsx`, with served-HTML tests; DraftNotice remains.
- S2 — "generame un pdf y dejamelo en una carpeta en escritorio rentoru docs": one PDF per document in `~/Desktop/rentoru docs/`.
- S3 — "tambien haremos estos mismo con politicas de privacidad, uso de cookies y normas de publicacion. ojo tomando en cuenta airbnb": Privacy, Cookies and Publication rules follow Airbnb's structure, adapted to Rentoru's real behavior.
- S4 — operator option 1 (founder, 2026-10-24): no name, ID, RIF or city; contact hola@rentoru.com; identity disclosed only to competent authorities; forum = competent Venezuelan courts.
- S5 — Terms v2 as approved in conversation (21 clauses, including taxes, third-party services, notices, force majeure, survival).

## Tasks

- [x] T1 (S2–S5) Write the four texts and generate PDFs — inline — n/a (outside the repo): `~/Desktop/rentoru docs/Rentoru - {Términos y condiciones, Política de privacidad, Uso de cookies, Normas de publicación}.pdf`
- [x] T2 (S1, S5) Terms + Normas pages with served-HTML tests — commits `3292083` (Terms, slice A, about 370 lines) and `437d84a` (Normas, slice B, 212 lines; worker mvn2axla-1-fvjd). Pending human browser acceptance (T4) and publication.
- Slice boundary: the diff against origin/dev is 558 lines, so it ships as a chain. A = Terms, B = Normas, C = Privacy + Cookies + closure. Each slice must be ≤400 lines.
- [x] T3 (S1, S3) Privacy + Cookies v3 pages with served-HTML tests (worker mvo0we06-2-jh54). Privacy ships as slice C and Cookies with the DraftNotice as slice D, because 522 lines exceed one slice. Privacy describes the behaviour decided in phase 39 (D1–D8), which is not built yet, so `DraftNotice` stays until 39.3 and phase 40 land.
- T4 (S1) Founder browser acceptance before push — human — pending

## Log

- L1 (2026-10-24, founder): "vamos a llevarlo al sitio pero generame un pdf y dejamelo en una carpeta en escritorio rentoru docs. tambien haremos estos mismo con politicas de privacidad, uso de cookies y normas de publicacion. ojo tomando en cuenta airbnb"
- L2: Airbnb sources read: Terms (help/article/2908), Privacy Policy (3175), Colombia supplement (3230), Cookie Policy (2866), host ground rules (2895). Venezuelan users contract with Airbnb Ireland UC; it does not operate from Colombia.
- L4: Terms v2 RED 8/12 → GREEN 12/12 (`app/legal/terminos/page.test.tsx`). The anonymous-operator, 21-clause and court tests each caught their own mutation, and the page was restored. Served by `next dev -p 3005` from this worktree (proxy 5545 → rentas-pg, read-only use).
- L5: Normas RED 6/13 → GREEN 13/13 (`app/legal/normas/page.test.tsx`). The mutations "remove «duplicado»" and "swap sections 7/8" each failed only their own test. Results: `app/legal` 54/54, typecheck clean, biome clean, lint:tokens ok.
- L6 (founder, on retention): "no recuerdo esto debemos validarlo en el sistema" / "el reporte tenemos qu ver eso tambien. dentro del proyecto creo que no esta tomando en cuenta." Rights response time: 30 days. Validated in the code: nothing deletes `contact_reveal_event` or `listing_report`, and both reference `user` with `onDelete: restrict`.
- L7 (founder, 2026-10-25): "estipular en todas estas paginas que son un borrador y que estamso trabajando en eso mientras vamos aplicando las soluciones de software que faltan." `DraftNotice` now reads «Estamos trabajando en este texto mientras completamos el sitio. Algunas de las funciones que describe todavía se están implementando…». `legal-anatomy.test.tsx` went RED 5/10 then GREEN on all five pages. The served HTML on :3005 carries it on terminos, privacidad, cookies, normas and datos.
- L8: Privacy + Cookies RED 18/26 → GREEN 26/26. Mutations caught by their own test: reveal limit 40→60, and the served «CONFIRMAR» note. `app/legal` 71/71; typecheck, lint and lint:tokens exit 0; both routes return 200 on :3005, and the cookies page carries no «CONFIRMAR».
- L3: Open decision carried into the drafts as a placeholder: retention period of `contact_reveal_event` (design.md Open Questions).
