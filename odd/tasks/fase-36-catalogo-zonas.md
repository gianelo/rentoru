# Fase 36.6 — Conciliación del catálogo de zonas

## Alcance y estado

Autorizado por el fundador: continuar 36.6, reproducir Urbanización San Miguel y Urbanización San Rafael de Francisco Eugenio Bustamante, Maracaibo, y comprobar otras pérdidas. Cinco áreas vigentes: Caracas, La Guaira, Maracaibo, Cabimas y Santa Rita. Sin expansión geográfica, fusiones de categorías ni cambios de IDs.

Estado: parser/SQL y entrada CI verificados por el padre (3274 pruebas amplias, taxonomía 7/7 y callers 4/4); los dos contratos de subprocesos pasan en ejecución manual aportada por el fundador; no se afirma una ejecución automatizada global de integración. Caracterización permanente de actualización y tres mutaciones causales verificadas; control final 12 PG PASS sin omisiones/errores. El padre eliminó y verificó la ausencia de los recursos del primer intento y de r2 (Docker y namespace completos); también comprobó el SHA original de seed. F35/F36 permanecen intactos. Rama propia `fix/fase-36-catalogo-zonas`, creada desde `dev` para no mezclar el PR documental #381 aún abierto. 36.6 no está cerrada. No se autoriza producción, lectura de `.env`, reseed de entornos existentes ni publicación automática. El fundador autoriza un Docker desechable y exige eliminar los recursos creados al terminar. `rentoru-f36-pg` (55433) y `rentoru-f35-pg` (55435) quedan intactos.

## Evidencia inicial

Verificador independiente `muvzo5aa-6-ikcy`: cadena real de lectores/importador/alias ejecutada offline, 5 suites/39 pruebas pasan. 5796 IDs únicos; cero padres rotos, municipios sin área o alias huérfanos. No constituye inventario de una DB viva ni RED TDD.

`toponym-index.ts` interpreta sólo la primera entrada por segmento y omite las siguientes separadas por `·`. Reproducción con parser y resolver reales, transformación sólo en memoria: 656 alias adicionales sobre 654 caminos; 3547 actuales conservados, 4203 resultantes. Distribución de alias perdidos: Caracas 327, La Guaira 95, Maracaibo 221, Cabimas 5, Santa Rita 8.

Casos fuente: `docs/territorio/zulia/maracaibo.md:955–956`, parroquia UBIGEO 231309. IDs: San Miguel `dbcbaa62-9b6b-54ad-4fd8-8c13d27811f1`; San Rafael `39a50c8d-c245-90e9-7f6e-cbda846ee04e`. Las urbanizaciones existen en el corpus pero carecen de sus alias cortos. Barrios/sectores homónimos son identidades diferentes.

Hipótesis adicional: OR por palabras y LIMIT 60 en lector SQL; límite 8 en dominio. La prueba pura demuestra exclusión de ambos casos del top 8 bajo su orden simulado, no el orden efectivo de PostgreSQL ni una política nueva de ranking.

## Tareas de trabajo

- [x] C36.6.1 Diagnóstico offline del corpus completo. Evidencia: informe independiente citado y nombres/IDs fuente. Ruta delegada por presupuesto de evidencia.
- [x] C36.6.2 Reproducir seed y consultas reales en DB desechable. Verificador `muvzv47s-7-fapo`: 22 migraciones, 5796 zonas, 3547→4203 alias; ambas urbanizaciones existen y permanecen excluidas por LIMIT 60 aun con alias corregidos. San Miguel/San Rafael: posiciones SQL por nombre 450/465; consulta completa 1042/1054. El límite 8 del dominio no causó la exclusión actual. Tres contenedores propios eliminados tras dos intentos diagnósticos insuficientes y una comparación completa; IDs y ausencia comprobados en el informe. Sin volúmenes registrados; F35/F36 intactos. Ningún RED/GREEN de implementación todavía.
- [ ] C36.6.3 Corregir únicamente defectos demostrados y acordar cualquier decisión de ranking necesaria. Parcial: `src/modules/listing-catalogue/infrastructure/toponym-index.ts` expande las entradas secundarias de cada parroquia; pruebas `expande entradas secundarias con · sin perder la parroquia de cada <br>` y `conserva todos los alias anteriores y agrega los 656 secundarios sin cambiar zonas` en `toponym-index.test.ts`. RED: dos fallos (2/4 entradas y 3547/4203 alias); GREEN: 8/8. Mutación a primera entrada: los mismos dos tests RED; restaurada. Segundo avance: `drizzle-zone-vocabulary.ts` elimina los tres LIMIT 60 prematuros sin cambiar OR, orden SQL ni ranking/límite 8 del dominio. `seed-taxonomy.test.ts`, suite `36.6 catálogo real contra publicación`, prueba ambos IDs, El Centro y conservación/compatibilidad. Callers reales: `atributos-y-zona.test.tsx` prueba radios, nombres y alcance; `zonas/route.test.ts` prueba JSON. RED 3 SQL + 4 callers; GREEN 9/9; mutación de los tres LIMIT 60 vuelve a producir los siete fallos. Restaurada y GREEN final 33/33 seleccionados. Verificación completa posterior detectó contaminación por seed demo; aislamiento y callers se corrigen en el tercer avance. Revalidación PG completa y cierre por el padre pendientes.
- [ ] C36.6.4 Verificar conservación del corpus de cinco áreas y compatibilidad ciudad/zona, IDs, alias y callers; actualizar índice con archivos y pruebas nombradas sólo tras evidencia completa. Commit/publicación requieren decisión expresa del fundador.

## Seguridad y verificación

No ejecutar `smoke:taxonomy` (hace backfill), CLI seed, drizzle-kit ni configuración de integración con autoload `.env`. Usar Vitest programático aislado con `config:false`, `envDir:false`, sin caches/coverage/watch/API, alias `@` explícito; migrador instalado y `seedTaxonomy(db)` con handle propio. Datos locales sintéticos. Ningún contenedor existente se modifica o elimina. El archivo ajeno `odd/tasks/limpieza-docker-pruebas-antiguas.md` se preserva.

Presupuesto inicial: corrección de parser y regresiones estimada por debajo de 400 líneas revisables; SQL/ranking todavía sin estimación fundada. Si aparece otra área de cambio, volver a delimitar antes de escribir. Estrategia: preguntar si la entrega excede el presupuesto del repositorio. No hay commit nuevo ni aprobación nativa de este trabajo.

## Cadena de entrega

Rama integradora `feat/fase-36-catalogo-zonas`, PR borrador hacia `dev`, sin merge autorizado. Primer corte: corrección de parser/SQL y regresiones hasta HTML/JSON. Segundo corte: prueba de conservación y cierre documental. Los resultados citados proceden del worktree completo previo; cada corte se verificará por separado antes de publicarse. El historial completo se conserva para el segundo corte. `AGENTS.md` incluye la regla de TODO cortos. El documento ajeno de limpieza queda excluido.
