import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

// React's server-action metadata keeps the native POST visible in SSR.
vi.mock("./actions", () => ({
  sendContactMessageAction: Object.assign(() => {}, {
    $$FORM_ACTION: () => ({
      name: "$ACTION_ID_contact-test",
      method: "POST",
      action: "/ayuda/escribinos",
      encType: "multipart/form-data",
      data: null,
    }),
  }),
}));

import EscribinosPage, { metadata } from "./page";

/**
 * tasks.md 23.7 (DECIDIDA 2026-09-04) — "Escribinos" en los bytes que salen
 * de la ruta, la misma disciplina que `entrar-servida.test.tsx` sigue para
 * `/signin`: un render de los bytes prueba que la pantalla INSTALA la
 * decisión, no sólo que el dominio la calcula bien (eso ya lo prueba
 * `contact-message.test.ts`/`contact-screen.test.ts`).
 */
async function servida(searchParams: Record<string, string | string[] | undefined> = {}) {
  return renderToStaticMarkup(
    await EscribinosPage({ searchParams: Promise.resolve(searchParams) }),
  );
}

describe("EscribinosPage — la pantalla del formulario", () => {
  it("dibuja un formulario nativo apuntando a la Server Action, sin JavaScript de por medio", async () => {
    const html = await servida();

    // React arma el POST solo cuando `action` es una función — la misma
    // forma que `reportar/page.tsx` ya usa, sin un `method="post"` propio.
    expect(html).toContain("<form");
    expect(html).toContain("<button");
  });

  it("pide nombre, correo y mensaje, cada uno con su etiqueta", async () => {
    const html = await servida();

    expect(html).toContain('name="name"');
    expect(html).toContain('name="email"');
    expect(html).toContain('type="email"');
    expect(html).toContain('name="message"');
  });

  it("nunca publica una dirección de correo — no hay ningún `mailto:`", async () => {
    const html = await servida();

    expect(html).not.toContain("mailto:");
  });

  it("incluye la trampa para bots, oculta de cualquier visitante real", async () => {
    const html = await servida();

    expect(html).toContain('name="sitioWeb"');
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain('tabindex="-1"');
  });

  it("no dibuja ningún aviso de error en la carga normal", async () => {
    const html = await servida();

    expect(html).not.toContain("Revisa los datos");
  });

  it("orders the editorial category, heading, introduction and native form", async () => {
    const html = await servida();
    const category = html.indexOf("Ayuda / Escríbenos");
    const title = html.indexOf(">Escríbenos</h1>");
    const intro = html.indexOf("No publicamos ninguna dirección");
    const form = html.indexOf("<form");
    expect(category).toBeGreaterThanOrEqual(0);
    expect(category).toBeLessThan(title);
    expect(title).toBeLessThan(intro);
    expect(intro).toBeLessThan(form);
  });

  it("is indexable — the page carries no noindex directive", () => {
    expect(metadata.robots).toBeUndefined();
  });
});

describe("EscribinosPage — el acuse, después de mandar", () => {
  it("dibuja el acuse y ningún formulario cuando llega `?enviado`", async () => {
    const html = await servida({ enviado: "" });

    expect(html).not.toContain("<form");
    expect(html).toContain("Recibimos tu mensaje");
    expect(html.indexOf("Ayuda / Escríbenos")).toBeLessThan(html.indexOf(">Escríbenos</h1>"));
    expect(html.indexOf(">Escríbenos</h1>")).toBeLessThan(html.indexOf("Recibimos tu mensaje"));
    expect(html).not.toContain("Revisa los datos");
  });
});

describe("EscribinosPage — el rechazo del servidor", () => {
  it("dibuja el aviso de error y vuelve a mostrar el formulario cuando llega `?error`", async () => {
    const html = await servida({ error: "" });

    expect(html).toContain("<form");
    expect(html).toContain("Revisa los datos");
    expect(html.indexOf("Ayuda / Escríbenos")).toBeLessThan(html.indexOf(">Escríbenos</h1>"));
    expect(html.indexOf(">Escríbenos</h1>")).toBeLessThan(html.indexOf("Revisa los datos"));
    expect(html.indexOf("Revisa los datos")).toBeLessThan(html.indexOf("<form"));
    expect(html).not.toContain("Recibimos tu mensaje");
  });
});

async function served(query: Record<string, string | string[] | undefined> = {}) {
  return renderToStaticMarkup(await EscribinosPage({ searchParams: Promise.resolve(query) }));
}

const GUIDANCE =
  "Cuéntanos la ciudad, el nombre de la zona que falta y por qué debería estar en el catálogo.";

