# Fase 36.6 — Conciliación del catálogo de zonas

## Alcance y estado

Autorizado por el fundador: continuar 36.6, reproducir Urbanización San Miguel y Urbanización San Rafael de Francisco Eugenio Bustamante, Maracaibo, y comprobar otras pérdidas. Cinco áreas vigentes: Caracas, La Guaira, Maracaibo, Cabimas y Santa Rita. Sin expansión geográfica, fusiones de categorías ni cambios de IDs.

Estado: implementación 36.6 completa, con evidencia previa de 3274 pruebas unitarias, control final 12 PG PASS, tres mutaciones de actualización RED/restauración GREEN y dos contratos manuales PASS. Entrega, CI y merge pendientes; no está lista para producción ni se afirma integración global GREEN o inventario productivo. Tracker #382 borrador; primer corte #383 (`81057b2`); segundo corte en `test/fase-36-catalogo-zonas-02`, commit pendiente del padre. Por orden expresa del fundador se finaliza sin nuevas comprobaciones funcionales ni revisión nativa RDD. Sin producción, `.env`, reseed ni recursos nuevos; F35/F36 intactos. Aquí sólo se implementa 36.6: 36.1/36.3/36.4/36.5 quedan fuera, en el PR #381 separado.

## Evidencia inicial

Verificador independiente `muvzo5aa-6-ikcy`: cadena real de lectores/importador/alias ejecutada offline, 5 suites/39 pruebas pasan. 5796 IDs únicos; cero padres rotos, municipios sin área o alias huérfanos. No constituye inventario de una DB viva ni RED TDD.

`toponym-index.ts` interpreta sólo la primera entrada por segmento y omite las siguientes separadas por `·`. Reproducción con parser y resolver reales, transformación sólo en memoria: 656 alias adicionales sobre 654 caminos; 3547 actuales conservados, 4203 resultantes. Distribución de alias perdidos: Caracas 327, La Guaira 95, Maracaibo 221, Cabimas 5, Santa Rita 8.

Casos fuente: `docs/territorio/zulia/maracaibo.md:955–956`, parroquia UBIGEO 231309. IDs: San Miguel `dbcbaa62-9b6b-54ad-4fd8-8c13d27811f1`; San Rafael `39a50c8d-c245-90e9-7f6e-cbda846ee04e`. Las urbanizaciones existen en el corpus pero carecen de sus alias cortos. Barrios/sectores homónimos son identidades diferentes.

Hipótesis adicional: OR por palabras y LIMIT 60 en lector SQL; límite 8 en dominio. La prueba pura demuestra exclusión de ambos casos del top 8 bajo su orden simulado, no el orden efectivo de PostgreSQL ni una política nueva de ranking.

## Tareas de trabajo

