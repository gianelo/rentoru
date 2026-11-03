/**
 * Qué dice un correo, como bloques (38.2, patrón elegido por el fundador en
 * L9). Cada dominio decide los bloques; `render-mail.ts` sólo los dibuja, en
 * HTML y en texto plano. Agregar un correo es armar otra lista de bloques.
 */
export type MailBlock =
  | { readonly kind: "heading"; readonly text: string }
  | { readonly kind: "paragraph"; readonly text: string }
  /** La única primaria del correo (nivel Acción de SISTEMA.md). */
  | { readonly kind: "action"; readonly label: string; readonly href: string }
  /** El enlace escrito entero, nunca recortado: «la gente solo selecciona y copia» (S2). */
  | { readonly kind: "fallback"; readonly label: string; readonly url: string }
  | {
      readonly kind: "fact";
      readonly label: string;
      readonly value: string;
      readonly note?: string;
      /** `warn` cuando el dato es una fecha límite. */
      readonly tone: "normal" | "warn";
    }
  | { readonly kind: "footer"; readonly lines: readonly string[] };

export interface MailContent {
  readonly subject: string;
  readonly blocks: readonly MailBlock[];
}

/** La línea de marca con que cierra el pie de cada correo (lámina v1). */
export const MAIL_BRAND_LINE = "Rentoru · alquileres en Distrito Capital y Maracaibo";

export const heading = (text: string): MailBlock => ({ kind: "heading", text });
export const paragraph = (text: string): MailBlock => ({ kind: "paragraph", text });
export const action = (label: string, href: string): MailBlock => ({ kind: "action", label, href });
export const fallback = (label: string, url: string): MailBlock => ({
  kind: "fallback",
  label,
  url,
});
export const fact = (input: {
  label: string;
  value: string;
  note?: string;
  tone?: "normal" | "warn";
}): MailBlock => ({ kind: "fact", ...input, tone: input.tone ?? "normal" });
export const footer = (...lines: string[]): MailBlock => ({ kind: "footer", lines });

/**
 * El cuerpo de texto que hoy redactan los dominios, en párrafos: separados por
 * líneas en blanco; un salto simple queda dentro del párrafo. Es la forma que
 * tenían las cuatro copias que esto reemplaza.
 */
export function paragraphsFromBody(body: string): MailBlock[] {
  return body
    .split(/\n{2,}/)
    .map((text) => text.trim())
    .filter((text) => text !== "")
    .map(paragraph);
}
