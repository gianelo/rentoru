# CI — importación masiva duplicada

## Alcance

Corregir únicamente la causa demostrada del fallo de integration del PR #382 (`63bd2f8`, run `37517069683`), reaparecido en PR #393 (run `37667456263`, job `112950210709`, intento 1). Una prueba falla por timeout de 5000 ms: `creates no additional draft when the SAME external reference is confirmed again`, `tests/integration/broker-bulk-import-confirm.test.ts:167`. Pasan 428 pruebas, incluidas las de seed y catálogo. No atribuir el fallo a los seeds sin evidencia; no aumentar timeouts ni debilitar aserciones.

## Tareas

- [ ] Diagnosticar el tramo lento con PostgreSQL propio y mediciones numéricas.
- [ ] Corregir la causa demostrada con regresión RED/GREEN y mutación aplicable.
- [ ] Publicar la corrección y registrar el resultado real de CI.

## Evidencia y siguiente decisión

Los ensayos controlados previos pasaron las cuatro pruebas: catálogo mínimo, duplicado 77 ms; catálogo completo (5796 zonas, 4203 alias), duplicado 105 ms. En el completo, ambas confirmaciones midieron 51/50 ms, catálogo 26/30 ms, adquisición de conexión 0,62 ms e INSERT aproximadamente 1 ms (transacciones completas aproximadamente 2–3 ms); se observó el rechazo esperado `23505`. No reprodujeron el timeout de CI ni demostraron una causa.

Se agregó instrumentación únicamente a `creates no additional draft when the SAME external reference is confirmed again`, habilitada por `CI=true`: inicio/fin con `elapsed_ms` relativo al inicio del caso para fixture, ambas confirmaciones, cada método de los seis puertos y conteo final. El decorador conserva receptor, argumentos y resultado/error; `finally` registra también el fin del rechazo esperado, sin capturarlo. No registra datos de entrada, identificadores, objetos ni SQL. Aserciones, fixtures, limpieza y timeout permanecen intactos.

Una ejecución instrumentada del archivo sobre el catálogo completo pasó 4/4 (duplicado 79 ms; conteo final 1). Confirmaciones: 36,640/39,373 ms; `catalogue.listZones`: 28,574/29,353 ms. Desde fin de catálogo hasta inicio de persistencia: 2,601/4,637 ms, incluyendo el puerto de zonas. Biome del archivo y TypeScript sin incremental pasaron. Al finalizar, el baseline conservó 5 ciudades, 5796 zonas, 4203 alias, 2 usuarios y 10 avisos; cero conexiones de otros clientes. El runner existente emitió un aviso de opciones esbuild/oxc; no falló.

Hipótesis a discriminar en CI: latencia dentro de un puerto (intervalo inicio–fin, o inicio sin fin) frente a demora de validación/planificación entre fin del catálogo y comienzo de persistencia, separando el intervalo de `zones.listZonesForCity`. Un intervalo entre eventos no prueba CPU por sí solo. El diagnóstico se publicó en `4595fe39baa720e04769190e69321896105868a4`; la corrección requiere discriminar el tramo lento demostrado, no otro parche especulativo. Un posterior CI verde no prueba que se haya corregido la causa. No se justifica cambiar seeds, timeout ni producción.

Excepción TDD: diagnóstico temporal, no nueva regla ni corrección funcional; no hay RED nuevo significativo y el timeout previo de CI no es evidencia RED/GREEN de una solución. No corresponde mutación todavía. El diagnóstico causal, la corrección y su publicación siguen pendientes; la instrumentación diagnóstica ya fue publicada. Verificador independiente: 4/4 PASS (duplicado 190 ms); comprobó 36 eventos, preservación del rechazo `23505`, conteo final 1 y cero conexiones ajenas. Docker propio `rentoru-ci-import-dup` y namespace `.tmp/rentoru-ci-import-dup/` eliminados tras los ensayos; F35/F36 y el documento ajeno de limpieza no se tocaron. START de revisión nativa no creó lineage: consentimiento vencido; no se afirma aprobación nativa. Diagnóstico publicado, no corrección causal.

## Reconciliación del registro histórico local

Delta distinto conservado del ledger raíz no publicado (el conjunto raíz tenía +43/−16; no son los conteos de este archivo). Preparación confirmó SUCCESS del run `37531531866` y job `112501839280`, sobre `4595fe39baa720e04769190e69321896105868a4`. Registro histórico capturado: 429/429 pruebas, 45/45 archivos PASS; confirmaciones 43,408/36,852 ms, catálogo 34,772/28,866 ms, persistencia 2,287/1,966 ms y conteo 0,586 ms. Types/build/test/measure/lint-tokens/lint PASS; preview/e2e/budget omitidos, no verificados. El run PR `37531535206` omite trabajos pesados por diseño. No se reejecutó ni consultó CI en esta unidad documental; un GREEN diagnóstico no demuestra reparación causal.

Reaparición PR #393: preparación confirmó que el run `37667456263` ahora tiene resultado global SUCCESS, pero el job original `112950210709`, intento 1, FAILED. Registro histórico capturado en el ledger del padre, no trazas verificadas en vivo ni reproducidas aquí: 428/429 PASS y el mismo timeout de 5000 ms; instalación/PostgreSQL/migraciones pasaron. `first.catalogue.listZones`: inicio 3,139 / fin 3138,905 ms (3135,766 ms); segunda lectura 3183,316 / 6413,326 ms (3230,010 ms); caso completo 6417,870 ms. Ciudades <1 ms, zonas por ciudad aproximadamente 1 ms, persistencia 40,460/1,888 ms, conteo 0,593 ms. Eventos posteriores al límite no convierten ese intento en PASS; `end` en `finally` no prueba éxito.

Tramo delimitado al puerto de catálogo completo, no causa SQL demostrada. Siguiente comprobación acotada: separar adquisición de conexión, SQL y transporte/decodificación/mapeo con el mismo caller y catálogo en DB sintética propia; preservar baseline F36.7. Causa aún desconocida: sin aumentar timeout, debilitar aserciones, cambiar seeds/producción ni inventar otra ejecución CI.

## Límites

Sin producción, credenciales, lectura de `.env`, instalaciones, cambios geográficos ni merge del PR. Preservar F35/F36 y el documento ajeno de limpieza. No repetir batería completa ni encadenar soluciones del runner; detener ante un bloqueo concreto. Preservar entorno/sesión baseline F36.7 y recursos ajenos o históricos. El padre controla recursos nuevos: detener sólo servicios propios identificados; cualquier eliminación exige propiedad y consecuencias recién comprobadas, ausencia de trabajo sin publicar y confirmación explícita según AGENTS §6. Causa todavía desconocida; adaptador de vocabulario de publicación no forma parte del recorrido de importación masiva.