- [x] C36.6.1 Diagnóstico offline del corpus completo. Evidencia: informe independiente citado y nombres/IDs fuente. Ruta delegada por presupuesto de evidencia.
- [x] C36.6.2 Reproducir seed y consultas reales en DB desechable. Verificador `muvzv47s-7-fapo`: 22 migraciones, 5796 zonas, 3547→4203 alias; ambas urbanizaciones existen y permanecen excluidas por LIMIT 60 aun con alias corregidos. San Miguel/San Rafael: posiciones SQL por nombre 450/465; consulta completa 1042/1054. El límite 8 del dominio no causó la exclusión actual. Tres contenedores propios eliminados tras dos intentos diagnósticos insuficientes y una comparación completa; IDs y ausencia comprobados en el informe. Sin volúmenes registrados; F35/F36 intactos. Ningún RED/GREEN de implementación todavía.
- [x] C36.6.3 Corregir únicamente defectos demostrados, sin cambiar ranking. Implementación en `81057b2` (#383); pruebas nombradas y RED/GREEN previos: `src/modules/listing-catalogue/infrastructure/toponym-index.ts` expande las entradas secundarias de cada parroquia; pruebas `expande entradas secundarias con · sin perder la parroquia de cada <br>` y `conserva todos los alias anteriores y agrega los 656 secundarios sin cambiar zonas` en `toponym-index.test.ts`. RED: dos fallos (2/4 entradas y 3547/4203 alias); GREEN: 8/8. Mutación a primera entrada: los mismos dos tests RED; restaurada. Segundo avance: `drizzle-zone-vocabulary.ts` elimina los tres LIMIT 60 prematuros sin cambiar OR, orden SQL ni ranking/límite 8 del dominio. `seed-taxonomy.test.ts`, suite `36.6 catálogo real contra publicación`, prueba ambos IDs, El Centro y conservación/compatibilidad. Callers reales: `atributos-y-zona.test.tsx` prueba radios, nombres y alcance; `zonas/route.test.ts` prueba JSON. RED 3 SQL + 4 callers; GREEN 9/9; mutación de los tres LIMIT 60 vuelve a producir los siete fallos. Restaurada y GREEN final 33/33 seleccionados. Verificación completa posterior detectó contaminación por seed demo; aislamiento y callers se corrigen en el tercer avance. Control posterior 12 PG PASS y contratos manuales PASS documentados abajo; CI y merge de entrega pendientes.
- [x] C36.6.4 Verificar conservación y compatibilidad del catálogo/referencias e indexar el cierre de implementación. Evidencia: `tests/integration/seed-taxonomy.test.ts`, `36.6 actualización aditiva conserva zonas, alias anteriores y referencias tras dos seeds`, control 12 PG PASS y tres mutaciones RED/restauración GREEN; `tests/integration/publication-zone-catalogue.test.ts`, `sirve el radio de Urbanización %s` y `entrega Urbanización %s por JSON` (San Miguel/San Rafael). Índice: OpenSpec 36.6. Segundo commit/publicación pendientes del padre; no implica merge ni producción.

## Seguridad y verificación

No ejecutar `smoke:taxonomy` (hace backfill), CLI seed, drizzle-kit ni configuración de integración con autoload `.env`. Usar Vitest programático aislado con `config:false`, `envDir:false`, sin caches/coverage/watch/API, alias `@` explícito; migrador instalado y `seedTaxonomy(db)` con handle propio. Datos locales sintéticos. Ningún contenedor existente se modifica o elimina. El archivo ajeno `odd/tasks/limpieza-docker-pruebas-antiguas.md` se preserva.

Presupuesto inicial: corrección de parser y regresiones estimada por debajo de 400 líneas revisables; SQL/ranking todavía sin estimación fundada. Si aparece otra área de cambio, volver a delimitar antes de escribir. Estrategia: preguntar si la entrega excede el presupuesto del repositorio. No hay commit nuevo ni aprobación nativa de este trabajo.

## Primer avance del escritor (histórico)

Conservación offline comprobada: 5796 IDs únicos, 10 municipios, 81 parroquias y 5705 elementos; cero municipios sin área o alias sin resolver; los 3547 pares anteriores están incluidos en los 4203 nuevos. Alias por área: Caracas 2141, La Guaira 430, Maracaibo 1382, Cabimas 116, Santa Rita 134. Ambos IDs reportados tienen sus alias cortos. No se tocó corpus, áreas, schema, migraciones ni ranking.

Runner final seguro (STDIN, sin archivos generados):

```sh
env -i PATH="$PATH" HOME="$HOME" node --input-type=module <<'JS'
import { startVitest } from 'vitest/node';
const ctx = await startVitest('test', ['src/modules/listing-catalogue/infrastructure/toponym-index.test.ts', 'app/publicar/paso/[paso]/atributos-y-zona.test.tsx', 'app/publicar/zonas/route.test.ts'], { config: false, configLoader: 'runner', cache: false, watch: false, api: false, coverage: { enabled: false } }, { envDir: false, resolve: { alias: { '@': `${process.cwd()}/src` } }, oxc: { jsx: { runtime: 'automatic' } } });
process.exitCode = ctx?.state.getFiles().some(f => f.result?.state === 'fail') ? 1 : 0;
await ctx?.close();
JS
```

Resultado final: 3 suites/24 pruebas pasan, 924 ms de runner; 132 ms en la suite parser/corpus (no es timing SQL). HTML/JSON existentes pasan con sus fixtures previas, con warning React por form action/method. Los intentos previos colocaban `resolve`/`envDir` en el argumento CLI incorrecto (alias no resuelto; aislamiento de env no garantizado en esos intentos) y usaban `esbuild` ignorado por Vite 8 (JSX sin transformar); el runner final los corrige en el cuarto argumento y usa `oxc`.

Experimento descartado, no regresión retenida: inyectar todo el corpus en orden fuente y exigir estos IDs para las consultas cortas San Miguel/San Rafael produjo cuatro fallos HTML/JSON incluso con parser corregido. Ese orden no es el de PostgreSQL y las primeras ocho coincidencias legítimas excluían los casos. No se cambió ranking ni se debilitaron las aserciones para hacerlo pasar: las adiciones provisionales se retiraron completamente. El próximo verificador debe usar resultados del adaptador real, no simular su orden de empates.

Checks exactos:
- `env -i PATH="$PATH" HOME="$HOME" ./node_modules/.bin/biome check src/modules/listing-catalogue/infrastructure/toponym-index.ts src/modules/listing-catalogue/infrastructure/toponym-index.test.ts`: inicialmente falló formato; corregido mediante edit; después pasó (2 archivos).
- `env -i PATH="$PATH" HOME="$HOME" ./node_modules/.bin/tsc --noEmit --incremental false`: pasó, sin salida ni tsbuildinfo.
- `git diff --check`: pasó.
- `git diff --numstat`: 82 inserciones en test; 7 inserciones/2 eliminaciones en parser: 91 líneas revisables de código. Este documento preexistía untracked y se cuenta separadamente; presupuesto SQL todavía pendiente.

Al cierre del primer avance no se crearon recursos Docker; DB/SQL/callers, broad unit y tokens quedaban pendientes. Esa limitación de limpieza se resolvió al suministrar el padre su propio contenedor en el segundo avance; el escritor nunca crea ni elimina contenedores. C36.6.4 y 36.6 permanecen abiertas. El documento ajeno de limpieza se conserva intacto.

## Segundo avance — histórico, contenedor ya eliminado por el padre

Validado antes de migración/seed y cada runner: ID `548c3100f959ea4c54615a02b6fc9b2097d8807837835a8d2eab89e81d45a66d`, nombre `/rentoru-f366-fix`, label `rentoru.work-unit=36.6`, binding `127.0.0.1:55436`, tmpfs PG18 y sin mounts/volúmenes. Migrador instalado: `await migrate(drizzle(pool), { migrationsFolder: './drizzle' })`, seguido de `finally { await pool.end(); }`. Seed real con handle propio, sin CLI/client productivo ni deletes. Los dos tests legacy de seed con wipe/demo se excluyeron explícitamente; sus comprobaciones territoriales y ausencia de usuarios/avisos se ejercitan en la nueva suite sin wipe. Expectativa legacy actualizada a 4203.

RED previo a implementación: runner inferior con sólo seed y `testNamePattern: '36.6'`: 3 fallos (ambos IDs ausentes y 60/907 alias El Centro); luego sólo callers con ese patrón: 4 fallos (radios ausentes y JSON vacío). GREEN tras retirar límites: 9 pasan. Mutación de las tres consultas a `.limit(60)`, runner de los tres archivos con patrón `36.6`: 7 fallos / 2 pasan. Restauración y runner final inferior: 4 suites, 33 pasan / 2 legacy excluidos; cero errores no manejados. Los tests PG de callers son opt-in por TEST_DATABASE_URL y se ejecutaron, no se saltaron, en este harness.

Tradeoff: traer todos los candidatos del catálogo finito (5796 zonas/4203 alias), no aumentar un límite arbitrario ni reescribir OR como AND. Orden por nombre/alias y empates SQL intactos; dominio sigue ofreciendo como máximo ocho. Últimas mediciones locales de un lookup: San Miguel 35.42 ms (1160 zonas/359 alias), San Rafael 35.00 ms (1170/371), El Centro 21.27 ms (1403/907). Primera pasada GREEN medida: 30.50/25.35/20.20 ms. No son presupuesto ni garantía productiva.

Comando exacto del segundo avance, histórico y NO autorizado ahora (contenedor eliminado; callers PG trasladados después). Guards antes de Vitest en main/workers; archivos regulares propios y include exacto escapado:

```sh
test "$(docker inspect --format '{{.Id}}|{{.Name}}|{{index .Config.Labels "rentoru.work-unit"}}|{{(index (index .HostConfig.PortBindings "5432/tcp") 0).HostIp}}|{{(index (index .HostConfig.PortBindings "5432/tcp") 0).HostPort}}' 548c3100f959ea4c54615a02b6fc9b2097d8807837835a8d2eab89e81d45a66d)" = '548c3100f959ea4c54615a02b6fc9b2097d8807837835a8d2eab89e81d45a66d|/rentoru-f366-fix|36.6|127.0.0.1|55436' && env -i PATH="$PATH" HOME="$HOME" TEST_DATABASE_URL='postgres://postgres:postgres@127.0.0.1:55436/rentas_test' node --input-type=module <<'JS'
import fs from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
import { fileURLToPath } from 'node:url';
function guard() {
  const denied = p => /(^|[/\\])\.env(?:[./\\]|$)/u.test(p instanceof URL ? fileURLToPath(p) : String(p));
  for (const object of [fs, fs.promises]) for (const key of ['readFile', 'readFileSync', 'open', 'openSync']) {
    if (typeof object[key] !== 'function') continue;
    const original = object[key];
    object[key] = function(p, ...args) { if (denied(p)) throw new Error('ENV_FILE_ACCESS_DENIED'); return original.call(this, p, ...args); };
  }
  process.loadEnvFile = () => { throw new Error('ENV_FILE_ACCESS_DENIED'); };
  syncBuiltinESMExports();
}
guard();
const dsn = 'postgres://postgres:postgres@127.0.0.1:55436/rentas_test';
if (process.env.TEST_DATABASE_URL !== dsn) throw new Error('DSN mismatch');
const files = ['src/modules/listing-catalogue/infrastructure/toponym-index.test.ts', 'tests/integration/seed-taxonomy.test.ts', 'app/publicar/paso/[paso]/atributos-y-zona.test.tsx', 'app/publicar/zonas/route.test.ts'];
for (const path of files) { const s = fs.lstatSync(path); if (!s.isFile() || s.isSymbolicLink() || s.uid !== process.getuid() || fs.realpathSync(path) !== `${process.cwd()}/${path}`) throw new Error('Unsafe test path'); }
const workerGuard = 'data:text/javascript,' + encodeURIComponent(`import fs from 'node:fs'; import {syncBuiltinESMExports} from 'node:module'; import {fileURLToPath} from 'node:url'; (${guard.toString()})();`);
const { startVitest } = await import('vitest/node');
let ctx;
try {
  ctx = await startVitest('test', files, { config: false, configLoader: 'runner', run: true, watch: false, api: false, cache: false, coverage: { enabled: false }, environment: 'node', fileParallelism: false, setupFiles: [], globalSetup: [], include: files.map(p => p.replace(/[\[\]]/g, '[$&]')), passWithNoTests: false, testNamePattern: '^(?!seedTaxonomy)', pool: 'threads', maxWorkers: 1, execArgv: ['--import', workerGuard] }, { envDir: false, resolve: { alias: { '@': `${process.cwd()}/src` } }, oxc: { jsx: { runtime: 'automatic' } } });
  const observed = ctx.state.getFiles();
  if (observed.length !== files.length || observed.some(f => !files.includes(f.filepath.slice(process.cwd().length + 1)) || f.result?.state !== 'pass') || ctx.state.getUnhandledErrors().length) process.exitCode = 1;
} catch (error) { console.error(error); process.exitCode = 1; }
finally { await ctx?.close(); }
const { Pool } = await import('pg');
const pool = new Pool({ connectionString: dsn });
try {
  const result = await pool.query('SELECT count(*)::int AS n FROM pg_stat_activity WHERE datname = current_database() AND pid <> pg_backend_pid()');
  console.log('Other owned-database connections after Vitest close:', result.rows[0].n);
  if (result.rows[0].n !== 0) process.exitCode = 1;
} finally { await pool.end(); }
JS
```

Checks finales: `env -i PATH="$PATH" HOME="$HOME" ./node_modules/.bin/biome check src/modules/listing-catalogue/infrastructure/toponym-index.ts src/modules/listing-catalogue/infrastructure/toponym-index.test.ts src/modules/listing-publication/infrastructure/drizzle-zone-vocabulary.ts tests/integration/seed-taxonomy.test.ts 'app/publicar/paso/[paso]/atributos-y-zona.test.tsx' app/publicar/zonas/route.test.ts`: pasó, 6 archivos (antes falló formato y se corrigió). `env -i PATH="$PATH" HOME="$HOME" ./node_modules/.bin/tsc --noEmit --incremental false`: pasó. `env -i PATH="$PATH" HOME="$HOME" node scripts/lint-tokens.mjs`: pasó, 309 archivos. `git diff --check`: pasó. Broad unit pendiente para verificador separado por presupuesto de auditoría de efectos/imports; no se arrancó Next ni suite global.

Cleanup: cero conexiones ajenas al chequeo final en la DB propia tras cerrar Vitest; pool final cerrado en finally. El padre verificó nombre y label y eliminó `548c3100f959ea4c54615a02b6fc9b2097d8807837835a8d2eab89e81d45a66d` mediante `docker rm -fv`; ID y nombre ausentes después. tmpfs sin volumen persistente. F35/F36 comprobados activos e intactos en 55435/55433. Verificación amplia independiente en curso (`muw0u1lm-b-lara`); 36.6 permanece abierta. F35/F36 no se consultaron ni modificaron en este avance. Sin Git mutaciones, commits ni publicación. Presupuesto: 275 líneas de código revisables + 110 líneas de este documento untracked = 385 si se entrega entero, bajo 400. El PR documental #381 y el documento ajeno de limpieza no se incluyen.

## Tercer avance — corrección del resultado independiente, PG pendiente

Evidencia RED aportada por el padre: corrida completa, 34 pasan / 1 falla; el afterAll legacy hace `seed(demo)` y deja 2 usuarios/10 avisos antes de la nueva suite. Los GREEN filtrados del segundo avance son reales pero NO prueban aislamiento de la corrida completa. No se quitan las aserciones cero ni se cambian timeouts. `seed-taxonomy.test.ts` ahora inicia una transacción, aparta sólo listings/publicantes de los dos correos exactos de la demo y conserva los guards cero; al terminar hace ROLLBACK con `withPoolCleanup`, restaurando el estado previo y cerrando incluso si falla el rollback. Implementación escrita sobre ese RED conocido; GREEN PG de esta corrección todavía no observado.

`seed.test.ts`: ambas expectativas 3547→4203 y sus comentarios actualizados; comentario de `src/shared/db/seed.ts` y conteo explícito del índice en `docs/territorio/README.md` corregidos. Sin cambio de reglas, IDs, categorías, áreas ni ranking.

Los cuatro casos PG se trasladaron a `tests/integration/publication-zone-catalogue.test.ts`, incluido por el glob existente `tests/integration/**/*.test.ts`. No importa specs unitarios: ambos callers reales comparten un único mock del handle DB, pero ejecutan DrizzleZoneVocabulary y aplicación reales. Sesión/draft son fixtures mínimos; HTML se afirma dentro del POST por radio ID, etiqueta y alcance; JSON por objeto servido, status y no-store. DSN obligatorio: ausencia falla, nunca skip. BeforeAll hace seedTaxonomy con handle explícito; afterAll cierra conexión. No son spies sobre imports o llamadas. Los dos archivos unitarios conservan sus casos previos sin dependencia PG. Se eligió esta entrada única en vez de dos bridges para evitar importar mocks incompatibles; funcionamiento PG conjunto pendiente de prueba, no supuesto GREEN. `vitest.integration.config.ts` sólo agrega `oxc.jsx.runtime=automatic`; discovery y comportamiento env intactos.

Sin Docker, DB, CLI seed, child_process, red o Next ejecutados en este avance. Cleanup actual: NINGÚN contenedor propio activo, según confirmación del padre; no se recreó el ID histórico. Próxima verificación del padre: runner aislado y DSN propio validado, sin filtro de nombres sobre seed-taxonomy completo + nuevo spec CI + seed.test (sus dos tests child_process requieren autorización separada); reproducir RED de aislamiento por mutación de la limpieza sintética, restaurar y GREEN. Los cuatro nuevos casos de entrada CI deben probarse contra PG y la mutación LIMIT 60 nuevamente por esa entrada.

Checks del tercer avance: runner unitario guardado abajo, 3 suites / 24 pasan, ninguno omitido, 1.25 s; warning React action/method ya conocido. Biome 10 archivos pasó tras corregir formato del nuevo spec; typecheck sin incremental pasó; diff check pasó. No se presenta ningún GREEN nuevo de fixture PG, conteos seed legacy o callers CI.

Comando unitario exacto:

```sh
env -i PATH="$PATH" HOME="$HOME" node --input-type=module <<'JS'
import fs from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
import { fileURLToPath } from 'node:url';
function guard() {
  const denied = p => /(^|[/\\])\.env(?:[./\\]|$)/u.test(p instanceof URL ? fileURLToPath(p) : String(p));
  for (const object of [fs, fs.promises]) for (const key of ['readFile', 'readFileSync', 'open', 'openSync']) {
    if (typeof object[key] !== 'function') continue;
    const original = object[key];
    object[key] = function(p, ...args) { if (denied(p)) throw new Error('ENV_FILE_ACCESS_DENIED'); return original.call(this, p, ...args); };
  }
  process.loadEnvFile = () => { throw new Error('ENV_FILE_ACCESS_DENIED'); };
  syncBuiltinESMExports();
}
guard();
const files = ['src/modules/listing-catalogue/infrastructure/toponym-index.test.ts', 'app/publicar/paso/[paso]/atributos-y-zona.test.tsx', 'app/publicar/zonas/route.test.ts'];
for (const path of files) { const s = fs.lstatSync(path); if (!s.isFile() || s.isSymbolicLink() || s.uid !== process.getuid() || fs.realpathSync(path) !== `${process.cwd()}/${path}`) throw new Error('Unsafe test path'); }
const workerGuard = 'data:text/javascript,' + encodeURIComponent(`import fs from 'node:fs'; import {syncBuiltinESMExports} from 'node:module'; import {fileURLToPath} from 'node:url'; (${guard.toString()})();`);
const { startVitest } = await import('vitest/node');
let ctx;
try {
  ctx = await startVitest('test', files, { config: false, configLoader: 'runner', run: true, watch: false, api: false, cache: false, coverage: { enabled: false }, environment: 'node', fileParallelism: false, setupFiles: [], globalSetup: [], include: files.map(p => p.replace(/[\[\]]/g, '[$&]')), passWithNoTests: false, pool: 'threads', maxWorkers: 1, execArgv: ['--import', workerGuard] }, { envDir: false, resolve: { alias: { '@': `${process.cwd()}/src` } }, oxc: { jsx: { runtime: 'automatic' } } });
  const observed = ctx.state.getFiles();
  if (observed.length !== files.length || observed.some(f => !files.includes(f.filepath.slice(process.cwd().length + 1)) || f.result?.state !== 'pass') || ctx.state.getUnhandledErrors().length) process.exitCode = 1;
} catch (error) { console.error(error); process.exitCode = 1; }
finally { await ctx?.close(); }
JS
```

`env -i PATH="$PATH" HOME="$HOME" ./node_modules/.bin/biome check src/modules/listing-catalogue/infrastructure/toponym-index.ts src/modules/listing-catalogue/infrastructure/toponym-index.test.ts src/modules/listing-publication/infrastructure/drizzle-zone-vocabulary.ts src/shared/db/seed.ts tests/integration/seed-taxonomy.test.ts tests/integration/seed.test.ts tests/integration/publication-zone-catalogue.test.ts 'app/publicar/paso/[paso]/atributos-y-zona.test.tsx' app/publicar/zonas/route.test.ts vitest.integration.config.ts`: pasó (10). `env -i PATH="$PATH" HOME="$HOME" ./node_modules/.bin/tsc --noEmit --incremental false`: pasó. `git diff --check`: pasó. Broad unit sigue pendiente; tokens fueron GREEN en el segundo avance, no se reejecutaron aquí.

Presupuesto actualizado: 241 líneas tracked + 101 del nuevo spec = 342, incluyendo las 5 líneas README; este documento untracked tiene 158 líneas, total 500 (337 código/config/tests + 163 documentación). Si la entrega total supera 400, la disposición corresponde al fundador/padre antes de cualquier commit: no dividir cosméticamente ni inflar el cambio. C36.6.3/C36.6.4 y 36.6 permanecen abiertas.

## Verificación independiente posterior y actualización existente

`muw1dj8z-e-wmr3`: suite amplia 297 suites/3274 pruebas pasan, cero omisiones y errores no manejados. PG: 18 pasan/2 fallan; taxonomía 7/7 y callers HTML/JSON 4/4 pasan. Las dos pruebas restantes de `seed.test.ts` quedaron bloqueadas por el arnés de subprocesos (no defecto de fuente demostrado); comando global exit 1, no GREEN completo. Biome 10 archivos, tipos, tokens 309 y diff check pasan. Todos los Docker y temporales propios de esas ejecuciones fueron eliminados; F35/F36 intactos.

Requisito expreso del fundador: conservar las zonas ya existentes en producción. Probar en DB desechable la actualización 3547→4203 alias, sin modificar identidades ni atributos existentes, manteniendo todas las referencias de avisos/fotos y repitiendo el seed sin duplicados. No hay autorización de acceso o reseed en producción. Evidencia estática: seed usa `DO NOTHING` para zonas y alias; no sustituye atributos existentes.

La prueba de actualización todavía no produjo snapshots: un intento falló antes de migrar por falta de readiness; otro antes de SQL por detección CI de una clave ausente bloqueada por el arnés; el último preflight detectó metadata macOS `__CF_USER_TEXT_ENCODING` antes de crear recursos. Estos intentos no son prueba de incompatibilidad ni de preservación. El padre delimitó el runner a entorno vacío, metadata de plataforma conocida, sin lectura `.env` y con guardas de archivos/red; los intentos posteriores de arnés externo tampoco alcanzaron SQL (path/env/glob). Se abandona la detección de specs temporales externos: la siguiente prueba vive en el archivo de integración existente bajo la raíz. Dos contratos de subprocesos siguen pendientes por separado. No declarar despliegue listo ni cerrar 36.6 hasta evidencia observada.

## Cuarto avance — caracterización permanente de actualización, PG pendiente

Archivo: `tests/integration/seed-taxonomy.test.ts`. Nombre completo: `36.6 actualización aditiva conserva zonas, alias anteriores y referencias tras dos seeds`. Selectores para el runner programático ROOT ya documentado: `files = ['tests/integration/seed-taxonomy.test.ts']`, `include` igual, `testNamePattern: '^36\\.6 actualización aditiva conserva zonas, alias anteriores y referencias tras dos seeds$'` (string JS con el punto escapado). Sin spec externo, sin dotenv/config autoload ni CLI seed; el padre debe suministrar y validar una nueva DB propia antes de ejecutarlo. Para verificar convivencia, correr después todo el archivo sin filtro.

Un handle PG explícito y transacción propia; setup sólo si no hay zonas. Baseline obligatorio 5796 zonas/4203 alias. Se deriva la gramática anterior de los archivos fuente con la misma expresión de `toponym-index.test.ts` (quitar entradas `·` antes de parsear). Se comprueban todos los 3547 pares anteriores y sus destinos; la diferencia debe ser exactamente 656 y sólo esos pares se eliminan dentro de la transacción. Tras cada una de dos llamadas a seedTaxonomy se exigen 4203 alias únicos, igualdad completa de todos los alias (PK compuesta/destinos incluidos), de las 5796 filas completas de zone y de user/listing/listing_photo/listing_photo_derivative, mediante SELECT to_jsonb ordenado determinísticamente.

Fixture no vacua: añade usuario/aviso/foto/derivada propios, con IDs aleatorios, FK hacia una zona derivada del corpus, fecha fija y clave de objeto sintética opaca; no hay llamada a storage. Los snapshots incluyen también todas las filas preexistentes. Ninguna zona, usuario, aviso o foto original se elimina. ROLLBACK en finally restaura todo y withPoolCleanup cierra incluso si falla el rollback. Guards cero de las otras suites y teardown legacy intactos; código productivo sin cambios en este avance.

Excepción TDD explícita: se caracteriza el ON CONFLICT existente, no se cambia comportamiento ni se afirma un bug de actualización. No hay RED/GREEN PG nuevo observado; los fallos previos de arnés no sirven como RED de esta propiedad. Pendiente prueba PG y mutaciones dirigidas de atributos de zona, eliminación de alias anterior y sobrescritura de referencias: cada mutación debe hacer fallar este test seleccionado, restaurar y observar GREEN. No se ejecutó DB/Docker/subprocesos/red/producción en este avance; ningún recurso propio activo según el padre.

Verificación ordinaria: `env -i PATH="$PATH" HOME="$HOME" ./node_modules/.bin/biome check tests/integration/seed-taxonomy.test.ts`: inicialmente falló formato, corregido con edit; luego pasó (1 archivo). `env -i PATH="$PATH" HOME="$HOME" ./node_modules/.bin/tsc --noEmit --incremental false`: pasó. `git diff --check`: pasó. Evidencia amplia previa 3274, PG taxonomía 7 y callers 4 se conserva; las dos pruebas seed de subprocesos siguen bloqueadas, no se afirma full PASS.

Presupuesto acumulado antes de este intento de mutación: 456 líneas código/config/tests, más 185 de documentación (total 641) (supera 400 incluso sin este documento). El padre/fundador debe decidir la disposición de entrega antes de cualquier commit; no se divide cosméticamente ni se borra historial para encoger el PR. Tareas 3/4 y 36.6 siguen abiertas.

## Continuación autorizada

El fundador autoriza continuar las comprobaciones pendientes, con la condición expresa de no dañar otras pruebas. Sin commit ni publicación. Primero se delimita en una exploración de sólo lectura el fallo del runner (import SSR adicional con exit 13); no se crea otro Docker ni se muta código hasta resolver ese paso. Se mantienen aserciones, timeouts y suites existentes; cada mutación temporal debe restaurarse y comprobarse con las pruebas relacionadas. Exploración delegada: `muwws2d6-n-swna`. Los recursos del intento anterior ya están eliminados.

## Quinto avance — control PASS, mutaciones NO ejecutadas; intento detenido

Verificador independiente `muw2yasl-k-x73v`: archivo taxonomy completo 8 + callers 4 = 12 PASS, cero omisiones/errores. Upgrade: snapshots 5796 zonas, 3 usuarios, 11 avisos, 1 foto y 1 derivada preservados tras ambos seeds 3547→4203; rollback restaura 2/10/0/0; prueba ~1.1 s. Es evidencia real de actualización, no de acceso productivo. Dos contratos de subprocesos permanecen bloqueados por arnés; no hay full PASS global.

Intento causal del escritor: padre suministró contenedor `afdd89acf9abebc0e5a4b4a95ea2fceddc60644943b0fed15c5c2a3216fc4a75`, `/rentoru-f366-mutation`, label 36.6 y loopback 55436; inspect validó ID/nombre/label/binding y `pg_isready` respondió accepting connections antes de migrar. Namespace exacto `.tmp/rentoru-f366-mutation-afdd89acf9ab/`, creado fresco por el padre, validado propio/no symlink. Runner ROOT por STDIN, paquetes desde repo, config false, ARG4 envDir false/alias/JSX, guards env/fs/network en main/workers, sólo TCP PG propio, sin child_process, cleanup de filesystem diferido al padre dentro del namespace (fuera denegado).

Comando de ejecución: `env -i PATH="$PATH" HOME="$HOME" TEST_DATABASE_URL='postgres://postgres:postgres@127.0.0.1:55436/rentas_test' TMPDIR='/Users/gianelo/Documents/Dev/py/rentas.com.ve/.tmp/rentoru-f366-mutation-afdd89acf9ab' node --input-type=module < .tmp/rentoru-f366-mutation-afdd89acf9ab/mutation-runner.mjs`, precedido por inspect exacto y `docker exec <ID propio> pg_isready -h 127.0.0.1 -p 5432 -U postgres -d rentas_test`. Observado: 22 migraciones, control completo 12 PASS, prueba upgrade 1115 ms. Luego un import SSR adicional para resolver el alias quedó en await pendiente: Node terminó con exit 13. Falló el arnés DESPUÉS del control, ANTES de aplicar cualquier mutación; no es RED de zona/alias/referencia. El import extra se retiró del artefacto y se comprobó la entrada anterior Bella Vista/Coquivacoa en maracaibo.md:2187, pero NO se reejecutó el runner: el padre pidió detener troubleshooting.

Restauración: guard de exit/finally restituye bytes originales; `git diff -- src/shared/db/seed.ts` confirma únicamente el comentario 3547→4203 ya autorizado, ningún cambio de runtime. El proceso foreground terminó; pool de migración cerrado en finally y teardowns de las 12 pruebas completados. No se hizo una consulta adicional de conexiones, ni se afirma nueva prueba de cero conexiones. Ningún proceso en background se lanzó. Al finalizar el escritor quedaba cleanup pendiente del padre. Después, el padre validó ID/nombre/label y eliminó mediante `docker rm -fv` el contenedor exacto `afdd89acf9abebc0e5a4b4a95ea2fceddc60644943b0fed15c5c2a3216fc4a75` y el namespace propio `.tmp/rentoru-f366-mutation-afdd89acf9ab/` (incluido mutation-runner.mjs), comprobando ambas ausencias. F35/F36 siguen en 55435/55433 sin modificaciones. No se generó mutation-evidence.json. Se conserva el historial de fallos de readiness/env/glob externo: ninguno prueba pérdida de datos. Las tres mutaciones y sus GREEN restaurados siguen pendientes; no se afirman ejecutadas ni se cierra 36.6. Checks finales observados: `env -i PATH="$PATH" HOME="$HOME" ./node_modules/.bin/biome check src/shared/db/seed.ts` PASS (sin fixes); `env -i PATH="$PATH" HOME="$HOME" ./node_modules/.bin/tsc --noEmit --incremental false` PASS; `git diff --check -- src/shared/db/seed.ts odd/tasks/fase-36-catalogo-zonas.md` PASS; diff de seed conserva sólo el comentario 4203. Estos checks no sustituyen las mutaciones faltantes en ese intento histórico.

## Sexto avance — mutaciones causales verificadas, r2

La exploración de sólo lectura `muwws2d6-n-swna` eliminó la necesidad del import SSR: el test permanente deriva sus propios pares antiguos. Se ejecutó únicamente el plan SQL temporal del padre, después del insert de alias y antes del retorno de seedTaxonomy, con import sql/cast execute-capable locales y restauración byte-exact en finally/exit. No se editaron tests, fixtures, aserciones, timeouts, discoverability, puerto SeedDatabase ni runtime permanente.

Recursos parent-owned validados antes de conexiones: ID `55e5268151de0076d239b9818af5ccd610167194730a15eb38130520b9f8502a`, nombre `/rentoru-f366-mutation-r2`, label `rentoru.work-unit=36.6`, binding `127.0.0.1:55436`; pg_isready accepting connections. Namespace exacto `.tmp/rentoru-f366-mutation-r2/`, fresco, propio y sin symlink. Sin Docker/namespace creados o eliminados por el escritor. Guards fs/env/red antes de imports y en workers; sólo PG propio, sin child_process. Cleanup de archivos del runner diferido al padre únicamente dentro del namespace; fuera denegado.

Comando ROOT STDIN, precedido por inspect exacto y `docker exec 55e5268151de0076d239b9818af5ccd610167194730a15eb38130520b9f8502a pg_isready -h 127.0.0.1 -p 5432 -U postgres -d rentas_test`: `env -i PATH="$PATH" HOME="$HOME" TEST_DATABASE_URL='postgres://postgres:postgres@127.0.0.1:55436/rentas_test' TMPDIR='/Users/gianelo/Documents/Dev/py/rentas.com.ve/.tmp/rentoru-f366-mutation-r2' node --input-type=module < .tmp/rentoru-f366-mutation-r2/mutation-runner.mjs`. Config false ARG3; envDir false/alias @/JSX automatic ARG4; cache/watch/API desactivados; contextos nuevos cerrados en finally. Migrador instalado: 22 migraciones; pools explícitos cerrados en finally. Control inicial 8 taxonomy + 4 callers = 12 PASS, cero omisiones/errores; selector PG del alias anterior Bella Vista/Coquivacoa/Oficina Postal Telegráfica Bella Vista devuelve exactamente 1 par.

Cada SQL quedó condicionado al fixture de foto/derivada `full`, key `36.6/upgrade/` + photo.id + `/full`; ausente fuera del upgrade. Único nombre seleccionado: `36.6 actualización aditiva conserva zonas, alias anteriores y referencias tras dos seeds` (los otros 7 casos quedan fuera por filtro autorizado). Exactamente tres ejecuciones mutadas, sin repetir ninguna:

| Mutante temporal | RED real en seed-taxonomy.test.ts | Restauración / GREEN |
| --- | --- | --- |
| slug de la zona referenciada += `-mutation` | 297:38, igualdad de snapshot completo zone | bytes originales; test 1 PASS, 1151 ms |
| borrar el único alias antiguo Bella Vista, gated por fixture | 293:23, 4202 recibidos contra 4203 esperados | bytes originales; test 1 PASS, 1106 ms |
| reasignar listing.zone_id a otro elemento existente de la misma ciudad | 298:64, snapshot de referencias: a4014c53-8d7d-4573-1869-e8b73cbf3733 → 000b2954-a1ec-0314-1c1a-e79efb85ef11 | bytes originales; test 1 PASS, 1286 ms |

La primera invocación terminó exit 1 DESPUÉS del RED real de zona: el contador del arnés interpretó los 7 casos no seleccionados sin result como activos. Source restaurado inmediatamente. Se corrigió únicamente ese conteo del artefacto, no los tests ni filtros; la continuación empezó con GREEN de zona y ejecutó sólo los dos mutantes restantes. No hubo import SSR ni retry del mutante de zona. La segunda invocación del mismo comando terminó exit 0, todas las comprobaciones esperadas satisfechas. Comparación determinista SHA de todas las filas persistentes zone/zone_alias/user/listing/listing_photo/listing_photo_derivative idéntica antes/después de las mutaciones restantes y de cada GREEN seleccionado; rollback/cleanup del test conservados.

Control final sin filtro y fuente restaurada: 2 suites, 12 PASS, cero skips/errores no manejados; upgrade 1241 ms. Warnings conocidos React form action/method y pg de queries concurrentes no fallaron pruebas; no se modifican fuera de alcance. SHA256 inicial/backup/final de seed: `916ff16d1c777e46c042cce74f0b9d694cfb27fcb93a6fc8998225409b597600`. Backup `seed.original.bin`, runner y `mutation-evidence.json` quedan sólo en el namespace autorizado. Consulta pg_stat_activity tras cerrar Vitest: cero conexiones adicionales en la DB propia; pool de chequeo cerrado en finally. Proceso foreground terminado. El padre comprobó el SHA original de seed, validó ID/nombre/label del contenedor y eliminó ese Docker y `.tmp/rentoru-f366-mutation-r2/` completo; ambas ausencias verificadas. F35/F36 siguen en 55435/55433 sin alteraciones; producción no se consulta ni modifica.

Checks finales tras restauración: `env -i PATH="$PATH" HOME="$HOME" ./node_modules/.bin/biome check src/shared/db/seed.ts` PASS sin fixes; `env -i PATH="$PATH" HOME="$HOME" ./node_modules/.bin/tsc --noEmit --incremental false` PASS; `git diff --check -- src/shared/db/seed.ts odd/tasks/fase-36-catalogo-zonas.md` PASS; `git diff -- src/shared/db/seed.ts` sólo comentario 3547→4203. Esto completa las mutaciones de conservación delegadas, no el cierre global de 36.6 ni los dos contratos de subprocesos pendientes por separado. Sin commits/publicación; presupuesto acumulado ya excede 400 líneas y la disposición de entrega permanece del padre/fundador.

## Verificación independiente final — contratos de subprocesos pendientes

`muwx63ha-p-aury`: Biome nueve archivos, tipos sin incremental y diff check pasan; SHA de seed coincide con el original. Revisión independiente no encuentra mutaciones remanentes ni debilitamiento de pruebas; confirma fixtures no vacuas, dos seeds, snapshots completos, rollback y aserciones sobre HTML/JSON servidos. No repite los tres RED ni las 12 pruebas PG: distingue la evidencia del escritor/padre. Presupuesto: 456 líneas revisables de código/config/tests + 221 documentales en ese momento (677 total).

Las dos comprobaciones de subprocesos no arrancaron: preflight `UNSAFE_NAMESPACE` por caché de compilación que TypeScript generó dentro de `.tmp/rentoru-f366-final-check/`. No hay defecto del producto demostrado. El padre eliminó y verificó ausencia del namespace completo. La autorización técnica permite salidas generadas dentro del namespace propio; no requiere que siga vacío tras otros checks. Continuación acotada `muwxavti-q-rpki`, sólo los dos contratos, sin repetir tipos/formato: nuevo namespace fresco `.tmp/rentoru-f366-child-contracts/**`, caché Node desactivada explícitamente y mismas protecciones de datos. El intento acotado `muwxavti-q-rpki` arrancó el primer comando real: `pnpm exec tsx -e 'import("./src/shared/db/seed.ts").then(() => console.log("IMPORT_OK"))'`. Guards activos en ROOT y pnpm; exit del hijo 125 y del runner 1, stdout vacío. Primer bloqueo concreto: `HARNESS_DENIED` en lectura sensible `.npmrc`; el archivo de credenciales no se leyó. No hubo denegación de ejecutable. El segundo contrato no se ejecutó; ninguno queda probado. No hubo retry, instalación, red, DB, lectura `.env` ni cambios de pruebas. El padre eliminó el namespace completo `.tmp/rentoru-f366-child-contracts/` y verificó su ausencia. Sin Docker ni pools activos. 36.6 permanece abierta; el siguiente paso requiere un entorno de ejecución que permita pnpm sin acceso a configuración sensible, no relajar las aserciones.

El fundador solicitó además incorporar en la entrega la regla de TODO visibles cortos y acotados: agregada en `AGENTS.md`, sección 5. La lista visible se redujo a títulos breves y una nota actual; la evidencia detallada permanece en este documento. Cambio documental, sin RED aplicable; `git diff --check -- AGENTS.md` pasa. Sin commit ni publicación en este avance.

## Comprobaciones solicitadas — configuración aislada, bloqueo identificado

El fundador pidió ejecutar las comprobaciones pendientes. Se intentaron los comandos originales con HOME/config/TMPDIR sintéticos bajo `.tmp/rentoru-f366-isolated-config/`, caché Node desactivada y configuración sensible expuesta como ausente sin leer archivos reales. El verificador corrigió defectos de sus artefactos temporales (wrapper ESM y preservación de `fs.realpath.native`), sin cambios de fuente o tests. Las correcciones pasaron `node --check` y el smoke de realpath nativo. Se validó el tsx instalado 4.23.12 y se permitió exclusivamente ese ejecutable con los argumentos originales.

Último intento del comando de importación: exit hijo 125, runner 1, stdout vacío. Guards activos en pnpm y tsx. El bloqueo concreto es un worker de `node_modules/.pnpm/esbuild@0.28.2/node_modules/esbuild/lib/main.js`, con execArgv vacío: el arnés no estableció bootstrap protegido de ese worker y no lo arrancó. No es un fallo del seed demostrado. El segundo comando no se ejecutó; no hay PASS de ninguno de esos dos contratos ni de la integración global. Se detuvo la cadena de intentos sin desactivar protecciones. No hubo credenciales/configuración real, `.env`, red, instalación o DB. El padre eliminó el namespace completo y verificó su ausencia; no quedan procesos/pools propios. La evidencia previa de 3274 unidades, 12 PG, tres mutaciones y revisión independiente permanece válida. El bloqueo corresponde al runner, no se modifican las pruebas para ocultarlo. La comprobación manual posterior aportó los resultados esperados de ambos contratos.

## Verificación manual aportada por el fundador

En la rama `fix/fase-36-catalogo-zonas`, Node 22.23.3, sin `DATABASE_URL` ni `NODE_OPTIONS`:

- `env -u DATABASE_URL -u NODE_OPTIONS pnpm exec tsx -e 'import("./src/shared/db/seed.ts").then(() => console.log("IMPORT_OK"))'`: stdout `IMPORT_OK`, exit 0. Cumple el contrato de importación sin conexión.
- `env -u DATABASE_URL -u NODE_OPTIONS pnpm exec tsx -e 'import("./src/shared/db/seed.ts").then((m) => m.seed())'`: error exacto `DATABASE_URL environment variable is not set.`, en `src/shared/db/client.ts:11`, exit 1. Cumple el contrato de rechazo; ese error es esperado, no un defecto.

Ambos contratos pendientes quedan verificados por evidencia manual del fundador, distinta de una corrida automatizada completa de integración. No se reclama ejecución adicional de tests ni aprobación nativa. Permanecen pendientes la conciliación de cierre y la disposición de entrega por presupuesto >400 líneas; sin commit, push ni PR nuevos.

## Entrega autorizada — primer corte preparado

El fundador eligió la cadena de ramas y autorizó commit, push y PR; el padre conserva su ejecución y revisión. Base real: tracker `feat/fase-36-catalogo-zonas`, commit `08d28de`, [PR #382](https://github.com/gianelo/rentoru/pull/382) borrador hacia `dev`. Primer PR desde `fix/fase-36-catalogo-zonas-01` contra el tracker; segundo PR contra el primero; destino final `dev`, nunca `main`, sin merge ni producción autorizados. No se incorporan cambios fuente del PR #381 ni requisitos de issue-first o etiquetas `type:*`.

Primer corte: parser/SQL, aislamiento, conteos y regresiones HTML/JSON con README; presupuesto esperado 337 líneas código/config/tests + 5 README = 342, separado de las 36 líneas del tracker. Se apartan únicamente siete líneas de import y el bloque final de 112 líneas (helper y prueba de actualización); quedan dos casos legacy y cinco de catálogo, sin debilitar aserciones, timeouts ni teardown. Taxonomía 7 + callers 4 = 11: comprobación independiente de este límite pendiente antes de commit/publicación. La separación no introduce comportamiento ni un RED nuevo; conserva la evidencia histórica RED/GREEN y de mutaciones.

Originales completos, byte-exact y SHA-256, preservados antes de editar en `.tmp/rentoru-f366-delivery/seed-taxonomy.original.bin` y `.tmp/rentoru-f366-delivery/fase-36-catalogo-zonas.original.bin`, con sus archivos `.sha256` de sólo lectura. El padre conserva el namespace hasta terminar ambos cortes. Segundo corte pendiente: restaurar íntegramente la prueba desde backup, conservar todo este historial y conciliar el cierre OpenSpec 36.6 sólo tras la evidencia y entrega observadas. Este historial y registro no se stagean en PR1; permanece el outline del tracker. C36.6.3/C36.6.4 y 36.6 seguían abiertas en ese corte histórico; los contratos manuales PASS no equivalen a full integración automatizada.

## Entrega final — implementación cerrada, CI y merge pendientes

Tracker #382 borrador (`08d28de`, base `feat/fase-36-catalogo-zonas`); primer corte publicado #383, commit `81057b2` (`fix: recupera alias territoriales y candidatos de zona`). Segundo corte publicado desde `test/fase-36-catalogo-zonas-02`: commit `807b9a1` (`test: protege actualización aditiva y cierra catálogo 36.6`), [PR #384](https://github.com/gianelo/rentoru/pull/384) contra `fix/fase-36-catalogo-zonas-01`. Presupuesto: primer corte 342 líneas; segundo 352 antes de este registro final, bajo 400. Sin cambios de otras fases ni incorporación del PR #381.

Restaurado íntegramente `tests/integration/seed-taxonomy.test.ts` desde `.tmp/rentoru-f366-delivery/seed-taxonomy.original.bin`: siete imports y bloque de 112 líneas, sin debilitar pruebas. SHA-256 del backup comprobado antes de restaurar: `622916e86b65b21f7325a7166e7a7b18ea0f86a42a58d649ee9f40aa76137cf7`. Tras restaurar y publicar ambos cortes, el padre eliminó el namespace de backups y verificó su ausencia. También eliminó Docker y namespace de la verificación del primer corte; F35/F36 intactos. Historial completo conservado.

La nueva verificación del primer corte se bloqueó antes de imports por metadata SSR `ENV_SET`: cero tests y dos errores no manejados, no fallo de producto demostrado. El fundador ordenó finalizar y detener comprobaciones adicionales y revisión nativa RDD para estos candidatos. No se ejecutan nuevos tests, formato, tipos ni lint. Se conserva exclusivamente la evidencia previa: 3274 unitarias, 12 PG, tres mutaciones RED/restauración GREEN y ambos contratos manuales PASS reales. Cierre indexado de implementación 36.6, no integración global GREEN, merge, despliegue ni inventario productivo; seed de producción requiere un trabajo separado.
