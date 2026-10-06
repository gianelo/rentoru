# CI — importación masiva duplicada

## Alcance

Corregir únicamente la causa demostrada del fallo de integration del PR #382 (`63bd2f8`, run `37517069683`). Una prueba falla por timeout de 5000 ms: `creates no additional draft when the SAME external reference is confirmed again`, `tests/integration/broker-bulk-import-confirm.test.ts:167`. Pasan 428 pruebas, incluidas las de seed y catálogo. No atribuir el fallo a los seeds sin evidencia; no aumentar timeouts ni debilitar aserciones.

## Tareas

- [ ] Diagnosticar el tramo lento con PostgreSQL propio y mediciones numéricas.
- [ ] Corregir la causa demostrada con regresión RED/GREEN y mutación aplicable.
- [ ] Publicar la corrección y registrar el resultado real de CI.

## Evidencia y siguiente decisión

Los ensayos controlados previos pasaron las cuatro pruebas: catálogo mínimo, duplicado 77 ms; catálogo completo (5796 zonas, 4203 alias), duplicado 105 ms. En el completo, ambas confirmaciones midieron 51/50 ms, catálogo 26/30 ms, adquisición de conexión 0,62 ms e INSERT aproximadamente 1 ms (transacciones completas aproximadamente 2–3 ms); se observó el rechazo esperado `23505`. No reprodujeron el timeout de CI ni demostraron una causa.

Se agregó instrumentación únicamente a `creates no additional draft when the SAME external reference is confirmed again`, habilitada por `CI=true`: inicio/fin con `elapsed_ms` relativo al inicio del caso para fixture, ambas confirmaciones, cada método de los seis puertos y conteo final. El decorador conserva receptor, argumentos y resultado/error; `finally` registra también el fin del rechazo esperado, sin capturarlo. No registra datos de entrada, identificadores, objetos ni SQL. Aserciones, fixtures, limpieza y timeout permanecen intactos.

Una ejecución instrumentada del archivo sobre el catálogo completo pasó 4/4 (duplicado 79 ms; conteo final 1). Confirmaciones: 36,640/39,373 ms; `catalogue.listZones`: 28,574/29,353 ms. Desde fin de catálogo hasta inicio de persistencia: 2,601/4,637 ms, incluyendo el puerto de zonas. Biome del archivo y TypeScript sin incremental pasaron. Al finalizar, el baseline conservó 5 ciudades, 5796 zonas, 4203 alias, 2 usuarios y 10 avisos; cero conexiones de otros clientes. El runner existente emitió un aviso de opciones esbuild/oxc; no falló.

Hipótesis a discriminar en CI: latencia dentro de un puerto (intervalo inicio–fin, o inicio sin fin) frente a demora de validación/planificación entre fin del catálogo y comienzo de persistencia, separando el intervalo de `zones.listZonesForCity`. Un intervalo entre eventos no prueba CPU por sí solo. El padre publicará este diagnóstico y recogerá los eventos del tramo lento; solo entonces se propondrá una corrección del tramo demostrado. Un posterior CI verde no prueba que se haya corregido la causa. No se justifica cambiar seeds, timeout ni producción.

Excepción TDD: diagnóstico temporal, no nueva regla ni corrección funcional; no hay RED nuevo significativo y el timeout previo de CI no es evidencia RED/GREEN de una solución. No corresponde mutación todavía. Las tareas de diagnóstico causal, corrección y publicación siguen pendientes. Verificador independiente: 4/4 PASS (duplicado 190 ms); comprobó 36 eventos, preservación del rechazo `23505`, conteo final 1 y cero conexiones ajenas. Docker propio `rentoru-ci-import-dup` y namespace `.tmp/rentoru-ci-import-dup/` eliminados tras los ensayos; F35/F36 y el documento ajeno de limpieza no se tocaron. START de revisión nativa no creó lineage: consentimiento vencido; no se afirma aprobación nativa. Diagnóstico listo para publicación, no corrección causal.

## Límites

Sin producción, credenciales, lectura de `.env`, instalaciones, cambios geográficos ni merge del PR. Preservar F35/F36 y el documento ajeno de limpieza. No repetir batería completa ni encadenar soluciones del runner; detener ante un bloqueo concreto. Recursos temporales y Docker propios se eliminan al terminar. Causa todavía desconocida; adaptador de vocabulario de publicación no forma parte del recorrido de importación masiva.
