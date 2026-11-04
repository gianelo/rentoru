import { describe, expect, it } from "vitest";
import {
  action,
  fact,
  fallback,
  footer,
  heading,
  type MailContent,
  paragraph,
} from "./mail-content";
import { expectedMailHtml, FIXTURE_FONTS, P } from "./mail-html.fixture";
import { renderMailHtml, renderMailText } from "./render-mail";

/**
 * Una sola presentación para los cinco correos (38.2, L9): los mismos
 * bloques dan el HTML de la lámina v1 y el texto plano.
 */
const { SANS, MONO, TABLE } = FIXTURE_FONTS;
const URL = "https://rentoru.test/api/auth/callback/resend?token=8f3a&email=maria%40ejemplo.com";

const FULL: MailContent = {
  subject: "Entra a Rentoru",
  blocks: [
    heading("Entra a Rentoru"),
    paragraph("Toca el botón para entrar.\nNo necesitas contraseña."),
    action("Entrar a Rentoru", URL),
    fallback("O copia este enlace en tu navegador:", URL),
    fact({ label: "Vale por", value: "15 minutos", note: "Se usa una sola vez." }),
    fact({ label: "Vence el", value: "22 de noviembre de 2026", tone: "warn" }),
    footer("Te escribimos porque pediste entrar.", "Rentoru · alquileres"),
  ],
};

const URL_HTML = URL.replace("&", "&amp;");
const factBox = (bg: string, inner: string) =>
  `<table ${TABLE} width="100%" style="margin:0 0 16px"><tr><td bgcolor="${bg}" ` +
  `style="padding:16px;border-radius:12px;background-color:${bg};font-family:${SANS}">${inner}</td></tr></table>`;
const factLabel = (color: string, text: string) =>
  `<p style="margin:0 0 4px;font-family:${MONO};font-size:12px;font-weight:600;color:${color}">${text}</p>`;
const factValue = (color: string, text: string) =>
  `<p style="margin:0;font-size:17px;font-weight:600;color:${color}">${text}</p>`;

describe("renderMailHtml", () => {
  it("compone la lámina v1 con cada clase de bloque, en estilos en línea", () => {
    expect(renderMailHtml(FULL)).toBe(
      expectedMailHtml(
        "Entra a Rentoru",
        '<h1 style="margin:0 0 16px;font-size:20px;font-weight:700;line-height:1.25;color:#1e2022">' +
          "Entra a Rentoru</h1>" +
          `${P}Toca el botón para entrar.<br />No necesitas contraseña.</p>` +
          `<table ${TABLE} width="100%" style="margin:0 0 16px"><tr>` +
          '<td align="center" bgcolor="#272343" style="border-radius:12px;background-color:#272343">' +
          `<a href="${URL_HTML}" style="display:block;padding:0 24px;line-height:46px;font-family:${SANS};` +
          'font-size:15px;font-weight:600;color:#ffffff;text-decoration:none">Entrar a Rentoru</a>' +
          "</td></tr></table>" +
          '<p style="margin:0 0 16px;font-size:12px;line-height:1.6;color:#52616b">' +
          `O copia este enlace en tu navegador:<br /><a href="${URL_HTML}" ` +
          `style="font-family:${MONO};color:#272343;word-break:break-all">${URL_HTML}</a></p>` +
          factBox(
            "#f0f5f9",
            factLabel("#52616b", "Vale por") +
              factValue("#1e2022", "15 minutos") +
              '<p style="margin:4px 0 0;color:#52616b">Se usa una sola vez.</p>',
          ) +
          factBox(
            "#faf2e1",
            factLabel("#8a5a00", "Vence el") + factValue("#8a5a00", "22 de noviembre de 2026"),
          ),
        '<tr><td style="padding:16px 16px 12px;border-top:1px solid #e1e4e6;' +
          `font-family:${SANS};font-size:12px;line-height:1.6;color:#52616b">` +
          '<p style="margin:0 0 4px">Te escribimos porque pediste entrar.</p>' +
          '<p style="margin:0 0 4px">Rentoru · alquileres</p></td></tr>',
      ),
    );
  });

  it("no depende de var() ni de una hoja <style>", () => {
    const html = renderMailHtml(FULL);

    expect(html).not.toContain("var(");
    expect(html).not.toContain("<style");
  });

  it("escribe el enlace de respaldo entero, por largo que sea (S2)", () => {
    const long = `https://rentoru.test/renovar/${"a".repeat(400)}`;
    const html = renderMailHtml({ subject: "s", blocks: [fallback("Copia:", long)] });

    expect(html).toContain(`>${long}</a>`);
  });

  it("escapa cada texto y cada enlace que viaja en el correo", () => {
    const x = '<b>"A&B"</b>';
    const html = renderMailHtml({
      subject: x,
      blocks: [
        heading(x),
        paragraph(x),
        action(x, x),
        fallback(x, x),
        fact({ label: x, value: x, note: x }),
        footer(x),
      ],
    });

    // Asunto 1, título 1, párrafo 1, botón 2, respaldo 3, dato 3, pie 1.
    expect(html).not.toContain("<b>");
    expect(html.split("&lt;b&gt;&quot;A&amp;B&quot;&lt;/b&gt;")).toHaveLength(13);
  });
});

describe("renderMailText", () => {
  it("dice lo mismo que el HTML, sin marcas, con el pie al final", () => {
    expect(renderMailText(FULL)).toBe(
      "Entra a Rentoru\n\n" +
        "Toca el botón para entrar.\nNo necesitas contraseña.\n\n" +
        `Entrar a Rentoru:\n${URL}\n\n` +
        "Vale por: 15 minutos\nSe usa una sola vez.\n\n" +
        "Vence el: 22 de noviembre de 2026\n\n" +
        "Te escribimos porque pediste entrar.\nRentoru · alquileres",
    );
  });
});
