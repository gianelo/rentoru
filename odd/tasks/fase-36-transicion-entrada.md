# F36.3 — Base de carga y recuperación, corte parcial

## Autorización y alcance del PR

El fundador aprueba la vista: tarjeta blanca centrada, fondo gris a pantalla completa, R fija, aro giratorio y «Cargando publicación…»; movimiento reducido detiene el aro. Componente reutilizable, activación futura **sólo en publicación**. Medidas: **390×844, 768×1024 y 1440×900**; 440×956 fue un control adicional anterior.

El fundador selecciona `delivery_strategy=single-pr` y acepta acotar el PR a **base visual y página de recuperación**, dentro de 400 líneas incluidas pruebas/documentación. No excepción de tamaño, cadena, compresión ni omisión de pruebas. **No activar aún** loading, plazo, controller, layout ni señales de navegación. 36.3 permanece parcial con esta entrega; 36.1 también sigue parcial.

Para la integración posterior queda acordado un límite de navegación de **10 segundos**, aviso y reintento sin modificar borradores ni declarar fallida una publicación. No aplica a subir fotos ni guardar. El reloj local podrá comenzar con la primera carga visible/hidratada, no garantiza medir antes del clic. La recuperación debe impedir presentación tardía durante el reemplazo documental; `location.replace` no garantiza aborto instantáneo interno del router. Los 2,5/5 s de la demo no son política productiva.

Worktree `rentoru-fase36-publicacion`, rama `fix/fase-36-transicion-entrada`, base `631b4ee1777d794e543a9b015c740e9b740bc4dc`. Fetch observado: HEAD/origin/dev 0/0; sólo este documento sin seguimiento antes del escritor. No modificar raíz, identidad, Nav, AppLink, footer, formularios, DB, acciones ni servicios ajenos.

## Evidencia y decisiones

- Inicio → AppLink → entrada `/publicar` con redirect asíncrono → destino RSC separado dejó pie aislado en 5/6 probes a 390×844: 74/65/69/3020/731 ms. GET directo no lo reprodujo; no inferir latencia DB ni error de render desde aborto de transporte.
- Nueve borradores y trece sesiones se conservaron. Diagnóstico local usó sólo entorno de proceso para `R2_BUCKET_PUBLIC_URL`; imágenes 404 no prueban storage. Evidencia ignorada: `test-results/f363-client-summary.log`, `f363-client-diagnostic.log` y capturas; padre inspeccionó el pie aislado.
- Mapas read-only `murk90mz-q-byo6`, `murkpakb-r-koln` y único contraste `murkujch-s-uhj0`: integración completa supera 400; política serializable decidida en dominio simplifica, pero no elimina ciclo pendiente/resuelto, foco ni recuperación real. No introducir controller sin caller como aceptación productiva.
- Recuperación de este PR: página síncrona, sin sesión/DB/query flags, referencia privada ni autorretry. Modelo puro «La navegación tardó demasiado», Reintentar `/publicar` e Inicio `/`; anclas documentales. No afirmar publicación fallida ni borrador guardado.
- Compartidos previstos: tres roles de indicador en tokens/sistema y slot render-only opcional en FailureScreen, preservando comportamiento por defecto. Coordinación enviada a F35 (`8e8de5a9`, `b92648fb`); cotejar respuesta y solapamientos antes de cambios/entrega.

## Superficies del corte

- `components/molecules/LoadingOverlay.tsx`, `.module.css`, `.test.tsx`: presentación reutilizable, sin reloj ni política específica.
- `src/modules/listing-publication/domain/navigation-recovery.ts`, `.test.ts`: modelo puro de recuperación.
- `app/publicar/error-de-carga/page.tsx`, `page.test.tsx`: caller real y HTML, sin activar loader.
- `components/organisms/FailureScreen.tsx`: sólo slot de acciones render-only si hace falta para enlaces documentales; defaults intactos.
- `src/styles/tokens.css`, `design/reference/sistema/tokens.css`, `SISTEMA.md`: extensión explícita del patrón aprobado.
- Este plan es parent-owned. Ningún `loading.tsx`, `error.tsx`, layout, controller, timeout o cambio de páginas existentes en este PR.

## Tareas y comprobaciones

- [ ] T36.3a — En curso: reconciliar alcance, rutas, presupuesto y coordinación. Cerrar unidad documental con commit y registrar identidad antes de escritor.
- [ ] T36.3b — RED/GREEN observados, mutación/restauración de modelo y caller real; implementar sólo base y recuperación. Verificar default FailureScreen y referencias saneadas. Presupuesto de escritor ≤330 líneas, dejando margen al plan, sin code golf. Cerrar con commit de código, pruebas y sistema.
- [ ] T36.3c — Verificador independiente: pruebas focalizadas, typecheck/Biome/tokens/build/bundle; HTML HTTP de recovery con/sin JS y anclas nativas; base visual en tres medidas, R fija/movimiento reducido/sin desborde. Review nativo del corte si está habilitado; fetch/conflictos, PR único a `dev` ≤400; merge humano. Registrar pendientes, no cerrar 36.3 completa.

## Recursos y pendientes

PG propio `rentoru-f36-pg`/55433; app 3001 y proxy 55436 sólo para checks autorizados con entorno aislado. PG F35/55435 protegido; reservas propias 55437/55438. Sin producción, proveedores, seeds, migraciones ni escrituras de borradores/sesiones.

Demo aislada aprobada: servidor 55441 PID3701 y túnel PID90388, HTML y dos PNG solamente. Mantener activa; no confundir demo con aceptación productiva.

Pendientes fuera de este PR: activación real entrada/destino, deadline de 10 s, cancelación/recuperación ante transporte/espera infinita, focus/inert/escape y prueba de ausencia de presentación tardía. No llamar implementado al comportamiento futuro.
