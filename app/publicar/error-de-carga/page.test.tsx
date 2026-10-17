import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import NavigationRecoveryPage from "./page";

describe("publication navigation recovery served body", () => {
  it("renders the actual synchronous page with retry and home anchors", () => {
    const page = NavigationRecoveryPage();
    expect(page).not.toBeInstanceOf(Promise);
    const html = renderToStaticMarkup(page);
    expect(html).toContain("<h1");
    expect(html).toContain("La navegación tardó demasiado");
    expect(html).toContain("Puedes reintentar la navegación o volver al inicio.");
    expect(html).toMatch(/<a [^>]*href="\/publicar"[^>]*>Reintentar<\/a>/);
    expect(html).toMatch(/<a [^>]*href="\/"[^>]*>Inicio<\/a>/);
    expect(html.match(/<a /g)).toHaveLength(2);
    expect(html).not.toMatch(/Código del fallo|<code|digest|stack|guardad|registrad/i);
    expect(html).not.toMatch(/<script|http-equiv|<button|publicación fall/i);
  });
});
