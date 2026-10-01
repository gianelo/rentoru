import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { HomeLanding } from "@/modules/listing-discovery/domain/home-collections";
import { LaunchLanding } from "./LaunchLanding";

const landing: HomeLanding = {
  eyebrow: "Publica en Distrito Capital y Maracaibo",
  title: "Gratis para publicar. Sin comisión.",
  lead: "Todavía no hay avisos disponibles en Maracaibo.",
  action: { href: "/publicar", label: "Publicar un aviso" },
  facts: [
    { label: "Publicación y búsqueda", value: "Gratis" },
    { label: "Comisión de Rentoru", value: "Ninguna" },
    { label: "Contacto", value: "WhatsApp tras registrarse" },
  ],
  disclaimer: "Rentoru no recibe pagos ni escribe contratos.",
};

describe("landing servida", () => {
  it("renderiza todo el modelo recibido con semántica y enlace nativo", () => {
    const html = renderToStaticMarkup(<LaunchLanding landing={landing} />);
    expect(html).toMatch(/<section[^>]*><div[^>]*><div>/);
    expect(html).toContain(`<h1`);
    expect(html).toContain(landing.title);
    expect(html).toContain(landing.eyebrow);
    expect(html).toContain(landing.lead);
    expect(html).toContain('href="/publicar"');
    expect(html).toContain("Publicar un aviso");
    expect(html).toMatch(
      /<dl[^>]*>.*<dt>Publicación y búsqueda<\/dt><dd>Gratis<\/dd>.*<dt>Comisión de Rentoru<\/dt><dd>Ninguna<\/dd>.*<dt>Contacto<\/dt><dd>WhatsApp tras registrarse<\/dd>.*<\/dl>/,
    );
    expect(html).toContain(landing.disclaimer);
  });
});
