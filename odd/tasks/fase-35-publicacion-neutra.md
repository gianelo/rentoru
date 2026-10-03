# F35.4 — publicación en español neutro

**Estado: inventario leído; coordinación y pruebas funcionales por resolver. Sin implementación.**

## Base y límites
- Rama `fix/fase-35-publicacion-neutra`, base dev `3f8dc5a9bb0018fb180ff831df542f821822178b`: merge humano #373, árbol idéntico al HEAD verificado `9403e46`; cierre documental de 35.3 en `bdb4b3dbb018a28ffa91efe6af511b1760d4a170` (22 líneas).
- Tuteo profesional en catálogos existentes; sin i18n global, rediseño, reglas, límites/códigos, URLs, datos de usuarios, interpolación/escape, formatos es-VE/UTC, acciones, Auth/DB/proveedores, dependencias, Field/CSS/tokens ni raíz/Nav/footer.
- Preservar significado de avisos propietario→corredor y contactos (gates F36, OpenSpec design 543/545). No corregir el destino histórico paso 2 de un error de fotos, el estado de publicación ni la afirmación de éxito sobre la ficha dentro de esta auditoría de estilo.
- F36 tiene escritor activo: lectura solamente en `navigation-entry-policy` y test, `NavigationEntryBoundary` y test, `app/publicar/layout.tsx`, `entrada-servida.test.tsx`, `publicar-entrada.spec.ts`, `publication-entry` fixtures/tests e include de `vitest.config.ts`, hasta cierre confirmado del coordinador.
- También pendiente confirmar dependencias entre copia y modelos del indicador/recuperación. No iniciar modificaciones de copia hasta aclararlo; no integrar ramas ni heredar recibos de F36.

## Inventario y pruebas existentes
- Exploración de lectura `musrmgef-25-9ho6`: nueve ramas implementadas, no prueba de ejecución en navegador de cada estado. Autoridades: SISTEMA 375, especificación Publicar 12/75/122/156, OpenSpec listing-publication y Open Questions 549.
- Pasos: `step-copy.ts:39–105` → StepPage/PublishStep; siete entradas con voseo y mapa accesible. `mapa-de-pasos.test.tsx` importa la constante esperada: añadir literales independientes. Zona y aviso directo en `PublishStep.tsx:355/363/508`.
- Revisión: `revisar/page.tsx:19/107/131/177`, pruebas de ruta `aviso-de-cambio.test.tsx`. Mercado: `price-histogram-step.ts:87–90`, consumidor real `precio-sin-javascript.test.tsx`.
- Negativas: `violation-copy.ts:81–228`, pruebas `negativa-de-campo.test.tsx` y `paso-servido.test.tsx`; importación compartida en `app/mis-avisos/[id]/editar/page.tsx:43–57`, proteger consumidor sin cerrar 35.5.
- Fotos: `PhotoUploader.tsx:200/201/478`, `photo-action-copy.ts:61`; SSR y happy-dom existentes. Diseñar selección rechazada antes de compresión/firma/subida y negativa de última foto sin I/O real.
- Ya neutrales: varias preguntas, acciones, cambios, expiración, menús/errores de compresión/subida, recuperación y éxito. Verificar/disponer, sin reescribir gratuitamente. «1 atributos» y «te faltan 1 caracteres» requieren disposición explícita: conservar conteos/interpolación y no introducir reglas de producto.
- Brecha: no se encontró fixture Chromium autenticado para nueve pasos; `publish-access.spec.ts` sólo negativa anónima. Consultar alcance del fixture F36 antes de planificar recorridos; SSR/happy-dom no acreditan HTTP/Chromium ni compresión/red.

## Cortes y presupuesto
- A: pasos/revisión/mercado, forecast explorador 220–310 líneas, incluidos 24 de cierre previo. B: negativas/consumidor compartido, 190–285. C: fotos, 235–335. Estimaciones, no autorización para sobrepasar presupuesto.
- Por PR: objetivo 350, absoluto 400 añadidas+eliminadas, con RED/tests/docs. Recalcular A incorporando este plan y las 22 líneas reales de cierre; separar otra unidad si fixtures/evidencia exceden el margen. No comprimir código ni quitar cobertura.
- RED textual en consumidores reales antes de cambiar copia; GREEN, mutante aislado por familia detectado por ese consumidor, restauración exacta y regresiones. Normalizar candidato antes de revisión nativa; consentimiento/previsión y ACK exactos, entrega independiente hacia dev, sin merge automático.

## Tareas
**En curso: 1. Un escritor de fuente por vez; ninguno autorizado todavía.**
1. [ ] **Inventario, coordinación y verificabilidad.** Confirmar reservas/modelos F36 y fixture funcional sin escrituras Auth/DB/subidas; resolver alcance de gramática y registrar disposiciones. Evidencia: scout anterior y respuesta actual del coordinador, sin suponer activación implementada.
2. [ ] **Corte A — consumidores RED/GREEN.** Pasos/mapa con expectativas independientes, copia directa, revisión/metadata/filas y mercado escaso; preservar respuestas, enlaces y semántica. Pruebas reales de StepPage/ReviewPage y mercado, mutantes restaurados; reevaluar presupuesto antes de GREEN.
3. [ ] **Corte A — verificación y entrega.** Checks funcionales aplicables con límites explícitos, build/bundle según superficie, evaluación/revisión del candidato exacto, commit/PR dev/CI del HEAD final y merge humano; no afirmar nueve recorridos por un SSR.
4. [ ] **Corte B — negativas y consumidor compartido.** RED/GREEN del catálogo y rechazos reales, aviso de una sola dirección con significado intacto, regresión de editar; mutantes/checks/revisión/PR/CI/merge con presupuesto propio.
5. [ ] **Corte C — fotos.** Ayudas/capacidad/última foto mediante componente real y fixtures sin operaciones remotas; preservar singular/plural existentes, restricciones y menús. RED/GREEN/mutantes/checks/revisión/PR/CI/merge, sin atribuir SSR a compresión o subida.
6. [ ] **Cierre de 35.4.** Matriz de estados ya neutrales y corregidos, límites/follow-ups y archivos/pruebas nombradas en canónico/OpenSpec; commits y merges observados. No cerrar F35 ni las otras capacidades.
