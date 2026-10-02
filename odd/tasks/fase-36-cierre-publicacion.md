# Fase 36 — Cierre de publicación (#289)

Plan completo de [#289 — Prueba manual 4/6: Publicar](https://github.com/gianelo/rentoru/issues/289), listo para continuar desde la laptop. **Esta entrega sólo documenta**: no implementa funcionalidades, modifica producción ni cierra el issue. Las 22 tareas de producto siguen pendientes; escribir el plan no acredita aceptación funcional.

## Entrega de planificación

Rama: `docs/fase-36-cierre-publicacion`, creada desde `origin/dev` sincronizado. Destino futuro: PR a `dev`, referencia no cerrante `Refs #289`. Presupuesto: menos de 400 líneas totales de documentación; las futuras unidades también deben presupuestar implementación **y pruebas**.

- [x] P36.1 — Redactar inventario completo y tareas de fase, con dependencias, criterios de aceptación, decisiones pendientes y enlaces de evidencia. Evidencia documental: este archivo, tabla de 21 comentarios y tareas 36.1–36.22; índice central en `openspec/changes/mvp-rental-listings/tasks.md`. Ruta: delegado; sin prueba de comportamiento aplicable.
- [x] P36.2 — Verificar cobertura y coherencia. Evidencia: verificador independiente cotejó los 21 comentarios en GitHub, IDs 36.1–36.22 coincidentes, tres rutas documentales y 268 líneas añadidas; `git diff --check` sin diagnósticos y chequeo del archivo nuevo sin errores. El coordinador confirmó que la variación observada era su actualización de seguimiento, no cambio del plan. Sin RED/GREEN por documentación; evaluación nativa inicial no disponible por archivo untracked, sin afirmar aprobación nativa.
- [ ] P36.3 — Crear commit convencional en español, push de la rama y PR a `dev`. Estado: en curso. Ruta: coordinador; operaciones Git/GitHub autorizadas por el usuario. No merge.

## Cómo leer y ejecutar

1. Empezar por 36.1: reproducir en la base vigente y registrar qué sigue ocurriendo.
2. Resolver el gate de cada unidad **al comenzar esa tarea**, no inferir autorización desde una captura o este plan.
3. Implementar sólo con alcance posterior autorizado; cerrar cada casilla con archivo, prueba nombrada y resultado observado.

**Estado de evidencia.** Los comentarios son reportes históricos del fundador, no reproducciones actuales. Los checks ya marcados del cuerpo del issue son pruebas de baseline completadas, no tareas nuevas pendientes. El checklist transversal sin marcar significa **no probado**, no demuestra fallo. Aquí no se han ejecutado pruebas funcionales.

**Fronteras.** No rehacer fases 18, 34 o 35. F33 trata ratificación legal; F34 (`odd/tasks/fase-34-auditoria-transversal.md`) conserva la auditoría global; F35 está reservada por PR #362 y requiere coordinación de copy. F36 acepta sólo publicación y sus costuras explícitas, sin ampliar geografía ni reescribir ahora specs multicanal históricos.

**Contrato futuro de prueba.** Para cambios de comportamiento: RED observado → GREEN mínimo → mutación que haga fallar la prueba propia y restauración → negativos relevantes. Cada regla nueva vive en dominio/aplicación y tiene prueba del HTML servido, no sólo del llamado. Para caracterización de comportamiento existente, registrar el pase inicial sin inventar RED. Tokens, teclado, foco y blancos ≥44 px son obligatorios; mejora progresiva mantiene búsqueda/formularios nativos sin JS. Fotos conserva su excepción documentada por compresión local.

## Evidencia local y antecedentes

Lectura de código en la base de planificación; no equivale a comprobar el navegador desplegado:

| Superficie | Confirmado por lectura | Lo que aún requiere observación |
|---|---|---|
| `app/publicar/PublishStep.tsx` | Shell propio; zona con resultados/radios y escape `mailto`; título/preview y descripción calculados desde borrador guardado; atributos por casillas; contacto ofrece WhatsApp, Llamada y Correo. | Transición con sólo pie, ancho real, sugerencias al teclear, interacción y validación efectiva. |
| `app/publicar/fotos/PhotoUploader.tsx` | Compresión, previews mediante `URL.createObjectURL`, estados y subida con progreso; existe menú de acciones. | Miniaturas al volver, duración de URL/objeto y tamaño visual medido. |
| `app/publicar/revisar/page.tsx` | Filas con `Cambiar` a `?volver=revisar`; warning afirma que dueño/inmobiliaria no se puede corregir. | Composición móvil/tablet/escritorio y publicación final. |
| `src/modules/listing-publication/domain/listing-edit.ts` | `editablePublisherTypes`: dueño permite dueño/inmobiliaria; inmobiliaria no ofrece cambio. | Recorrido servido de edición y cualquier propuesta de reversibilidad. |

Antecedentes que se deben **conservar y contrastar**, no volver a construir por una casilla: 18.7 (referencia), 18.8 (revisar y conservar pasos), 18.15 (acciones de fotos), 18.17 (mapa móvil), 18.18 (descartar sin POST), 18.21 (editar fotos), 18.38 (dueño → inmobiliaria). 18.39 sigue sin tilde aunque su mitad de atomicidad tiene evidencia completada; 18.40 mantiene pendiente el reintento tras promoción fallida. No atribuirles automáticamente el digest de #289.

**Medidas vigentes:** 390×844, 768×1024, 1440×900; 440×956 como composición móvil adicional. `<768`: móvil; 768–1099: tablet fluida; ≥1100: contenedor centrado de 1100. Autoridad: `design.md` D30 y `design/README.md`. El 390×840 de `tests/measure/canonical-viewports.spec.ts` es una discrepancia que debe conciliarse con F34, no un segundo encargo de auditoría global. No reetiquetar evidencia antigua.

## Trazabilidad de los 21 comentarios

El número conserva el orden cronológico. «Destino» asigna trabajo o supersesión explícita, **no confirma un defecto actual**.

| N.º / evidencia | Observación o solicitud reportada | Destino |
|---|---|---|
| [1](https://github.com/gianelo/rentoru/issues/289#issuecomment-5955921839) | Logo no clicable en encabezado; quiere ir al inicio en todos los dispositivos. | 36.2 |
| [2](https://github.com/gianelo/rentoru/issues/289#issuecomment-5955988903) | Al entrar aparece brevemente sólo el pie; investigar loader global/contextual. | 36.3; no hay spinner elegido. |
| [3](https://github.com/gianelo/rentoru/issues/289#issuecomment-5956065320) | Pastilla más angosta en tablet/escritorio; pide coherencia. | 36.4; reconciliar sistema, no copiar ancho móvil. |
| [4](https://github.com/gianelo/rentoru/issues/289#issuecomment-5956207253) | Zona sin sugerencias vivas y faltan zonas conocidas de Maracaibo. | 36.5 y 36.6; todas las ciudades soportadas, sin expansión. |
| [5](https://github.com/gianelo/rentoru/issues/289#issuecomment-5956226566) | `Avisanos` abre correo; pide formulario interno para explicar zona faltante. | 36.7 |
| [6](https://github.com/gianelo/rentoru/issues/289#issuecomment-5956294915) | Contador 0/90 y preview del título no cambian al escribir. | 36.8 |
| [7](https://github.com/gianelo/rentoru/issues/289#issuecomment-5956346920) | Guía de caracteres faltantes y contador de descripción no son vivos. | 36.9 |
| [8](https://github.com/gianelo/rentoru/issues/289#issuecomment-5956457541) | `Elegir del teléfono` no sirve para todos los dispositivos; pide tres propuestas. | 36.10; elección al iniciar. |
| [9](https://github.com/gianelo/rentoru/issues/289#issuecomment-5956519719) | Quitar ayuda de no borrar del teléfono; aclarar dónde aparece portada. | 36.10; tres alternativas de portada para aprobar. |
| [10](https://github.com/gianelo/rentoru/issues/289#issuecomment-5956554011) | Menú `⋯` demasiado grande en tablet/escritorio. | 36.11; preservar target ≥44 px. |
| [11](https://github.com/gianelo/rentoru/issues/289#issuecomment-5956583646) | `Quién publica` repetido como título/label. | 36.12; decisión conjunta de jerarquía. |
| [12](https://github.com/gianelo/rentoru/issues/289#issuecomment-5956627130) | Labels de llamada/correo, validación y elección de país. | Canales superados por #13; número/país en 36.13–36.14. |
| [13](https://github.com/gianelo/rentoru/issues/289#issuecomment-5956647895) | Decisión posterior: sólo WhatsApp y número, sin verificar cuenta todavía. | 36.13–36.14; autenticación por correo intacta. |
| [14](https://github.com/gianelo/rentoru/issues/289#issuecomment-5956742439) | Miniaturas subidas desaparecen al volver al paso. | 36.15; causa no determinada. |
| [15](https://github.com/gianelo/rentoru/issues/289#issuecomment-5956790430) | Móvil: `Cambiar` junto al encabezado para liberar el cuerpo. | 36.16–36.17 |
| [16](https://github.com/gianelo/rentoru/issues/289#issuecomment-5956819730) | Revisar roto en tablet; pide lámina aprobada antes de implementar. | 36.16–36.17; `Cambiar` puede seguir a la derecha. |
| [17](https://github.com/gianelo/rentoru/issues/289#issuecomment-5956834650) | Revisar estrecho en escritorio; pide lámina aprobada. | 36.16–36.17 |
| [18](https://github.com/gianelo/rentoru/issues/289#issuecomment-5956854170) | Cuestiona warning inmutable; cree que dueño/corredor es editable. | 36.18; gate separado para inmobiliaria → dueño. |
| [19](https://github.com/gianelo/rentoru/issues/289#issuecomment-5956901768) | Fallo al publicar, digest `901444967`; posible reutilización de fotos ocultas. | 36.19–36.20; dedup y sesión automatizada son hipótesis. |
| [20](https://github.com/gianelo/rentoru/issues/289#issuecomment-5956987522) | `No tiene ninguna` desigual frente a Seguir/Atrás; botón vs checkbox. | 36.21; elección al iniciar. |
| [21](https://github.com/gianelo/rentoru/issues/289#issuecomment-5957005019) | Ignorar tamaños de screenshots: política ya modificada. | Supersesión dimensional; 36.1/36.16/36.22 usan política vigente y coordinan F34. |

## Gates: decisiones antes de escribir código

| Gate | Resolver al comenzar | No autoriza por sí solo |
|---|---|---|
| G1 — Transición | 36.3: reproducir alcance de carga y proponer solución contextual; aprobar patrón derivado del sistema. | Loader global ni spinner inventado. |
| G2 — Anchos/boards | 36.4: política de pastilla; 36.16: lámina de revisar móvil/tablet/escritorio aprobada. | Estirar todos los campos o copiar medidas de capturas. |
| G3 — Copy/jerarquía | 36.10: tres propuestas por texto; 36.12: título/legend; coordinar F35. | Rediseñar todo el copy ni eliminar labels accesibles. |
| G4 — Contacto | 36.13: decidir legado, edición, importación, defaults y necesidad de migración; 36.14: país/formato aceptado. | Convertir contactos históricos silenciosamente ni verificar cuenta WhatsApp. |
| G5 — Tipo de publicador | 36.18: conservar dueño → inmobiliaria; preguntar si mantener o cambiar el bloqueo inverso. | Suprimir regla antiengaño por una duda del issue. |
| G6 — Producción | 36.19: autorización separada de acceso/credenciales y consultas read-only acotadas, con datos redactados. | Mutación, siembra, reintento real o descarga de secretos/datos personales. |
| G7 — Atributos | 36.21: aprobar botón o checkbox con explicación de semántica y jerarquía. | Confundir vacío declarado con paso no contestado. |

Si un gate queda sin resolver, registrar opciones, responsable y dependencia bloqueada; las unidades independientes pueden avanzar. Una decisión nueva se documenta con razón y fuente, no como comportamiento ya construido.

## Unidades de trabajo y criterios de cierre

Cada ID coincide con el índice central. «Comprobar» exige evidencia futura; no se ejecuta en esta entrega documental. Si la reproducción muestra comportamiento correcto, cerrar por caracterización nombrada o supersesión justificada, no fabricar una corrección.

### A — Baseline y shell

- [ ] **36.1 — Reproducir los nueve pasos y fijar baseline.** Sin dependencia.
  - Trabajo: recorrer entrada, respuestas, guardado, Atrás, mapa, descarte, revisar y publicación en entorno de prueba autorizado; cruzar los checks completados del issue y fases previas.
  - Aceptar: matriz comentario → reproducción/resultado/entorno, separando confirmado, no reproducido y no probado; reconciliación dimensional con F34 asignada.
  - Comprobar: cuatro medidas vigentes, navegación nativa sin JS salvo fotos; no repetir baseline ya protegido sin hallazgo.

- [ ] **36.2 — Logo como enlace de inicio.** Después de 36.1.
  - Trabajo: inventariar encabezados propios de pasos, fotos y revisar; conservar salida y estado de borrador.
  - Aceptar: marca enlaza a `/`, nombre accesible y foco visibles en cada shell afectado.
  - Comprobar: HTML servido con `href` real, teclado y navegación sin JS en las tres clases de dispositivo; regresar no borra el borrador.

- [ ] **36.3 — Investigar y corregir transición de entrada.** Después de 36.1; gate G1.
  - Trabajo: distinguir navegación cliente, GET directo, sesión/datos y boundaries de carga; capturar secuencia que muestra sólo pie y alcance actual del loader.
  - Aceptar: diagnóstico con causa/alcance y patrón aprobado; feedback contextual que no deje una pantalla engañosa ni invada rutas ajenas.
  - Comprobar: transición rápida/lenta y error controlado en prueba; GET directo y navegación sin JS conservan contenido útil. Si no se reproduce, registrar límite.

- [ ] **36.4 — Reconciliar ancho de pastilla con el sistema.** Después de 36.1; gate G2.
  - Trabajo: medir contenedor y pastilla por breakpoint; acordar qué significa coherencia sin imponer ancho fijo móvil en desktop.
  - Aceptar: regla aprobada en sistema, aplicada sólo a superficies autorizadas, sin desbordes ni campos estirados de oficio.
  - Comprobar: geometría a 390/440/768/1440, márgenes y contenedor ≥1100; búsqueda nativa y targets intactos.

### B — Zona y escape

- [ ] **36.5 — Sugerencias de zona como mejora progresiva.** Después de 36.1.
  - Trabajo: reutilizar vocabulario/puertos de zona, no resultados de avisos activos como catálogo; mantener selección válida y ciudad aislada.
  - Aceptar: sugerencias al teclear, teclado/selección accesibles, estados vacío/error y zona guardada preservada; servidor valida ID y ciudad.
  - Comprobar: selección real y persistencia en HTML servido, consulta con/sin JS, nombres largos, acentos y respuesta tardía que no reemplace búsqueda nueva.

- [ ] **36.6 — Conciliar catálogo de zonas soportadas.** Después de 36.1; alimenta fixtures de 36.5.
  - Trabajo: comparar fuentes territoriales, seed, búsqueda y registros en entorno autorizado para todas las ciudades ya soportadas; identificar Maracaibo faltante vs alias/consulta.
  - Aceptar: lista de faltantes comprobados y fuente, propuesta curada aprobada; sin ciudades nuevas ni geografía ampliada por este issue.
  - Comprobar: IDs/slugs sin colisiones, aislamiento ciudad-zona y búsqueda por nombre; migración/seed sólo si diagnóstico lo exige y con autorización posterior.

- [ ] **36.7 — Aviso interno de zona faltante.** Después de 36.1.
  - Trabajo: evaluar reutilizar `/ayuda/escribinos`; acordar campos/contexto ciudad-zona, destino y feedback; no crear una segunda plataforma de reportes.
  - Aceptar: `Avisanos` abre formulario interno con explicación, envío validado en aplicación, acuse y negativa seguros; no depende de cliente de correo.
  - Comprobar: enlace/formulario nativos, entrada válida/vacía, error de entrega y regreso al borrador; confirmar transporte real en entorno autorizado, no sólo spy.

### C — Texto vivo, copy y controles

- [ ] **36.8 — Contador y preview vivos del título.** Después de 36.1.
  - Trabajo: añadir mejora cliente reutilizando medición/límites de dominio; servidor conserva autoridad y guardado.
  - Aceptar: contador y preview reflejan texto actual al escribir/pegar/borrar, sin alterar precio/zona ni aceptar un título inválido.
  - Comprobar: límites y Unicode conforme a medición compartida; con JS reacción inmediata, sin JS guardar/revisar muestra lo guardado y errores del servidor.

- [ ] **36.9 — Guía viva de descripción.** Después de 36.1; reutiliza patrón de 36.8.
  - Trabajo: sincronizar faltantes, contador y progreso con texto actual; evitar regla duplicada en UI.
  - Aceptar: debajo del mínimo indica faltantes exactos; al alcanzar/superar cambia a suficiencia sin número negativo.
  - Comprobar: vacío, borde mínimo, pegado/borrado y recarga; HTML servido y rechazo servidor sin JS siguen funcionando.

- [ ] **36.10 — Elegir copy neutral de fotos y portada.** Después de 36.1; gate G3/F35.
  - Trabajo: al comenzar presentar tres propuestas de chooser: «Elegir fotos», «Seleccionar fotos», «Agregar fotos»; tres de portada: «Es la primera foto de tu aviso», «Aparece en los resultados y al abrir tu aviso», «Es la foto principal de tu aviso». Son candidatas, no copy aprobado.
  - Aceptar: registrar selección del fundador, retirar ayuda innecesaria de no borrar del teléfono y explicar portada sin ambigüedad; supersesión acotada de literal histórico de 18.15.
  - Comprobar: texto elegido servido en móvil/tablet/desktop; quitar del aviso mantiene su semántica y no promete borrar archivos del dispositivo.

- [ ] **36.11 — Reducir huella visual del menú de fotos.** Después de 36.1.
  - Trabajo: distinguir glyph/superficie visible de área interactiva; ajustar con tokens, no nuevos iconos.
  - Aceptar: tamaño visual compacto aprobado en tablet/desktop, blanco accesible ≥44×44 y menú legible.
  - Comprobar: medidas, teclado/foco y abrir/cerrar; mover, portada y quitar siguen disponibles conforme a 18.15, sin regresión móvil.

- [ ] **36.12 — Resolver jerarquía de Quién publica.** Después de 36.1; gate G3/F35.
  - Trabajo: decidir conjuntamente conservar título con legend accesible no repetido visualmente, o título general con legend específico visible; registrar alternativa elegida.
  - Aceptar: pregunta visible una sola vez en la jerarquía aprobada, controles etiquetados, sin selección de dueño por defecto.
  - Comprobar: headings/fieldset/legend en HTML servido, lector/teclado y elección requerida por servidor; warning sigue coherente con 36.18.

### D — Contacto: decisión y aplicación separadas

- [ ] **36.13 — Resolver compatibilidad de WhatsApp único.** Después de 36.1; gate G4.
  - Trabajo: inventariar contacto nuevo, borrador, legado, editar, importación, defaults y revelación; specs multicanal quedan como antecedente superado para nueva publicación.
  - Aceptar: tabla de tratamiento aprobada por superficie, necesidad/no necesidad de migración y secuencia de rollout; no perder correo/teléfono histórico por conversión silenciosa.
  - Comprobar: revisión de lectores/escritores y fixtures legacy; autenticación Google/correo no cambia; no verificación de existencia de cuenta WhatsApp en esta fase.

- [ ] **36.14 — Publicar con WhatsApp y número validado.** Después de 36.13 aprobado; gate país/formato G4.
  - Trabajo: quitar elección de canal del alta nueva, hacer explícito WhatsApp sin inventar default en UI; acordar selector de país/prefijo y normalización aceptada en dominio.
  - Aceptar: número válido persistido como WhatsApp por servidor; errores locales claros, revisar y revelación coherentes; aplicar política aprobada de edición/import/defaults por unidades acotadas si hace falta.
  - Comprobar: HTML servido y POST nativo, vacío/formato inválido/prefijos admitidos, petición manual de otro canal rechazada conforme a 36.13; integración de persistencia y autenticación sin cambios.

### E — Fotos y revisar

- [ ] **36.15 — Miniaturas persistentes al volver.** Después de 36.1.
  - Trabajo: reproducir elegir/subir/Seguir/Atrás y regreso desde revisar/recarga; contrastar borrador persistido, URL blob/presignada, expiración y objeto almacenado, sin presuponer causa.
  - Aceptar: fotos conservadas visibles en el mismo orden/portada o explicación recuperable si caducaron; no ocultar fallo con imagen ficticia.
  - Comprobar: ida/vuelta y recarga en navegador, payload persistido y URL resoluble en storage de prueba; borrador expirado y upload fallido; coordinar 18.39/18.40, no declararlas cerradas por esto.

- [ ] **36.16 — Aprobar composición de revisar.** Después de 36.1; gate G2.
  - Trabajo: preparar lámina derivada del sistema para móvil, tablet y desktop; móvil sitúa `Cambiar` junto al título de sección, tablet puede mantenerlo a la derecha.
  - Aceptar: aprobación explícita con ruta/versionado de lámina, texto largo, fotos/contacto y warning; no hay autorización de dibujar boards en esta entrega documental.
  - Comprobar: política 390×844/768×1024/1440×900 más 440×956, contenedor centrado y uso de tokens; coordinar F34 sin absorber auditoría global.

- [ ] **36.17 — Implementar revisar según lámina aprobada.** Después de 36.16.
  - Trabajo: adaptar composición, no reescribir reglas de navegación/guardado existentes; conservar vínculos a cada paso y contexto de regreso.
  - Aceptar: cuerpo legible sin columnas apretadas/solapes; `Cambiar` en posición aprobada y mensaje de cambio visible.
  - Comprobar: geometría real de cuatro medidas, descripción/zona largas; HTML y navegación sin JS, guardar vuelve a revisar conservando pasos posteriores y descartar no escribe (18.8/18.18).

- [ ] **36.18 — Warning veraz y gate de cambio inverso.** Después de 36.1; G5; coordinar 36.12/36.17/F35.
  - Trabajo: contrastar warning de revisar con regla 18.38; corregir afirmación de inmutabilidad absoluta, sin retirar prohibición inmobiliaria → dueño.
  - Aceptar: copy explica dueño → inmobiliaria y su irreversibilidad; respuesta explícita del fundador sobre sentido inverso. Si lo abre, documentar nueva razón y unidad adicional antes de modificar dominio.
  - Comprobar: HTML servido de pasos/revisar/editar coherente; casos de conservar valor, ascenso permitido y reversión rechazada; las casillas históricas de 18.38 no se desmarcan.

### F — Fallo final y atributos

- [ ] **36.19 — Diagnosticar digest 901444967 sin mutar producción.** Después de 36.1; G6 para cualquier lectura productiva.
  - Trabajo: correlacionar fecha/build/digest y logs redactados si se autoriza; distinguir dedup, propiedad/reutilización de fotos ocultas, storage, persistencia y sesión automatizada.
  - Aceptar: informe con causa sustentada o hipótesis aún abiertas y límites de acceso; reproducción mínima con datos propios en prueba cuando sea posible.
  - Comprobar: mismo publicador/otro publicador y fotos nuevas/reutilizadas; no concluir dedup por screenshot. Sin autorización de producción, continuar local y dejar explícito lo no consultado.

- [ ] **36.20 — Corregir causa confirmada y proteger reintento.** Después de 36.19 con causa y alcance aprobados.
  - Trabajo: construir regresión focal antes del cambio; si coincide con 18.40, enlazar una sola unidad y preservar atomicidad ya probada de 18.39.
  - Aceptar: publicación válida alcanza estado activo una sola vez; fallo explica acción recuperable y no anuncia fracaso tras guardar con éxito; no debilita exclusión entre publicadores.
  - Comprobar: falla antes/después de persistir, reintento y original/derivadas en entorno aislado; aviso y fotos en HTML servido, hash/dedup del mismo/otro publicador. No aplicar limpieza/migración productiva por este plan.

- [ ] **36.21 — Elegir control de No tiene ninguna.** Después de 36.1; gate G7.
  - Trabajo: presentar botón secundario vs checkbox explícito, jerarquía con Seguir/Atrás y exclusión respecto de atributos seleccionados; elegir al iniciar, no ahora.
  - Aceptar: elección aprobada conserva `featuresDeclared`: declarar ninguna es respuesta, casillas vacías sin declaración siguen sin contestar; no anidar formularios.
  - Comprobar: servidor y HTML servido para ninguna, alguna, sin responder y alternancia; POST sin JS, regreso/revisar «Ninguno», blancos accesibles y geometría equilibrada.

- [ ] **36.22 — Aceptación integrada de fase, no cierre automático.** Después de todas las unidades aplicables y gates resueltos.
  - Trabajo: repetir recorrido nueve pasos con correcciones integradas, actualizar matriz de 21 comentarios y checks transversales realmente observados.
  - Aceptar: fundador valida preview en medidas vigentes, sin gaps ocultos; cada cierre cita archivo/prueba/entorno; #289 sólo se cierra por decisión posterior, no por CI verde.
  - Comprobar: unitarios/integración enfocados, HTML servido, navegador JS/sin JS según superficie, tokens/tipos/lint y gates de build/bundle cuando corresponda; autorizar comandos exactos antes de ejecutarlos.

## Orden de entrega y continuación desde laptop

| Orden | Unidades pequeñas | Dependencia/salida |
|---|---|---|
| 1 | 36.1 | Baseline y discrepancia de viewport coordinada con F34. |
| 2 | 36.2–36.4, cada una independiente | Gates de loader y ancho; no un PR de «shell completo». |
| 3 | 36.6; luego 36.5; 36.7 aparte | Catálogo curado alimenta sugerencias; escape no bloquea catalogación. |
| 4 | 36.8 → 36.9; 36.10/36.11/36.12 aparte | Patrón vivo compartido; copy coordinado con F35. |
| 5 | 36.13 → 36.14 | Compatibilidad aprobada antes de retirar canales. |
| 6 | 36.15; 36.16 → 36.17; 36.18 aparte | Diagnóstico de fotos y aprobación de revisar, no arreglo a ciegas. |
| 7 | 36.19 → 36.20; 36.21 aparte | Causa confirmada y elección del control; diagnóstico puede adelantarse tras 36.1. |
| 8 | 36.22 | Aceptación agregada, sin sustituir evidencia propia de cada unidad. |

Cada fila es **orden**, no obligación de agrupar todos sus IDs en un PR. Planificar cada unidad bajo 400 líneas revisables incluyendo pruebas/docs; dividir 36.14 o 36.20 por costura probada si supera el presupuesto, conservando IDs con subunidades enlazadas. Nunca generar migraciones en paralelo.

Para retomar desde laptop:

1. El coordinador completa P36.2/P36.3 y comparte URL de PR/commit del plan; no se asume que este archivo inicialmente untracked ya está publicado.
2. Recuperar la rama entregada; leer `AGENTS.md`, este plan, índice central, decisiones y estado de PR #362/F34 en ese checkout. Registrar HEAD y cambios locales antes de trabajar; no pisarlos.
3. Elegir el siguiente ID por dependencias, leer implementación/pruebas existentes y resolver su gate con opciones concretas. Pedir autorización de superficies y comandos de esa unidad.
4. Usar DB/storage/fixtures propios y aislados; producción sólo con permiso read-only separado. No copiar credenciales ni datos personales al plan o al PR.
5. Guardar relevo por unidad: ID, HEAD/PR, archivos, decisión/fuente, RED/GREEN/mutación o excepción, comandos/resultados, bloqueos y siguiente ID. Un resultado local no se presenta como CI/preview remoto.

**Cierre documental:** inventario 21/21 y 22 tareas verificados; P36.1/P36.2 completos. P36.3 en curso; las 22 tareas de producto y la aceptación de #289 permanecen pendientes.
