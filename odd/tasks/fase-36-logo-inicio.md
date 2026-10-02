# F36.2 — Logo como enlace al inicio

## Alcance y autorización

El fundador autoriza continuar 36.2 tras fusionar #364 y #366. Worktree propio `rentoru-fase36-publicacion`; rama `fix/fase-36-logo-inicio` desde `origin/dev` `e5ea87cd8ec11688d33aa5a8011d7d638546c44d`.

36.1 sigue parcial: baseline y fixture entregados no prueban publicación final ni reintento. Se difieren H36.2/H36.3; la reproducción del logo no enlazado ya permite esta corrección independiente. No declarar completada 36.1 por esta unidad.

Objetivo: marca enlazada a `/` en pasos, fotos y revisar; nombre accesible, foco visible y navegación nativa, conservando borrador. Sin reglas de negocio en componentes, refactor global, cambios de copy ajeno, loaders ni infraestructura nueva.

## Tareas

- [x] L36.2a — Mapeo observado por explorador read-only `murdvblh-c-gh63`, con spotcheck del coordinador. `PublishStep.tsx:158–169` sustituye marca por Atrás; fotos reutiliza ese shell. `revisar/page.tsx:114–123` es el segundo shell. D13/D15/D16 y SISTEMA exigen enlace nativo, target y tokens. `listo` es terminal, fuera de este corte. Sin comportamiento nuevo ni RED aplicable al mapeo.
- [ ] L36.2b — En curso: implementar enlace con prueba del HTML servido. Observar RED, GREEN y mutación/restauración propia; cubrir shells afectados y salida sin destruir borrador. Un escritor, sin servicios externos.
- [ ] L36.2c — Verificar funcionalidad y entregar corte a `dev`. Checks focalizados, teclado/foco y navegación con/sin JS cuando aplicable; revisión nativa del corte, commit de unidad y PR ≤400 líneas. Fetch y revisar conflictos antes de push/PR; sin merge automático.

## Entorno y evidencia

PostgreSQL propio activo `rentoru-f36-pg`, loopback 55433; app propia 3001, proxy 55436. Fixtures asignados 55437/55438, sin procesos nuevos iniciados. No tocar PG F35/55435; coordinar antes de usar 3000/3100/5545 liberados. Sin producción ni credenciales reales.

Superficie derivada: `PublishStep.tsx`, `revisar/page.tsx`, `publish-steps.module.css` y prueba nueva `app/publicar/logo-inicio.test.tsx`. Marca visible junto a Atrás; salida existente intacta. Riesgo a comprobar: colisión móvil. Conservación refiere al borrador guardado, no autosalvar entradas sin enviar. Pruebas, resultados y commit funcional pendientes; no afirmar RED ni aceptación antes de observarlos.
