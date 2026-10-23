import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import PrivacidadPage, { metadata } from "./page";

/**
 * tasks.md 23.5 — "Política de privacidad", drafted by the agent for the
 * founder to ratify. Verified first: `toMinimalGoogleProfile` (name + email
 * only), `enlace.ts`, `resend-lifecycle-mailer.ts`, and the real
 * `hola@rentoru.com` address already used in `PublishStep.tsx`.
 */
describe("PrivacidadPage", () => {
  it("carries the unratified-draft notice", () => {
    const markup = renderToStaticMarkup(<PrivacidadPage />);

    expect(markup).toContain("Borrador en revisión");
  });

  it("states Google sign-in captures only name and email, no picture", () => {
    const markup = renderToStaticMarkup(<PrivacidadPage />);

    expect(markup).toContain("nombre y el correo");
    expect(markup).toContain("ninguna foto");
  });

  it("names the real processors: Google, Resend, Neon and Cloudflare", () => {
    const markup = renderToStaticMarkup(<PrivacidadPage />);

    expect(markup).toContain("Google");
    expect(markup).toContain("Resend");
    expect(markup).toContain("Neon");
    expect(markup).toContain("Cloudflare");
  });

  it("states data is not sold or used for advertising", () => {
    const markup = renderToStaticMarkup(<PrivacidadPage />);

    expect(markup).toContain("no vendemos");
  });

  it("gives the real contact address for exercising rights", () => {
    const markup = renderToStaticMarkup(<PrivacidadPage />);

    expect(markup).toContain("hola@rentoru.com");
  });

  it("links to the cookies page", () => {
    const markup = renderToStaticMarkup(<PrivacidadPage />);

    expect(markup).toContain('href="/legal/cookies"');
  });

  it("is indexable — the page carries no noindex directive", () => {
    expect(metadata.robots).toBeUndefined();
  });

  it("F35.9: addresses the reader in neutral tuteo, not voseo", () => {
    const markup = renderToStaticMarkup(<PrivacidadPage />);

    expect(markup).toContain(
      "Si entras con Google: el nombre y el correo verificado que Google confirma. No se guarda ninguna foto de perfil ni ningún otro dato de tu cuenta de Google.",
    );
    expect(markup).toContain(
      "Si entras con el enlace por correo: la dirección de correo a la que lo enviamos.",
    );
    expect(markup).toContain(
      "Al publicar un aviso: el método y el valor de contacto que eliges mostrar (WhatsApp, teléfono o correo), y los datos del inmueble.",
    );
    expect(markup).toContain(
      "Al contactar a un dueño: el mensaje que escribes antes de ver su contacto queda asociado a ese momento — qué aviso, cuándo, y tu cuenta.",
    );
    expect(markup).toContain(
      "Hoy no existe una pantalla propia para corregir o borrar tus datos. Mientras tanto, escribe a <a",
    );

    expect(markup).not.toContain("Si entrás con Google:");
    expect(markup).not.toContain("Si entrás con el enlace por correo:");
    expect(markup).not.toContain("el valor de contacto que elegís mostrar");
    expect(markup).not.toContain("el mensaje que escribís antes de ver su contacto");
    expect(markup).not.toContain("Mientras tanto, escribí a");
  });
});
