import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { type ContactDoorCopy, contactDoorFor } from "@/modules/contact-reveal/domain/sign-in-door";
import { SignInDoor } from "./SignInDoor";

const source = readFileSync("components/organisms/SignInDoor.tsx", "utf-8");

const COPY: ContactDoorCopy = {
  title: "Entra para ver el WhatsApp del dueño",
  reason: "Pedimos la cuenta para frenar avisos falsos. Es gratis y es rápido.",
  closeLabel: "Cerrar sin entrar",
  assurance: "Vuelves a este mismo aviso al terminar.",
  email: {
    separator: "o con tu correo",
    label: "Correo",
    placeholder: "tucorreo@ejemplo.com",
    submit: "Enviarme el enlace",
    note: "Te mandamos un enlace que te deja entrar. No manejamos contraseñas.",
  },
  verifiedNotice: null,
};

async function noop(): Promise<void> {}

function markup(copy = COPY) {
  return renderToStaticMarkup(
    <SignInDoor
      copy={copy}
      stayHref="/alquiler/distrito-capital/chacao/apto-abc123"
      callbackUrl="/alquiler/distrito-capital/chacao/apto-abc123"
      signInAction={noop}
      requestMagicLinkAction={noop}
    />,
  );
}

describe("SignInDoor", () => {
  it.each([
    ["whatsapp", "owner", null, "WhatsApp del dueño"],
    ["telefono", "broker", null, "teléfono de la inmobiliaria"],
    ["email", "broker", "María F.", "email de María F."],
  ] as const)("35.2a: renderiza la puerta real neutra %s/%s/%s", (method, type, name, phrase) => {
    const copy = contactDoorFor({ state: "locked", method }, { type, name }, "si", true);
    expect(copy).not.toBeNull();
    if (copy === null) throw new Error("La puerta debe estar abierta");
    const html = markup(copy);
    expect(html).toContain(`Entra para ver el ${phrase}`);
    expect(html).toContain("Pedimos la cuenta para frenar avisos falsos. Es gratis y es rápido.");
    expect(html).toContain("Vuelves a este mismo aviso al terminar.");
    expect(html).toContain("Al entrar aceptas los ");
    expect(html).toContain('href="/legal/terminos">términos</a>');
    expect(html).toContain('href="/legal/privacidad">privacidad</a>');
    expect(html).toContain('aria-label="Cerrar sin entrar"');
    expect(html).toContain("verificado por ");
    expect(
      html.match(/name="callbackUrl" value="\/alquiler\/distrito-capital\/chacao\/apto-abc123"/g),
    ).toHaveLength(2);
    expect(html).toContain('href="/alquiler/distrito-capital/chacao/apto-abc123"');
  });
  /**
   * tasks.md 22.20 — el disco de Google entra al botón, y el botón deja el
   * nivel 1 (relleno `--accent`) por el nivel 3 (borde `--strong`, sin
   * relleno): con la marca puesta, un relleno de acento competiría con ella.
   */
  it("dibuja el botón de Google con su marca, en nivel 3 y no en nivel 1", () => {
    const html = markup();

    expect(html).toContain("Continuar con Google");
    // Las cuatro `fill` de la marca, en los bytes servidos.
    expect(html).toContain('fill="#4285F4"');

    // Nivel 3 y no nivel 1: se afirma sobre la fuente y no sobre la clase
    // renderizada, que CSS Modules hashea en cada corrida. `NeutralButton`
    // envuelve exactamente al `GoogleMark`, y ya no es `ActionButton` el que
    // envuelve el botón de Google (`ActionButton` sigue existiendo para el
    // botón «Enviarme el enlace», que es nivel 1 a propósito).
    expect(source).toMatch(/<NeutralButton type="submit">\s*<GoogleMark \/>/);
  });

  /**
   * tasks.md 22.28 — la mitad de la lámina que 22.22 no nombró: el campo de
   * correo, igual que la puerta de página.
   */
  it("debajo de Google dibuja el separador, el campo de correo y su botón", () => {
    const html = markup();

    expect(html).toContain("o con tu correo");
    expect(html).toContain("Te mandamos un enlace que te deja entrar. No manejamos contraseñas.");
    expect(html).toMatch(/<label[^>]*for="puerta-correo"[^>]*>Correo<\/label>/);
    expect(html).toMatch(/<input[^>]*type="email"[^>]*name="correo"/);
    expect(html).toMatch(/<input[^>]*id="puerta-correo"[^>]*required/);
    expect(html).toContain(">Enviarme el enlace</button>");
    expect(html.indexOf("Continuar con Google")).toBeLessThan(html.indexOf("o con tu correo"));
  });

  /** El destino cruza los dos formularios, igual que en la puerta de página. */
  it("el formulario del correo se lleva el destino en un campo oculto", () => {
    const html = markup();

    expect(html).toMatch(
      /<input[^>]*type="hidden"[^>]*name="callbackUrl"[^>]*value="\/alquiler\/distrito-capital\/chacao\/apto-abc123"/,
    );
    expect(html.match(/<form/g)).toHaveLength(2);
  });
});
