import type { MailBlock, MailContent } from "./mail-content";
import { MAIL_STYLE as S } from "./mail-style";

/**
 * La única presentación de los correos (38.2): la lámina v1 hecha HTML de
 * correo —estilos en línea, maquetado con tablas para Outlook, sin `var()` ni
 * `<style>`— y el texto plano, los dos desde los mismos bloques. No decide ni
 * una palabra: lo que dice el correo llega en `MailContent`.
 */

/** Todo texto y todo enlace pasa por acá: muchos los escribió una persona. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Las comillas de la pila de fuentes chocarían con las de `style="…"`. */
const font = (stack: string) => stack.replace(/"/g, "'");
const SANS = font(S.sans);
const MONO = font(S.mono);
const TABLE = 'role="presentation" cellpadding="0" cellspacing="0" border="0"';
const GAP = "margin:0 0 16px";

function box(cell: string, inner: string): string {
  return `<table ${TABLE} width="100%" style="${GAP}"><tr><td ${cell}>${inner}</td></tr></table>`;
}

function blockHtml(block: MailBlock): string {
  switch (block.kind) {
    case "heading":
      return (
        `<h1 style="${GAP};font-size:${S.titleFs};font-weight:${S.titleFw};` +
        `line-height:${S.titleLh};color:${S.ink}">${escapeHtml(block.text)}</h1>`
      );
    case "paragraph":
      return `<p style="${GAP}">${escapeHtml(block.text).replace(/\n/g, "<br />")}</p>`;
    case "action":
      return box(
        `align="center" bgcolor="${S.accent}" style="border-radius:${S.radius};background-color:${S.accent}"`,
        `<a href="${escapeHtml(block.href)}" style="display:block;padding:0 24px;line-height:${S.actionH};` +
          `font-family:${SANS};font-size:${S.bodyFs};font-weight:${S.metaFw};color:${S.accentInk};` +
          `text-decoration:none">${escapeHtml(block.label)}</a>`,
      );
    case "fallback": {
      const url = escapeHtml(block.url);
      return (
        `<p style="${GAP};font-size:${S.metaFs};line-height:${S.secondaryLh};color:${S.soft}">` +
        `${escapeHtml(block.label)}<br /><a href="${url}" ` +
        `style="font-family:${MONO};color:${S.accent};word-break:break-all">${url}</a></p>`
      );
    }
    case "fact": {
      const warn = block.tone === "warn";
      const bg = warn ? S.warnBg : S.bg;
      const note = block.note
        ? `<p style="margin:4px 0 0;color:${S.soft}">${escapeHtml(block.note)}</p>`
        : "";
      return box(
        `bgcolor="${bg}" style="padding:16px;border-radius:${S.radius};background-color:${bg};font-family:${SANS}"`,
        `<p style="margin:0 0 4px;font-family:${MONO};font-size:${S.metaFs};font-weight:${S.metaFw};` +
          `color:${warn ? S.warn : S.soft}">${escapeHtml(block.label)}</p>` +
          `<p style="margin:0;font-size:${S.factFs};font-weight:${S.factFw};color:${warn ? S.warn : S.ink}">` +
          `${escapeHtml(block.value)}</p>${note}`,
      );
    }
    case "footer":
      return block.lines
        .map((line) => `<p style="margin:0 0 4px">${escapeHtml(line)}</p>`)
        .join("");
  }
}

/** El pie va en su propia fila, bajo la línea, aunque llegue en medio. */
function split(blocks: readonly MailBlock[]): [MailBlock[], MailBlock[]] {
  return [
    blocks.filter((block) => block.kind !== "footer"),
    blocks.filter((block) => block.kind === "footer"),
  ];
}

export function renderMailHtml(content: MailContent): string {
  const [body, foot] = split(content.blocks);
  const footRow = foot.length
    ? `<tr><td style="padding:16px 16px 12px;border-top:1px solid ${S.line};font-family:${SANS};` +
      `font-size:${S.metaFs};line-height:${S.secondaryLh};color:${S.soft}">` +
      `${foot.map(blockHtml).join("")}</td></tr>`
    : "";

  return (
    '<!DOCTYPE html><html lang="es"><head><meta charset="utf-8" />' +
    '<meta name="viewport" content="width=device-width, initial-scale=1" />' +
    `<title>${escapeHtml(content.subject)}</title></head>` +
    `<body style="margin:0;padding:0;background-color:${S.page}">` +
    `<table ${TABLE} width="100%" style="background-color:${S.page}">` +
    '<tr><td align="center" style="padding:16px">' +
    `<table ${TABLE} width="600" style="width:100%;max-width:600px;border:1px solid ${S.line};` +
    `border-radius:${S.radius};border-collapse:separate;background-color:${S.surface}">` +
    `<tr><td style="height:${S.brandbarH};padding:0 16px;border-bottom:1px solid ${S.line};` +
    `font-family:${MONO};font-size:${S.brandFs};font-weight:${S.titleFw};letter-spacing:${S.brandLs};` +
    `color:${S.ink}">Rentoru</td></tr>` +
    `<tr><td style="padding:24px 16px 8px;font-family:${SANS};font-size:${S.bodyFs};` +
    `line-height:${S.bodyLh};color:${S.ink}">${body.map(blockHtml).join("")}</td></tr>` +
    `${footRow}</table></td></tr></table></body></html>`
  );
}

function blockText(block: MailBlock): string {
  switch (block.kind) {
    case "heading":
    case "paragraph":
      return block.text;
    case "action":
      return `${block.label}:\n${block.href}`;
    // En texto plano la acción ya escribe el enlace entero: repetirlo sobra.
    case "fallback":
      return "";
    case "fact":
      return `${block.label}: ${block.value}${block.note ? `\n${block.note}` : ""}`;
    case "footer":
      return block.lines.join("\n");
  }
}

export function renderMailText(content: MailContent): string {
  const [body, foot] = split(content.blocks);
  return [...body, ...foot]
    .map(blockText)
    .filter((text) => text !== "")
    .join("\n\n");
}
