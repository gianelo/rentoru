# 36.5 — Sugerencias de zona mientras escribes

## Objetivo confirmado

Hoy las sugerencias aparecen al escribir y pulsar Buscar. Añadir actualización dinámica mientras se escribe, sin exigir ese botón. Reutilizar exactamente la presentación y controles actuales de resultados: sólo cambia cuándo se actualizan, sin rediseño. Conservar el GET, Buscar y selección nativos sin JavaScript. No declarar implementado el comportamiento antes de probarlo.

Autoridad: comentario [5956207253](https://github.com/gianelo/rentoru/issues/289#issuecomment-5956207253), confirmado expresamente por el fundador en esta sesión; `tasks.md:2947` y criterios de `fase-36-cierre-publicacion.md:195–198`. 36.6 catálogo y 36.7 solicitud de zona faltante quedan fuera, igual que Nav/SearchPill y anchos de 36.4.

## Evidencia recuperada

Captura [390×844](https://github.com/user-attachments/assets/9503157a-1226-4a2a-ab2b-8b3ec62c49d8) abierta: wizard blanco, cabecera ← /2 de9/Guardado/× y progreso fino; «¿En qué zona queda?», campo vacío junto a Buscar; enlace «¿No está la tuya? Avisanos»; Referencia/«Frente a la plaza»/«Opcional. No se publica la dirección.»; Seguir oscuro y Atrás delineado. No muestra resultados porque la consulta está vacía: la ausencia de interacción viva proviene del reporte humano y la lectura del caller, no de esa imagen sola. Copy histórico no autoriza cambiarlo.

Explorador `mutkkmkk-24-qu7i`: la página compone directamente lookup y dominio; `PublishStep` tiene GET y radios dentro del POST, sin listener al teclear. Dominios ya normalizan y ordenan alias/nombres, deduplican, limitan ocho y derivan ciudad; guardar valida ID/par zona-ciudad. No usar sugerencias de discovery que excluirían zonas sin avisos. Tolerancia real a acentos SQL no acreditada; un test con ALTAMIRA no prueba diacríticos.

## Trabajo y evidencia

1. [ ] **Compartir búsqueda de publicación y transporte autenticado.** En curso: caso de uso reutiliza puerto/dominio; el GET servido y respuesta dinámica comparten decisiones. Pruebas RED/GREEN de HTML/ruta/caso de uso; sesión ausente, ID/ciudad existentes preservados. Commit y revisión pendientes.
2. [ ] **Activar sugerencias mientras se escribe.** Isla progresiva sobre caller real; sin reglas de negocio en componentes. Selección dentro del POST, zona guardada y referencia conservadas, teclado, vacío/error y respuestas tardías. Prueba del HTML/caller y browser JS/noJS; commit/revisión pendientes.
3. [ ] **Aceptar comportamiento integrado.** Verificación independiente, tipos/lint/tokens/bundle y funcional pertinente; claridad sobre persistencia real versus dobles. PR(s) a dev ≤400 líneas cada uno, CI y merge humano. Pendiente.

No checkbox se cierra sin checks observados y commit de unidad; Todo visible permanece breve. Estimación exploratoria: dos cortes servidor (~180–280) e interacción/tests (~300–390), no promesa. Recalcular contando pruebas/documentación/extracciones/borrados, dividir sin omitir pruebas ni comprimir código. Cada unidad se revisa por su diff, nunca toda la rama acumulada.

## Entorno y límites

Rama `feat/fase-36-sugerencias-zona`, base dev `e6c5b6a26a629f325da9347f0a64d83deadac0bb`, worktree `rentoru-fase36-publicacion`. Trees base/HEAD anterior idénticos al crear rama; documentos locales de cierre 36.3/36.4 preservados, fuera de staging/candidato nuevo. Padre mantiene commits, review y entrega; un escritor activo.

Primero unitarios/HTML con env limpio y dobles explícitos de sesión/contexto/vocabulario: no DB real, POST de red, providers, credenciales, semillas/migraciones ni instalaciones. No ejecutar runners por defecto ni servicios en esta primera unidad. Browser futuro sólo con fixture aislada y puerto propio libre; F35 y demo/túnel protegidos. Persistencia durable/auth POST necesitará definir y autorizar entorno desechable; mocks no prueban SQL ni transporte durable.

Preservar build `.next` conocido Qj y evidencia previa; futuras cachés generadas se archivan en namespace privado ya excluido por TS, sin cambiar compilador/borrar archivos. No editar catálogo, schema, Nav/tokens ni nuevas reglas de coincidencia; adaptador sólo ante regresión causal demostrada y alcance conciliado.

Unidad servidor implementada (`mutla61h-25-bui9`): caso de uso compartido por GET nativo y GET JSON autenticado, sin cambios de presentación/reglas. 35 pruebas, tipos y Biome PASS. RED inicial por módulos ausentes, no fallos de aserción atribuidos; HTML caracterizado antes de extracción. Cinco mutaciones causales detectadas/restauradas. Registro `test-results/f365-server-restored-a-validation.md`; 242 líneas fuente/tests/documento antes de esta actualización. SQL/acentos/persistencia durable no acreditados; warning React method/encType preexistente. Independiente `mutlsn4k-26-5an8`:35/35, tipos/Biome/diff PASS; fingerprints fuentes/index preservados. Commit y revisión pendientes; sugerencias dinámicas todavía no activadas. 36.1–36.4 cerradas; tareas 36.6–36.24 pendientes.
