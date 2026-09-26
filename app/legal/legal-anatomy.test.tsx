import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import Cookies from "./cookies/page";
import Datos from "./datos/page";
import Normas from "./normas/page";
import Privacidad from "./privacidad/page";
import Terminos from "./terminos/page";

const pages = [
  [Terminos, "Términos y condiciones", "/legal/normas"],
  [Privacidad, "Política de privacidad", "/legal/cookies"],
  [Cookies, "Uso de cookies", "authjs.session-token"],
  [Datos, "Tratamiento de datos", "/legal/privacidad"],
  [Normas, "Normas de publicación", "Datos obligatorios"],
] as const;

describe("legal served article anatomy", () => {
  for (const [Page, title, evidence] of pages) {
    it(`${title}: category, heading, draft and sections remain ordered`, () => {
      const html = renderToStaticMarkup(<Page />);
      const category = html.indexOf(`Legal / ${title}`);
      const heading = html.indexOf(`<h1`);
      const notice = html.indexOf("Borrador en revisión.");
      const section = html.indexOf(`<h2`);
      expect(category).toBeGreaterThanOrEqual(0);
      expect(category).toBeLessThan(heading);
      expect(heading).toBeLessThan(notice);
      expect(notice).toBeLessThan(section);
      expect(html).toContain(evidence);
    });
  }
});
