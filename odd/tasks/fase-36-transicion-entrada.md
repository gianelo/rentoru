# F36.3 — Base de carga y recuperación, corte parcial

## Autorización y alcance del PR

El fundador aprueba la vista: tarjeta blanca centrada, fondo gris a pantalla completa, R fija, aro giratorio y «Cargando publicación…»; movimiento reducido detiene el aro. Componente reutilizable, activación futura **sólo en publicación**. Medidas: **390×844, 768×1024 y 1440×900**; 440×956 fue un control adicional anterior.

El fundador selecciona `delivery_strategy=single-pr` y acepta acotar el PR a **base visual y página de recuperación**, dentro de 400 líneas incluidas pruebas/documentación. No excepción de tamaño, cadena, compresión ni omisión de pruebas. **No activar aún** loading, plazo, controller, layout ni señales de navegación. 36.3 permanece parcial con esta entrega; 36.1 también sigue parcial.

Para la integración posterior queda acordado un límite de navegación de **10 segundos**, aviso y reintento sin modificar borradores ni declarar fallida una publicación. No aplica a subir fotos ni guardar. El reloj local podrá comenzar con la primera carga visible/hidratada, no garantiza contar desde el clic. La recuperación debe impedir presentación tardía durante el reemplazo documental; `location.replace` no garantiza aborto instantáneo interno del router. Los 2,5/5 s de la demo no son política productiva.

Worktree `rentoru-fase36-publicacion`, rama `fix/fase-36-transicion-entrada`, base `631b4ee1777d794e543a9b015c740e9b740bc4dc`. Fetch observado: HEAD/origin/dev 0/0; sólo este documento sin seguimiento antes del escritor. No modificar raíz, identidad, Nav, AppLink, footer, formularios, DB, acciones ni servicios ajenos.

## Evidencia y decisiones

- Inicio → AppLink → entrada `/publicar` con redirect asíncrono → destino RSC separado dejó pie aislado en 5/6 probes a 390×844: 74/65/69/3020/731 ms. GET directo no lo reprodujo; no inferir latencia DB ni error de render desde aborto de transporte.
- Nueve borradores y trece sesiones se conservaron. Diagnóstico local usó sólo entorno de proceso para `R2_BUCKET_PUBLIC_URL`; imágenes 404 no prueban storage. Evidencia ignorada: `test-results/f363-client-summary.log`, `f363-client-diagnostic.log` y capturas; padre inspeccionó el pie aislado.
- Mapas read-only `murk90mz-q-byo6`, `murkpakb-r-koln` y único contraste `murkujch-s-uhj0`: integración completa supera 400; política serializable decidida en dominio simplifica, pero no elimina ciclo pendiente/resuelto, foco ni recuperación real. No introducir controller sin caller como aceptación productiva.
- Recuperación de este PR: página síncrona, sin sesión/DB/query flags, referencia privada ni autorretry. Modelo puro «La navegación tardó demasiado», Reintentar `/publicar` e Inicio `/`; anclas documentales. No afirmar publicación fallida ni borrador guardado.
- Compartidos: tres roles de indicador en tokens/sistema y slot render-only opcional en FailureScreen, preservando defaults. F35 confirmó explícitamente ausencia de ediciones presentes/futuras en estas superficies (`79535baeb47c5784c6ae76ea96815d50`, reconfirmación `1e6bf56825d7682ecef76e48b46ec8d4`). Fetch final: origin/dev sigue en la base; encuentro y conflictos se comprobarán antes del push.

## Superficies del corte

- `components/molecules/LoadingOverlay.tsx`, `.module.css`, `.test.tsx`: presentación reutilizable, sin reloj ni política específica.
- `tests/e2e/loading-overlay-visual.spec.ts`: prueba portable del componente/CSS reales en memoria, sin activación de rutas; protege fuente mono, círculo tintado, radio, separación y tipografía aprobados.
- `src/modules/listing-publication/domain/navigation-recovery.ts`, `.test.ts`: modelo puro de recuperación.
- `app/publicar/error-de-carga/page.tsx`, `page.test.tsx`: caller real y HTML, sin activar loader.
- `components/organisms/FailureScreen.tsx`: sólo slot de acciones render-only si hace falta para enlaces documentales; defaults intactos.
- `src/styles/tokens.css`, `design/reference/sistema/tokens.css`, `SISTEMA.md`: extensión explícita del patrón aprobado.
- Este plan es parent-owned. Ningún `loading.tsx`, `error.tsx`, layout, controller, timeout o cambio de páginas existentes en este PR.

## Tareas y comprobaciones

- [x] T36.3a — Alcance parcial, rutas y presupuesto delimitados; coordinación solicitada a F35. `git diff --cached --check` pasó; sólo el plan entró al commit documental `adeaa0c5ba4af5461b2e796b85ee672edeb676b9`. Sin RED aplicable a planificación pasiva.
- [x] T36.3b — Base implementada en `10aff0e8b621dd272c505ae0da6b29ce2e1343f8`: 327 líneas de fuente/pruebas/sistema. `page.test.tsx` — «renders the actual synchronous page with retry and home anchors» prueba el caller real; heading/href mutados detectados y restaurados. Visual — «approved overlay geometry at 390×844» y sus dos medidas restantes pasó RED3/GREEN3; mutación mono→sans detectada/restaurada. Writer `murmh1so-x-49bp`, verificador `murmrl6i-y-p5by`: unit13/visual3/tipos/build fresco pasaron. Defaults FailureScreen intactos, compartidos coordinados; salida nativa conserva altura mayor que demo. No activación ni timeout.
- [ ] T36.3c — Verificación final: unit13/visual3/typecheck/Biome/tokens295/build `HyhypfNmPYp2iKuVcja6A`/bundle24 pasaron; máximo 112,41 KB≤130. Recovery y overlay reales con/sin JS en tres medidas; enlaces nativos, foco44px, movimiento reducido y 19 tablas intactas (9 borradores/13 sesiones). Caché Vite inicial propia/ignorada conservada, HMR histórico desconocido; configuración final HMR off/caché acotada y puertos propios cerrados. Logs `test-results/f363-final-{unit,build,bundle,browser}.log`. Review `review-e550b21aa4948710` aprobado y acknowledgement consumido sobre el árbol del commit de fuente; sin correcciones. Observación no bloqueante `R3-motion-coverage` sobre ampliar prueba persistente de movimiento queda para otro corte, no invalida esta revisión. Pendientes commit de evidencia y PR único `dev`≤400; merge humano; no cerrar 36.3 completa.

## Recursos y pendientes

PG propio `rentoru-f36-pg`/55433; app 3001 y proxy 55436 sólo para checks autorizados con entorno aislado. PG F35/55435 protegido; reservas propias 55437/55438. Sin producción, proveedores, seeds, migraciones ni escrituras de borradores/sesiones.

Demo aislada aprobada: servidor 55441 PID3701 y túnel PID90388, HTML y dos PNG solamente. Mantener activa; no confundir demo con aceptación productiva.

Pendientes fuera de este PR: activación real entrada/destino, deadline de 10 s, cancelación/recuperación ante transporte/espera infinita, focus/inert/escape y prueba de ausencia de presentación tardía. No llamar implementado al comportamiento futuro.
