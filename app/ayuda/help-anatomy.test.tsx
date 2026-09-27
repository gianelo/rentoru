import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import Contactar from "./como-contactar-al-dueno/page";
import Publicar from "./como-publicar-un-aviso/page";
import Reportar from "./como-reportar-un-aviso/page";
import Preguntas from "./preguntas-frecuentes/page";

const pages = [
  [Preguntas, "Preguntas frecuentes", "¿Cuánto cuesta publicar", "/ayuda/como-contactar-al-dueno"],
  [Contactar, "Cómo contactar al dueño", "Cada ficha muestra", "Antes de acordar nada"],
  [Publicar, "Cómo publicar un aviso", "Publicar es gratis", "Después de publicar"],
  [Reportar, "Cómo reportar un aviso", "Reportar es por aviso", "/ayuda/escribinos"],
] as const;

describe("served help article anatomy", () => {
  for (const [Page, title, content, link] of pages) {
    it(`${title}: category precedes H1 while existing content remains`, () => {
      const html = renderToStaticMarkup(<Page />);
      const category = html.indexOf(`Ayuda / ${title}`);
      const heading = html.indexOf("<h1");
      expect(category).toBeGreaterThanOrEqual(0);
      expect(category).toBeLessThan(heading);
      expect(html).toContain(content);
      expect(html).toContain(link);
    });
  }
});
