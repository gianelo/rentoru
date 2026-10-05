# Corrección de posición y giro del spinner de zona

Base dev: `b8512c12c87cb2a6f35cf6bdab9947302dead7f8` (PR379 MERGED, verificado por GitHub). Rama: `fix/spinner-zona-posicion-giro`.

## Alcance y autorización

Restaurar posición original de × nativa, reemplazarla temporalmente por spinner en el mismo lugar, restaurarla al terminar. Comprobar giro real durante petición retenida y movimiento normal; conservar accesibilidad de movimiento reducido. No cambiar búsqueda, GET/POST, selección, referencia ni abort/versionado. Sin nueva ×, SVG, paquetes o cambios de backend.

Inicialmente el fundador exigió aviso y prueba manual antes de commit. Se avisó, se pausaron los agentes y se levantó el sitio real con Docker. Después autorizó expresamente «commit y push y PR a dev para probar en dev». Corrección del plan: entregar ahora la unidad verificada; aceptación manual pendiente en dev, sin fingir validación local ni hacer merge automático.

## Tareas

1. [ ] **En curso de cierre/publicación**: corrección y verificación local completadas; cerrar unidad con commit, revisión nativa aplicable y PR contra dev. Registrar identidades en evidencia posterior.
2. [ ] **Pendiente**: después de CI y merge humano, probar posición, restauración y giro en dev. El reporte de aro estático sigue sin causa reproducida; no cerrar por la mera declaración CSS.

## Evidencia observada

- Capturas del fundador: `/Users/gianelo/Desktop/spinner-x-mueve-derecha.png`, `/Users/gianelo/Desktop/spinner-no-esta-animado.png`.
- Causa demostrada de desplazamiento: padding end permanente43px frente a14px original. Se elimina la clase adicional y se alinea el overlay en16px contra centro físico nativo medido; no se cambia la animación.
- Escritor `muvihnhw-33-9jgs`: RED de clic original dejó «alta» en390/1440; tras retirar padding apareció RED independiente de centro2px. GREEN10/10. Mutación padding2/2 RED y overlay2/2 RED; restauración final10/10. Primer intento de config falló antes de tests y NO acredita RED.
- Independiente `muvixbmy-34-md8u`:10/10 Playwright (22.3s),18/18 Vitest `--no-cache`, tipos sin incremental, Biome3, tokens309 y diff PASS. Fuente/índice SHA intactos durante comprobaciones. React method/function-action produjo advertencias existentes, no suprimidas.
- Centros originales/spinner: móvil(277.8125,114.6875), desktop(1327.8125,112.6875), error≤0.000004px. Clic físico borra idle/después200/después500; durante carga no borra. Referencia usa padding histórico y rectángulo actual, no reconstruye todo el layout histórico.
- Giro temporal real, mismo nodo:80.14°/251.3ms móvil y80.07°/256.1ms desktop, timeline avanza~267ms. Movimiento reducido:0° intencional. El giro normal ya pasaba antes de la corrección: NO se inventó RED ni se reparó una causa de animación no demostrada.
- Se mantienen cuatro casos previos: GET sin JS, presentación/selección/referencia, teclado y respuestas obsoletas. Peticiones sintéticas con guardas GET/origen/ruta, no POST ni proveedor; screenshots con caret initial. Error500 deliberado es el único console error permitido, sin silenciar hidratación.
- Límite de test temporal: upper bound300ms tiene50ms de holgura; verificador señala sensibilidad a scheduling, sin fallo observado. Otros motores, wizard autenticado y aceptación del fundador pendientes.

## Entorno y límites de entrega

Runtime autorizado posteriormente: Docker F36 `55433/rentas_test`, public.listing confirmada; proxy existente loopback5546/PID62667 y Next3000/PID62671 (lanzador62668). Inicio200 sin FailureScreen; publicar307/signin con retorno. Costura Neon HTTP existente; no se cambió `.env`, fuente, esquema ni guardas, no migrations/seeds/cloud/proveedor. Logs/pids ignorados en `test-results/spinner-position-runtime/`, no leer crudos.

Preservar otros servicios/worktrees/builds y todos los outputs anteriores. Presupuesto400 líneas, pruebas legibles. Config/harness local ignorado NO forma parte del PR. No afirmar CI verde hasta observarlo. Merge permanece humano.
