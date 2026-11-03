/**
 * El HTML que el correo tiene que tener, escrito a mano y no derivado del
 * renderizador (38.2): si lo calculara `render-mail.ts`, las pruebas de los
 * cuatro adaptadores pasarían con cualquier cambio. Valores de la lámina v1
 * (`design/pantallas/correo-v1.css`) ya resueltos; sólo lo usan las pruebas.
 */
const SANS = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
const MONO = "ui-monospace, SFMono-Regular, Menlo, monospace";
const TABLE = 'role="presentation" cellpadding="0" cellspacing="0" border="0"';

export const P = '<p style="margin:0 0 16px">';

/** El documento entero: `subject` y `body` llegan ya escapados. */
export function expectedMailHtml(subject: string, body: string, footer = ""): string {
  return (
    '<!DOCTYPE html><html lang="es"><head><meta charset="utf-8" />' +
    '<meta name="viewport" content="width=device-width, initial-scale=1" />' +
    `<title>${subject}</title></head>` +
    '<body style="margin:0;padding:0;background-color:#ffffff">' +
    `<table ${TABLE} width="100%" style="background-color:#ffffff">` +
    '<tr><td align="center" style="padding:16px">' +
    `<table ${TABLE} width="600" style="width:100%;max-width:600px;border:1px solid #e1e4e6;` +
    'border-radius:12px;border-collapse:separate;background-color:#ffffff">' +
    '<tr><td style="height:48px;padding:0 16px;border-bottom:1px solid #e1e4e6;' +
    `font-family:${MONO};font-size:16px;font-weight:700;letter-spacing:-0.02em;color:#1e2022">Rentoru</td></tr>` +
    `<tr><td style="padding:24px 16px 8px;font-family:${SANS};font-size:15px;line-height:1.6;color:#1e2022">` +
    `${body}</td></tr>${footer}</table></td></tr></table></body></html>`
  );
}

export const FIXTURE_FONTS = { SANS, MONO, TABLE };
