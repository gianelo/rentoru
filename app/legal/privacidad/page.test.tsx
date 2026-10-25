import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import PrivacidadPage, { metadata } from "./page";

/**
 * tasks.md 23.5 — "Política de privacidad" v3, on Airbnb's structure (not
 * its text) for the founder to ratify. Verified first: `toMinimalGoogleProfile`
 * (name + email only), `enlace.ts`, `resend-lifecycle-mailer.ts`, the reveal
 * rate limit, and the retention decisions of fase 39 (D1–D8): retention is
 * stated as a criterion, never as a month count.
 */
describe("PrivacidadPage", () => {
  it("carries the unratified-draft notice", () => {
    const markup = renderToStaticMarkup(<PrivacidadPage />);

    expect(markup).toContain("Borrador en revisión");
  });

  it("carries the twelve sections in order", () => {
    const markup = renderToStaticMarkup(<PrivacidadPage />);
    const headings = [...markup.matchAll(/<h2[^>]*>([^<]*)<\/h2>/g)].map((match) => match[1]);

    expect(headings).toEqual([
      "1. Qué son los datos personales",
      "2. Quién es el responsable",
      "3. Qué datos recogemos",
      "4. Para qué los usamos",
      "5. Con quién los compartimos",
      "6. Transferencias internacionales",
      "7. Tus derechos",
      "8. Cuánto tiempo los conservamos",
      "9. Seguridad",
      "10. Menores de edad",
      "11. Cambios a esta política",
      "12. Contacto",
    ]);
  });

  it("names the responsible party as an anonymous natural person", () => {
    const markup = renderToStaticMarkup(<PrivacidadPage />);

    expect(markup).toContain("el titular de Rentoru, persona natural domiciliada");
    expect(markup).not.toMatch(/cédula|RIF/);
  });

  it("states Google sign-in captures only name and email, no picture", () => {
    const markup = renderToStaticMarkup(<PrivacidadPage />);

    expect(markup).toContain("tu nombre y el correo");
    expect(markup).toContain("No guardamos tu foto de perfil");
  });

  it("states the real reveal limit: 40 distinct listings per account in 24 hours", () => {
    const markup = renderToStaticMarkup(<PrivacidadPage />);

    expect(markup).toContain(
      "limitar a 40 los avisos distintos cuyo contacto puede ver una cuenta en 24 horas",
    );
  });

  it("names the real processors: Google, Resend, Vercel, Neon and Cloudflare", () => {
    const markup = renderToStaticMarkup(<PrivacidadPage />);

    for (const processor of ["Google", "Resend", "Vercel", "Neon", "Cloudflare"]) {
      expect(markup).toContain(processor);
    }
  });

  it("states data is not sold or used for advertising", () => {
    const markup = renderToStaticMarkup(<PrivacidadPage />);

    expect(markup).toContain("No vendemos tus datos, no los usamos para publicidad");
  });

  it("answers rights requests within thirty days", () => {
    const markup = renderToStaticMarkup(<PrivacidadPage />);

    expect(markup).toContain("dentro de los 30 días siguientes");
  });

  it("states retention as a criterion, never as a month count", () => {
    const markup = renderToStaticMarkup(<PrivacidadPage />);

    expect(markup).toContain(
      "<strong>Registro de contactos revelados:</strong> Mientras sea necesario para prevenir fraudes y medir el servicio; después se anonimiza.",
    );
    expect(markup).not.toContain("12 meses");
    expect(markup).not.toMatch(/\d+ meses/);
  });

  it("deletes the contact copied into an expired listing with its photos", () => {
    const markup = renderToStaticMarkup(<PrivacidadPage />);

    expect(markup).toContain(
      "<strong>Contacto copiado en un aviso vencido:</strong> Se borra junto con sus fotos.",
    );
  });

  it("discloses residual copies in the providers' backups", () => {
    const markup = renderToStaticMarkup(<PrivacidadPage />);

    expect(markup).toContain(
      "Pueden quedar copias residuales en los respaldos de nuestros proveedores durante un tiempo limitado, según la política de cada uno.",
    );
  });

  it("gives the real contact address for exercising rights", () => {
    const markup = renderToStaticMarkup(<PrivacidadPage />);

    expect(markup).toContain('href="mailto:hola@rentoru.com"');
  });

  it("links to the terms and cookies pages", () => {
    const markup = renderToStaticMarkup(<PrivacidadPage />);

    expect(markup).toContain('href="/legal/terminos"');
    expect(markup).toContain('href="/legal/cookies"');
  });

  it("is indexable — the page carries no noindex directive", () => {
    expect(metadata.robots).toBeUndefined();
  });

  it("F35.9: addresses the reader in neutral tuteo, not voseo", () => {
    const markup = renderToStaticMarkup(<PrivacidadPage />);

    expect(markup).toContain(
      "Si entras con Google: tu nombre y el correo que Google confirma como verificado.",
    );
    expect(markup).toContain(
      "Cuando pides ver el contacto de un aviso, guardamos qué aviso, tu cuenta, el momento y el mensaje que escribiste.",
    );
    expect(markup).toContain("Si no estás de acuerdo, puedes pedir el cierre de tu cuenta.");
    expect(markup).toContain("Escribe a <a");

    expect(markup).not.toContain("Si entrás con Google:");
    expect(markup).not.toContain("Cuando pedís ver el contacto");
    expect(markup).not.toContain("podés pedir el cierre");
    expect(markup).not.toContain("Escribí a");
  });
});
