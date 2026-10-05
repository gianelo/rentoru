# Spinner de búsqueda de zona

Base: dev `3d2b55ad0561a7984a9f9bd6b8ad04ada17004e4`. Rama: `feat/spinner-busqueda-zona`.

## Alcance autorizado

Spinner dentro del input durante consulta no vacía (incluye debounce). Ocultar × nativa sólo mientras busca; restaurarla al finalizar, fallar o vaciar. Conservar GET sin JS, selección, referencia, abort/versionado y reglas de búsqueda. CSS derivado del aro existente; sin SVG, dependencias ni cambios de Nav. Usuario solicita Next local para revisión manual; no instalar, migrar, sembrar ni ejecutar operaciones de backend. Preservar otras worktrees/puertos/builds.

## Tareas

1. [ ] Implementar y verificar una unidad pequeña: RED/GREEN/mutación restaurada, DOM del caller real, estados vigente/obsoleta/error/vacío, tokens/reduced-motion, tipos y revisión nativa; cerrar con commit de trabajo. **En curso**. Escritor `muvep6pk-2y-ayi4`: RED8 fallos/10 passes → GREEN18/18; retirar prop loading produjo3 fallos/15 passes, incluido caller real, restaurado18/18. Independiente `muvexmux-2z-nq9w`:18/18, tipos, Biome7, tokens309 y diff PASS;9fuentes/index/documento sin mutaciones.9archivos +120/−12. Revisión/commit pendientes.
2. [ ] Arrancar Next local en puerto libre propio y comprobar visualmente el indicador y ×; entregar URL para aceptación humana. Pendiente. Sitio real requiere sesión/DB existente; no afirmar aceptación productiva con fixture sintética.

## Comprobaciones y límites

Exploración: contexto actual no expone loading. Añadir estado de transporte/version guard, no regla de negocio. Token inline nuevo sólo si necesario, en sistema/referencia/producción. Root limpio antes de rama; `.next` existe y no es symlink; `.env` existe (sólo nombre comprobado, no contenido). Startup autorizado expresamente; no leer/divulgar credenciales. Tests con env limpio y Vitest --no-cache. Presupuesto normal400 líneas; objetivo ≤200, sin comprimir pruebas para cumplir. Pruebas focalizadas observadas18/18; «caller real conecta tecleo con radios dentro del POST sin remonte de referencia» verifica estado de carga sobre DOM servido/hidratado. RED/mutación originales reportadas por escritor; verificador no las repitió.4 casos browser recogidos, no ejecutados aún. Advertencias React method/action de formas preexistentes; fuente PublishStep idéntica a base, sin replay runtime de base. Si no se puede verificar geometría real, informar el límite sin inventar PASS.
