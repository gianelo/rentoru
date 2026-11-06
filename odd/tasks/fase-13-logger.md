# Fase 13.1 — Logger: que un fallo le llegue a una persona

Base `df93315` (`origin/dev`), worktree `rentoru-phase13-task-13-1`, rama `feat/sentry-servidor`.
Dos cortes, un PR ≤400 líneas cada uno a `dev`: **A** (errores no manejados → Sentry) y **B** (fallos manejados que hoy no dejan rastro). Sin cambio de pantalla.

## Specs

- S1 (L2): «el logger es lo que mas me importa poder ver si algo falla verlo».
- S2 (L2): «nunca he usado sentry pero es algo que esta fure de vcercel yo pago vercel asi que alli tambien podemos registra loggs por si acaso». → Sentry fuera de Vercel **y** la línea en Vercel se conserva.
- S3 (L2): «la idea es saber si un cliente o algo se queja poder encontrar el problema rapido».
- S4 (L3): sólo servidor — «No, sólo servidor (Recomendado)».
- S5 (L3): identificar a la persona — «ID de cuenta + huella del correo (Recomendado)»: con sesión, el id interno de la cuenta; sin sesión, una huella cifrada del correo; el log nunca guarda el correo. (Corte B.)
- S6 (L3): orden — «A y después B (Recomendado)».
- S7 (privacidad, 11b.4, no negociable): a Sentry sale sólo el reporte saneado de `failure-report.ts`; nunca la URL (`/renovar/<token>`), headers, cookies, pila, correo ni teléfono.

## Hechos verificados en `df93315`

- `instrumentation.ts:19` exporta sólo `onRequestError`, que escribe `failureLogLine` (seis claves cerradas) con `console.error`.
- Vercel Pro retiene los runtime logs **1 día**; 30 días sólo con Observability Plus (vercel.com/docs/logs/runtime, leído 2026-11-05).
- Sentry Developer (gratis): 5.000 errores/mes, 30 días, 1 usuario, alertas por correo (sentry.io/pricing).
- Ninguna dependencia de Sentry/OTel directa; no hay CSP. La caída total ya la cubre `scripts/heartbeat.ts` (GitHub Actions).
- Fallos manejados sin registro (corte B): correo del enlace mágico (`app/(auth)/signin/actions.ts`), contacto (`app/ayuda/escribinos/actions.ts`), 503 de foto, `sweep-expired-drafts.ts`.

## Decisión técnica (corte A)

Sin SDK: un adaptador propio envía el evento por la API pública de *envelopes* de Sentry. El SDK captura por defecto URLs salientes (firmas de R2), errores crudos sin tapar y headers; el adaptador manda sólo lo que el dominio cerró. Cero dependencias, cero bytes en el bundle. Sin `SENTRY_DSN` no se envía nada y la línea en Vercel sigue.

## Tasks

- [x] T1 (S7) dominio: `failureReport` como objeto cerrado; `failureLogLine` lo serializa — A, commit: 05491b5
- [x] T2 (S1, S3, S7) dominio: evento de Sentry desde el reporte (digest/ruta/frontera como tags, entorno, release) — A, commit: 05491b5
- [x] T3 (S2, S7) infraestructura: envío por envelope con DSN, tiempo límite y sin romper la petición — A, commit: 05491b5
- [x] T4 (S1–S3) `instrumentation.ts` conectado y probado: con DSN envía saneado; sin DSN no envía; línea de Vercel intacta — A, commit: 05491b5
- [x] T5 (S3) documentación: variable `SENTRY_DSN`, guía «un cliente se queja: cómo buscar», cierre en tasks.md 13.1 — A, commits: 05491b5, 22c5a11
- T6 (S1) humano: crear cuenta/proyecto Sentry, `SENTRY_DSN` en Vercel, alerta por correo, ver un evento de prueba — A, —
- T7 (S5) corte B: fallos manejados con id de cuenta / huella del correo — B, commit: —

## Log

- L1: «estamosatancaod en paralelo la fase 44 y 38 que otras fases tenemos pendientes creo que la 12 necesitamos meter sentry para los logs creo» (Sentry es la 13.1, no la 12).
- L2: «vamos con la fase 13 primero el logger es lo que mas me importa poder ver si algo falla verlo nunca he usado sentry pero es algo que esta fure de vcercel yo pago vercel asi que alli tambien podemos registra loggs por si acaso. la idea es saber si un cliente o algo se queja poder encontrar el problema rapido.»
- L3 (2026-11-05): navegador «No, sólo servidor (Recomendado)»; buscar cliente «ID de cuenta + huella del correo (Recomendado)»; alcance «A y después B (Recomendado)».
- L4 (2026-11-05): corte A en `05491b5` más la guarda de la primera línea de la causa (aviso del verificador: `params:` de Drizzle). `gentle-ai-verify` dio PASS en S1–S4, S6 y S7; S5 es del corte B. El corte suma unas 600 líneas contra el tope de 400: hace falta una decisión del fundador.
- L5 (2026-11-05): «hacemos la excepcion y authorizo» — excepción de presupuesto (~605 líneas) y push/PR a `dev` autorizados.
