# F35.4 — publicación en español neutro

**Estado: inventario leído; coordinación y pruebas funcionales por resolver. Sin implementación.**

## Base y límites
- Rama `fix/fase-35-publicacion-neutra`, base dev `3f8dc5a9bb0018fb180ff831df542f821822178b`: merge humano #373, árbol idéntico al HEAD verificado `9403e46`; cierre documental de 35.3 en `bdb4b3dbb018a28ffa91efe6af511b1760d4a170` (22 líneas).
- Tuteo profesional en catálogos existentes; sin i18n global, rediseño, reglas, límites/códigos, URLs, datos de usuarios, interpolación/escape, formatos es-VE/UTC, acciones, Auth/DB/proveedores, dependencias, Field/CSS/tokens ni raíz/Nav/footer.
- Preservar significado de avisos propietario→corredor y contactos (gates F36, OpenSpec design 543/545). No corregir el destino histórico paso 2 de un error de fotos, el estado de publicación ni la afirmación de éxito sobre la ficha dentro de esta auditoría de estilo.
- F36 tiene escritor activo: lectura solamente en `navigation-entry-policy` y test, `NavigationEntryBoundary` y test, `app/publicar/layout.tsx`, `entrada-servida.test.tsx`, `publicar-entrada.spec.ts`, `publication-entry` fixtures/tests e include de `vitest.config.ts`, hasta cierre confirmado del coordinador.
- F36 confirmó que `step-copy.ts` y `PublishStep.tsx` alimentan heading/readiness del destino inicial: congelados durante su escritor/aceptación. Indicador/recuperación no consumen los otros catálogos; aun así, enviar paths exactos y obtener confirmación de no solapamiento antes de modificar copia. No integrar ramas ni heredar recibos.

## Inventario y pruebas existentes
- Exploración de lectura `musrmgef-25-9ho6`: nueve ramas implementadas, no prueba de ejecución en navegador de cada estado. Autoridades: SISTEMA 375, especificación Publicar 12/75/122/156, OpenSpec listing-publication y Open Questions 549.
- Pasos: `step-copy.ts:39–105` → StepPage/PublishStep; siete entradas con voseo y mapa accesible. `mapa-de-pasos.test.tsx` importa la constante esperada: añadir literales independientes. Zona y aviso directo en `PublishStep.tsx:355/363/508`.
- Revisión: `revisar/page.tsx:19/107/131/177`, pruebas de ruta `aviso-de-cambio.test.tsx`. Mercado: `price-histogram-step.ts:87–90`, consumidor real `precio-sin-javascript.test.tsx`.
- Negativas: `violation-copy.ts:81–228`, pruebas `negativa-de-campo.test.tsx` y `paso-servido.test.tsx`; importación compartida en `app/mis-avisos/[id]/editar/page.tsx:43–57`, proteger consumidor sin cerrar 35.5.
- Fotos: `PhotoUploader.tsx:200/201/478`, `photo-action-copy.ts:61`; SSR y happy-dom existentes. Diseñar selección rechazada antes de compresión/firma/subida y negativa de última foto sin I/O real.
- Ya neutrales: varias preguntas, acciones, cambios, expiración, menús/errores de compresión/subida, recuperación y éxito. Verificar/disponer, sin reescribir gratuitamente. «1 atributos» y «te faltan 1 caracteres» requieren disposición explícita: conservar conteos/interpolación y no introducir reglas de producto.
- F36 confirmó fixture de entrada autenticada GET/JSoff con lease sintético y preservación de tablas, NO recorrido de nueve pasos: publisher sin borradores. No convertirlo mediante escrituras ni reutilizar sesiones. `StepPage` redirige precio sin tipo/zona; la prueba existente de precio usa contexto/puertos doblados y renderiza ruta/componente reales: HTML SSR, no HTTP autenticado. SSR/happy-dom no acreditan Chromium ni compresión/red.

## Cortes y presupuesto
- A se divide: A0 propuesto sólo mercado escaso; A1 pasos/revisión diferidos hasta liberar owners F36. Propuesta A0 enviada para confirmar `price-histogram-step.ts`, su `.test.ts` y `app/publicar/paso/[paso]/precio-sin-javascript.test.tsx`; sólo «lo ponés vos» → «lo pones tú», sin cambiar 0/1/N, zona ni piso de doce. Forecast A original 220–310 ya no describe un único PR; recalcular cada subcorte. B negativas 190–285; C fotos 235–335: estimaciones, no permiso de sobrepasar presupuesto.
- Por PR: objetivo 350, absoluto 400 añadidas+eliminadas, con RED/tests/docs. Recalcular A incorporando este plan y las 22 líneas reales de cierre; separar otra unidad si fixtures/evidencia exceden el margen. No comprimir código ni quitar cobertura.
- RED textual en consumidores reales antes de cambiar copia; GREEN, mutante aislado por familia detectado por ese consumidor, restauración exacta y regresiones. Normalizar candidato antes de revisión nativa; consentimiento/previsión y ACK exactos, entrega independiente hacia dev, sin merge automático.

## Tareas
**En curso: 1. Un escritor de fuente por vez; ninguno autorizado todavía.**
1. [ ] **Inventario, coordinación y verificabilidad.** Confirmar reservas/modelos F36 y fixture funcional sin escrituras Auth/DB/subidas; resolver alcance de gramática y registrar disposiciones. Evidencia: scout anterior y respuesta actual del coordinador, sin suponer activación implementada.
2. [ ] **Corte A — consumidores RED/GREEN por subcorte.** A0 mercado: dos plantillas, expectativas completas 0/1/N en StepPage real y catálogo, mutantes independientes restaurados; sólo después de confirmar los tres paths. A1 pasos/mapa, copia directa y revisión/metadata/filas: diferidos por congelamiento F36. Preservar respuestas, enlaces y semántica; reevaluar cada presupuesto antes de GREEN. No marcar toda la tarea terminada al completar sólo A0.
3. [ ] **Corte A — verificación y entrega por subcorte.** Checks funcionales aplicables con límites explícitos, build/bundle según superficie, evaluación/revisión de cada candidato completo A0/A1, commit/PR dev/CI del HEAD final y merge humano. Candidato es unidad/PR, no casilla acumulada; no afirmar HTTP autenticado ni nueve recorridos por SSR.
4. [ ] **Corte B — negativas y consumidor compartido.** RED/GREEN del catálogo y rechazos reales, aviso de una sola dirección con significado intacto, regresión de editar; mutantes/checks/revisión/PR/CI/merge con presupuesto propio.
5. [ ] **Corte C — fotos.** Ayudas/capacidad/última foto mediante componente real y fixtures sin operaciones remotas; preservar singular/plural existentes, restricciones y menús. RED/GREEN/mutantes/checks/revisión/PR/CI/merge, sin atribuir SSR a compresión o subida.
6. [ ] **Cierre de 35.4.** Matriz de estados ya neutrales y corregidos, límites/follow-ups y archivos/pruebas nombradas en canónico/OpenSpec; commits y merges observados. No cerrar F35 ni las otras capacidades.
