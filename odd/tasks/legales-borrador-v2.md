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
- T2 (S1, S5) Terms (inline, GREEN) + Normas (worker mvn2axla-1-fvjd) pages with served-HTML tests — commit: pending
- T3 (S1, S3) Privacy + Cookies pages with served-HTML tests — inline — commit: pending
- T4 (S1) Founder browser acceptance before push — human — pending

## Log

- L1 (2026-10-24, founder): "vamos a llevarlo al sitio pero generame un pdf y dejamelo en una carpeta en escritorio rentoru docs. tambien haremos estos mismo con politicas de privacidad, uso de cookies y normas de publicacion. ojo tomando en cuenta airbnb"
- L2: Airbnb sources read: Terms (help/article/2908), Privacy Policy (3175), Colombia supplement (3230), Cookie Policy (2866), host ground rules (2895). Venezuelan users contract with Airbnb Ireland UC; it does not operate from Colombia.
- L4: Terms v2 RED 8/12 → GREEN 12/12 (`app/legal/terminos/page.test.tsx`). The anonymous-operator, 21-clause and court tests each caught their own mutation, and the page was restored. Served by `next dev -p 3005` from this worktree (proxy 5545 → rentas-pg, read-only use).
- L3: Open decision carried into the drafts as a placeholder: retention period of `contact_reveal_event` (design.md Open Questions).
