# Fase 36.12 — Jerarquía de «Quién publica»

## Alcance aprobado

Mostrar «¿Quién publica?» una vez, como H1. Conservar el legend nativo accesible
con styles.srOnly, ambos labels y radios sin default; preservar respuesta guardada.
Sin cambios de contacto, negocio, CSS global ni revisar (36.18).
F35: decisión conjunta limitada a esta jerarquía, no cierra su auditoría restante.

## Workspace y recursos

- Cwd: `/Users/gianelo/Documents/Dev/py/rentoru-phase36-task-36-12`.
- Rama: `feat/fase-36-jerarquia-publicador`.
- Base dev: `e6a3c650d0cb853e75a46382320eaa3dbfb0d900`, merge #409.
- AGENTS y skills task-start/task-close cargados; tracker y mirror previos a source.
- Commit, push y PR a dev autorizados tras aceptación y revisión. Sin merge ni limpieza.
  Preservar WIP, .tmp, .env.local privado y DB/seis avisos; CI observado por el fundador.
- Fundador autorizó instalación offline/frozen/ignore-scripts y relevo de preview 36.11.
  Padre instaló 457 paquetes reutilizados/0 descargados; hashes package/lock intactos.
  Revalidó PID36066/cwd 36.11/ambos puertos antes de TERM; archivos anteriores intactos.
- Preview propia PID99731/PPID1, Node, cwd 36.12, ambos puertos 31467/31468 exclusivos.
  URL servida por browser: http://127.0.0.1:31467/measure; HTTP status no medido aparte.
  Binding owned-app.pid y log human-preview-36-12.log bajo runtime propio; conservar.
- Runtime: `.tmp/rentoru-f367-browser`, UID/canonical/symlink comprobados.
  Guard unitario histórico con bindings root/own propios; config/envDir/cache desactivados.
  Browser usa attachedConfig existente, preload y HOME/TMPDIR propios antes del CLI.
  Guard/puertos intactos; evita probe IPv6 del webServer. Filtro incluye nombre del archivo.

## Porciones y evidencia

- [x] P1 — Registrar diseño y baseline. `design.md:575–600`, +26 líneas.
  mv5zo77j-2c-rs55: PASS enlaces/anchors, caller, srOnly, base/scope/diff; 36.11 intacta.
  Documentación pasiva sin RED significativo. P2 autorizado tras checkpoint.
- [x] P2 — Implementar y verificar jerarquía. Verificada y aceptada; unidad comprometida.
  Commit `4fe0654887badb463d14f8c368f734b7cd80ee27`: comportamiento, pruebas y diseño P1/P2.
  Producción: una clase en PublishStep.tsx:579, styles.legend → styles.srOnly.
  HTML: negativa-de-campo.test.tsx, caller real `/publicar/paso/quien`, +62 líneas.
  RED mv60x36f-2k-x08n: 1 falla/3 pasan; :220:39 espera srOnly, recibe legend.
  GREEN mv611wqw-2m-dpem: 4/4. Mutación mv61457l-2n-3g56 reproduce MISMA falla.
  Restauración mv615occ-2o-pvkj: 4/4 y suite completa 19/19, sin skips/errores no manejados.
  Browser mv61hd3f-2u-2f70: 4/4, 390/440/768/1440px, 49.1s, exit 0.
  Prueba clipping/nombre accesible, labels/targets ≥44, clicks, teclado/foco, default y respuesta.
  Artefacto results/.last-run.json: passed; sin screenshots. PID99731 preservado.
  Tipos PASS; unidades 19+10 de autoridad attached = 29/29, sin skips (mv61n89j-2w-stxy).
  Tokens PASS: 318 estilos. Biome 5 archivos y diff PASS (mv61qscg-2y-m547).
  Scope verificado: 274 A+D incluyendo tracker, sin .tmp; correcciones solo tipo/formato.
  ASSESS unassessable por tracker untracked: plan independiente ejecutado y satisfecho.
  Aceptación visual humana: «ya hice las pruebas y todo bien si se ve», arranque manual.
  .env.local privado/ignorado preparado con autorización; DB/proxy/origen locales.
  No se inspeccionaron valores; este arranque no prueba persistencia ni POST negativo.
  Inventario ligado actualizado por STATUS explícito, sin START nuevo ni recuperación.
  Revisión `review-9d22fd67e08d30c7`: approved y acknowledgement completado; autoridad burned.
  Candidato congelado: 7 paths, 275 A+D, tree `c3fcb9de7f2d61cc5e782b0e2a95c0a8fea8061d`.
  Target: `sha256:875da42d8b290dd6578d0b025b079b7920a5d585c68b23c1a9270494b09735c1`.
  Revisión consumida: `sha256:49f0f17d4796b563901ed31dcbd651e16f1a1752e5830af969572606d2b0873b`.
  No STATUS posterior al burn. Este cierre documental es posterior al candidato revisado.
  Suite global, build e integración no ejecutados en esta porción de presentación.
  Commit de producto: 294 A+D; cierre verificado en `f09b7d4a4241f85e411a57041765bfb0f03c6f0a`.
  [x] Publicación: push confirmado y PR https://github.com/gianelo/rentoru/pull/410 contra dev.
  Scope final con este registro: 297 A+D, 8 archivos; .env.local y .tmp excluidos.
  No integrada todavía. CI a cargo del fundador; ningún watcher ni merge iniciado.

## Límites de verificación y entrega

Objetivo 250–315 A+D, máximo previsto 330 y PR a dev ≤400; contar tests/docs/trackers.
Reutilizar caller/tests y medida real PublishStep; no infraestructura nueva ni persistencia.
La suite negativa dobla submitStep: no prueba HTTP POST real ni persistencia de fixture.
No pnpm verify, servicios ajenos, reseed, acceso a credenciales ni red externa.
Warning dueño→inmobiliaria ya correcto. Aceptación visual humana antes de publicar.
