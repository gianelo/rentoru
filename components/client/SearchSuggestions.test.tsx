// @vitest-environment happy-dom
import { readFileSync } from "node:fs";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SearchPill } from "../molecules/SearchPill";

/**
 * **La regresión de la tarea 28.10(a), y el hueco que la dejó pasar.**
 *
 * Este archivo no existía: `components/client/SearchSuggestions.tsx` no tenía
 * NINGUNA prueba que escribiera de verdad en un campo. `SearchPill.test.tsx`
 * sólo mira `renderToStaticMarkup` — el marcado ANTES de hidratar, donde la
 * mejora nunca dibuja nada a propósito (14.51) — así que ninguna corrida podía
 * poner en rojo "al escribir no aparecen las sugerencias". Y hasta la tarea
 * 28.1 (2026-09-13) `vitest.config.ts` corría `components/**` en
 * `environment: "node"`, sin DOM: aunque alguien hubiera escrito un test que
 * despachara un evento `input`, no había dónde despacharlo. `happy-dom` llegó
 * recién con esa tarea, y este archivo es la primera prueba de
 * `SearchSuggestions` que puede existir.
 *
 * **Investigación de la causa, contra el propio historial.** Se auditó cada
 * commit desde el 2026-09-02 (`895a736`, cuando el inicio ganó vocabulario)
 * hasta el reporte del fundador (issue #286, 2026-09-09T19:59Z) que tocara
 * `SearchSuggestions.tsx`, `SearchPill.tsx`, sus hojas de estilos,
 * `bounded-vocabulary.ts`, `suggest-filters.ts`, `search-destination.ts` y
 * `drizzle-active-zones.ts`: ninguno alteró el cableado del DOM, el CSS de
 * visibilidad ni la función de coincidencia. Montar el árbol de producción
 * real (este archivo) y despachar un evento `input` de verdad muestra la
 * sugerencia tanto en `895a736` como en `HEAD` — no hay una regresión de
 * lógica que un test de componente pueda reproducir. La causa más probable
 * queda fuera del control de versiones (estado del catálogo real en el
 * momento probado, o una construcción parcial); no se pudo fijar en un commit
 * único, y se deja escrito en vez de inventar uno.
 *
 * Esta prueba no demuestra la causa: es la RED que faltaba, y que de aquí en
 * adelante SÍ se pone roja si el mecanismo alguna vez deja de mostrar la
 * sugerencia al escribir.
 */
const VOCABULARY = {
  cities: [{ id: "c-dc", name: "Distrito Capital" }],
  zones: [{ id: "z-altamira", name: "Altamira", cityId: "c-dc", parentName: "Chacao", count: 9 }],
  aliases: [],
};

const BASE = {
  action: "/",
  name: "q",
  value: "",
  placeholder: "¿En qué zona buscás?",
  submitLabel: "Buscar",
  state: { kind: "empty" as const },
};

describe("SearchSuggestions — al escribir en la pastilla del inicio (28.10a)", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  function escribir(texto: string): void {
    const field = container.querySelector('input[type="search"]') as HTMLInputElement;
    act(() => {
      field.value = texto;
      field.dispatchEvent(new Event("input", { bubbles: true }));
    });
  }

  it("muestra la lista de sugerencias al escribir una zona con avisos", () => {
    act(() => {
      root.render(<SearchPill {...BASE} suggestions={VOCABULARY} />);
    });

    expect(container.querySelector('[aria-label="Sugerencias"]')).toBeNull();

    escribir("alta");

    const panel = container.querySelector('[aria-label="Sugerencias"]');
    expect(panel).not.toBeNull();
    expect(panel?.textContent).toContain("Altamira");
  });

  it("Escape cierra la lista sin borrar lo escrito", () => {
    act(() => {
      root.render(<SearchPill {...BASE} suggestions={VOCABULARY} />);
    });
    escribir("alta");
    expect(container.querySelector('[aria-label="Sugerencias"]')).not.toBeNull();

    const field = container.querySelector('input[type="search"]') as HTMLInputElement;
    act(() => {
      field.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    });

    expect(container.querySelector('[aria-label="Sugerencias"]')).toBeNull();
    expect(field.value).toBe("alta");
  });

  /**
   * **28.10(c) — "nadie ve eso del conteo ahí dentro de la sugerencia".**
   * `Altamira` viaja con `count: 9` porque el dominio lo necesita para excluir
   * zonas vacías y para ordenar por oferta (17.5/17.7) — quitarlo del
   * vocabulario rompería esas dos reglas. Lo que se retira es sólo el
   * NÚMERO DIBUJADO al lado de la etiqueta.
   */
  it("no dibuja el conteo dentro de la sugerencia", () => {
    act(() => {
      root.render(<SearchPill {...BASE} suggestions={VOCABULARY} />);
    });
    escribir("alta");

    const opcion = container.querySelector('[aria-label="Sugerencias"] a') as HTMLAnchorElement;
    expect(opcion).not.toBeNull();
    expect(opcion.textContent).not.toContain("9");
  });
});

describe("SearchPill — el desplegable mide lo mismo que la pastilla (28.10b)", () => {
  const pillCss = readFileSync("components/molecules/SearchPill.module.css", "utf-8");
  const suggestionsCss = readFileSync("components/client/SearchSuggestions.module.css", "utf-8");

  function block(css: string, selector: string): string {
    const match = css.match(new RegExp(`\\.${selector}\\s*\\{([^}]*)\\}`));
    if (!match) throw new Error(`falta el bloque .${selector}`);
    return match[1] ?? "";
  }

  /**
   * `.panel` es `position: absolute; inset-inline: 0`. Ese `0` mide contra el
   * ANCESTRO POSICIONADO más cercano — y hasta esta tarea era `.anchor`, que
   * vive DENTRO de `.textCol` (la columna de texto, más angosta que la
   * pastilla entera porque comparte la fila con el filtro y la lupa). El
   * propio comentario de esta hoja decía "con la pastilla como contenedor
   * posicionado" desde el primer commit (`9ca9ef8`, 2026-09-02) — la
   * implementación nunca cumplió lo que el comentario prometía. `.pill` tiene
   * que ser el contenedor posicionado, y `.anchor` deja de serlo.
   */
  it("la pastilla es el contenedor posicionado, y el ancla ya no compite por serlo", () => {
    expect(block(pillCss, "pill")).toContain("position: relative");
    expect(block(suggestionsCss, "anchor")).not.toMatch(/position:\s*relative/);
  });
});