function expectFreeForm(html: string) {
  expect(html).toContain('action="/ayuda/escribinos"');
  expect(html).toContain('method="POST"');
  expect(html).toMatch(
    /<input(?=[^>]*name="name")(?=[^>]*required="")(?=[^>]*maxLength="80")[^>]*>/,
  );
  expect(html).toMatch(
    /<input(?=[^>]*name="email")(?=[^>]*type="email")(?=[^>]*required="")[^>]*>/,
  );
  expect(html).toMatch(
    /<textarea[^>]*name="message"[^>]*required=""[^>]*minLength="20"[^>]*maxLength="2000"><\/textarea>/,
  );
  expect(html).toMatch(
    /<input(?=[^>]*name="sitioWeb")(?=[^>]*tabindex="-1")(?=[^>]*autoComplete="off")[^>]*>/,
  );
  expect(html).not.toMatch(/name="(?:city|cityId|zone|zoneId)"/);
}

describe("Escribinos served HTML", () => {
  it("guides a missing-zone report with an empty native free-form message", async () => {
    const html = await served({ motivo: "zona-faltante", q: "Untrusted city" });
    expect(html).toContain(GUIDANCE);
    expect(html).toContain("Avisarnos no crea ni habilita una zona.");
    expect(html).toContain('name="motivo" value="zona-faltante"');
    expect(html).toContain('href="/publicar/paso/zona"');
    expect(html).not.toContain('name="volver"');
    expect(html).toContain("Volver al borrador guardado");
    expect(html).not.toContain("Untrusted city");
    expect(html).toContain(
      "Los cambios que no hayas enviado en publicación no se guardan al abrir este formulario.",
    );
    expect(await served({ motivo: "zona-faltante", error: "" })).toContain(
      "Revisa los datos e inténtalo de nuevo.",
    );
    expectFreeForm(html);
  });

  it("renders the fixed Zone return in review mode on form and acknowledgement", async () => {
    for (const enviado of [undefined, ""]) {
      const html = await served({ motivo: "zona-faltante", volver: "revisar", enviado });
      expect(html).toContain('href="/publicar/paso/zona?volver=revisar"');
      if (enviado !== undefined) {
        expect(html).toContain("Recibimos tu mensaje.");
      } else {
        expect(html).toContain('name="volver" value="revisar"');
        expectFreeForm(html);
      }
    }
  });

  it("preserves the general form and all existing feedback", async () => {
    const html = await served();
    expectFreeForm(html);
    expect(html).toContain("cuéntanos qué necesitas");
    expect(html).not.toContain(GUIDANCE);
    expect(html).not.toContain('name="motivo"');
    expect(html).not.toContain("/publicar/paso/");
    expect(await served({ error: "" })).toContain("Revisa los datos e inténtalo de nuevo.");
    const sent = await served({ enviado: "", error: "" });
    expect(sent).toContain("Recibimos tu mensaje.");
    expect(sent).not.toContain("<form");
    expect(sent).not.toContain('role="alert"');
  });

  it("rejects unknown and repeated contexts even with review return requested", async () => {
    for (const motivo of ["other", ["zona-faltante"], "https://outside.invalid"]) {
      const html = await served({ motivo, volver: "revisar" });
      expect(html).not.toContain(GUIDANCE);
      expect(html).not.toContain('name="motivo"');
      expect(html).not.toContain("/publicar/paso/");
      expectFreeForm(html);
    }
  });

  it("never turns visitor-supplied destinations or repeated modes into a return URL", async () => {
    for (const volver of [
      "https://outside.invalid",
      "//outside.invalid",
      ["revisar"],
      "/publicar/paso/precio",
    ]) {
      const html = await served({
        motivo: "zona-faltante",
        volver,
        retorno: "https://outside.invalid",
      });
      expect(html).toContain('href="/publicar/paso/zona"');
      expect(html).not.toContain("outside.invalid");
      expect(html).not.toContain("/publicar/paso/precio");
      expect(html).not.toContain("?volver=revisar");
    }
  });
});

describe("EscribinosPage — F35.8", () => {
  it("F35.8: names the screen «Escríbenos» and speaks in neutral tuteo, keeping the /ayuda/escribinos route", async () => {
    const form = await servida();

    expect(metadata.title).toBe("Escríbenos — Rentoru");
    expect(metadata.description).toBe(
      "Escríbenos un mensaje desde rentoru.com y te contestamos por correo.",
    );
    expect(metadata.alternates?.canonical).toBe("/ayuda/escribinos");
    expect(form).toContain(">Ayuda / Escríbenos</p>");
    expect(form).toMatch(/<h1[^>]*>Escríbenos<\/h1>/);
    expect(form).toContain(
      "No publicamos ninguna dirección de correo aquí: cuéntanos qué necesitas y te escribimos\n            nosotros a la tuya.".replace(
        /\n\s+/g,
        " ",
      ),
    );
    expect(form).toContain('<label for="sitioWeb">Deja esto vacío</label>');

    const sent = await servida({ enviado: "" });
    expect(sent).toContain("Te contestamos por correo, al mismo que dejaste aquí.");

    for (const html of [form, sent]) {
      for (const voseo of ["Escribinos", "acá", "contanos", "necesitás", "Dejá"]) {
        expect(html).not.toContain(voseo);
      }
    }
  });
});
