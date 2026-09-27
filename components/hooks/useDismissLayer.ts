"use client";

import { type RefObject, useEffect, useRef } from "react";

export interface DismissLayerHandle<
  TTrigger extends HTMLElement = HTMLElement,
  TPanel extends HTMLElement = HTMLElement,
> {
  /** El control que abre la capa. Recibe el foco de vuelta al cerrarse. */
  readonly triggerRef: RefObject<TTrigger | null>;
  /** El contenido que se descarta. Un clic acá adentro nunca cuenta como "afuera". */
  readonly panelRef: RefObject<TPanel | null>;
}

/**
 * La primitiva de capa descartable (tasks.md 28.1): clic afuera, Escape, y
 * el foco que vuelve al control que abrió — las tres cosas que ningún menú
 * hecho a mano tenía (medido: `outside|clickOutside|Escape|onKeyDown` en
 * `components/` sólo aparecía en un componente de toda la capa de entrega).
 *
 * **Nunca decide CUÁNDO abrir.** Eso lo sigue decidiendo quien llama, con su
 * propio estado (`AccountMenu`) o con el `<details>` nativo del navegador
 * hecho controlado (`PhotoUploader`). Esta pieza sólo cierra lo que ya está
 * abierto — así un `<details>` sin JavaScript sigue abriendo y cerrando con
 * el mecanismo del navegador, intacto, y esta mejora sólo se monta encima
 * cuando el script corre (decisión del fundador, tasks.md Fase 28: "con
 * JavaScript la pantalla se comporta como una aplicación; sin él, cae al
 * camino servido que ya existe").
 *
 * `pointerdown` y no `click`: pasa antes de que el foco se mueva, así que el
 * dismiss corre antes de que cualquier otro manejador de foco reaccione —el
 * mismo orden que `SearchSuggestions.tsx` ya eligió para su propio cierre.
 */
export function useDismissLayer<
  TTrigger extends HTMLElement = HTMLElement,
  TPanel extends HTMLElement = HTMLElement,
>(open: boolean, onDismiss: () => void): DismissLayerHandle<TTrigger, TPanel> {
  const triggerRef = useRef<TTrigger>(null);
  const panelRef = useRef<TPanel>(null);
  const wasOpen = useRef(false);
  // Espejo de `onDismiss`: evita que el efecto se vuelva a montar sólo
  // porque quien llama pasó una función nueva en este render.
  const dismiss = useRef(onDismiss);
  dismiss.current = onDismiss;

  useEffect(() => {
    if (!open) {
      if (wasOpen.current) triggerRef.current?.focus();
      wasOpen.current = false;
      return;
    }
    wasOpen.current = true;

    const isInside = (target: EventTarget | null): boolean =>
      target instanceof Node &&
      Boolean(triggerRef.current?.contains(target) || panelRef.current?.contains(target));

    const onPointerDown = (event: PointerEvent | MouseEvent) => {
      if (!isInside(event.target)) dismiss.current();
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      dismiss.current();
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return { triggerRef, panelRef };
}
